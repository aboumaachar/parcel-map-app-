const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { DOMParser } = require('xmldom');
const togeojson = require('@mapbox/togeojson');
// Use modular turf packages to avoid ESM-only transitive deps (e.g., concaveman)
const turfAreaPkg = require('@turf/area');
const turfBboxPkg = require('@turf/bbox');
const turfArea = turfAreaPkg && turfAreaPkg.default ? turfAreaPkg.default : turfAreaPkg;
const turfBbox = turfBboxPkg && turfBboxPkg.default ? turfBboxPkg.default : turfBboxPkg;
const sharp = require('sharp');
const axios = require('axios');

async function processKmzFile({ kmzId, filename, filePath, dbClient, geoserverUrl, baseDir }) {
  // kmzId: database id
  // filename: stored filename
  // filePath: absolute path to file
  // dbClient: pg client with query method
  // geoserverUrl: optional base url for WMS
  // baseDir: project base dir for thumbnail path resolution

  const entries = new AdmZip(filePath).getEntries();
  const kmlEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.kml'));
  if (!kmlEntry) {
    await dbClient.query(`UPDATE kmz_files SET status = $1, metadata = $2 WHERE id = $3`, ['failed', { error: 'no_kml_found' }, kmzId]);
    return { success: false, reason: 'no_kml' };
  }

  const kmlText = kmlEntry.getData().toString('utf8');
  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  const gj = togeojson.kml(dom);

  // remove previous features if exist
  await dbClient.query(`DELETE FROM kmz_features WHERE kmz_id = $1`, [kmzId]);

  const features = gj.features || [];
  for (const feat of features) {
    const props = feat.properties || {};
    try {
      if (feat.geometry && (feat.geometry.type === 'Polygon' || feat.geometry.type === 'MultiPolygon')) {
        const area = turfArea(feat);
        props.__computed_area_dunum = Number((area / 1000).toFixed(2));
      }
      // compute avg elevation
      const elevations = [];
      if (feat.geometry && feat.geometry.coordinates) {
        function collect(coords) {
          if (typeof coords[0] === 'number') {
            if (coords.length >= 3 && typeof coords[2] === 'number') elevations.push(coords[2]);
          } else coords.forEach(collect);
        }
        collect(feat.geometry.coordinates);
      }
      if (elevations.length) {
        const avg = elevations.reduce((s, v) => s + v, 0) / elevations.length;
        props.__computed_elev_avg_m = Number(avg.toFixed(1));
      }
    } catch (e) {
      // ignore
    }

    const geom = JSON.stringify(feat.geometry || null);

    await dbClient.query(
      `INSERT INTO kmz_features (kmz_id, feature_id, name, description, placemark_type, geometry, style, properties)
       VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326), $7, $8)`,
      [kmzId, props?.id || null, props?.name || null, props?.description || null, props?.type || null, geom, null, props]
    );
  }

  // try generate thumbnail: prefer GeoServer WMS if available and layerName present
  let thumbnailPath = null;
  try {
    if (geoserverUrl && gj?.features?.length && gj.features[0].bbox) {
      // if the KML provides bbox (rare), try WMS with that bbox
      const bbox = gj.features[0].bbox.join(',');
      const wmsUrl = `${geoserverUrl.replace(/\/$/, '')}/wms?service=WMS&version=1.1.1&request=GetMap&format=image/png&transparent=true&width=400&height=200&srs=EPSG:4326&bbox=${bbox}`;
      const resp = await axios.get(wmsUrl, { responseType: 'arraybuffer', timeout: 5000 });
      const thumbnailDir = path.join(baseDir, 'uploads', 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });
      thumbnailPath = path.join(thumbnailDir, `${kmzId}.png`);
      fs.writeFileSync(thumbnailPath, Buffer.from(resp.data));
    } else if (features.length) {
      const bbox = turfBbox({ type: 'FeatureCollection', features });
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'>
        <rect x='4' y='4' width='392' height='192' fill='#f7f7f7' stroke='#333' stroke-width='2'/>
        <text x='12' y='28' font-size='12' fill='#333'>KMZ ${kmzId} - bbox: ${bbox.map(b=>b.toFixed(3)).join(', ')}</text>
      </svg>`;
      const thumbnailDir = path.join(baseDir, 'uploads', 'thumbnails');
      if (!fs.existsSync(thumbnailDir)) fs.mkdirSync(thumbnailDir, { recursive: true });
      thumbnailPath = path.join(thumbnailDir, `${kmzId}.png`);
      await sharp(Buffer.from(svg)).png().toFile(thumbnailPath);
    }
  } catch (e) {
    console.warn('thumbnail generation failed', e.message || e);
  }

  if (thumbnailPath) {
    await dbClient.query(`UPDATE kmz_files SET thumbnail_path = $1 WHERE id = $2`, [thumbnailPath, kmzId]);
  }

  await dbClient.query(`UPDATE kmz_files SET status = $1, processed_date = NOW(), feature_count = $2 WHERE id = $3`, ['processed', features.length, kmzId]);

  return { success: true, features: features.length };
}

module.exports = { processKmzFile };
