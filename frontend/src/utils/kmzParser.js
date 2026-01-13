import JSZip from 'jszip';
import * as turf from '@turf/turf';

// Real KMZ -> GeoJSON parser for browser usage.
// - Extracts first KML file from the KMZ (zip)
// - Converts KML to GeoJSON using basic KML parsing
// - Computes simple derived properties expected by KMZViewer
//   (area in dunum and avg elevation if elevation present)

// Simple KML to GeoJSON converter (handles basic Polygon and Point geometry)
function kmlToGeoJSON(kmlDom) {
  const features = [];
  
  // Helper to get text content from element
  const getText = (elem, tagName) => {
    const els = elem.getElementsByTagName(tagName);
    return els.length > 0 ? els[0].textContent : '';
  };

  // Helper to parse coordinates string (lon,lat,alt format in KML -> [lon,lat] in GeoJSON)
  const parseCoords = (coordStr) => {
    return coordStr
      .trim()
      .split(/\s+/)
      .map(coord => coord.split(',').slice(0, 2).map(Number));
  };

  // Get all Placemarks
  const placemarks = kmlDom.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    const name = getText(placemark, 'name');
    const description = getText(placemark, 'description');
    
    const properties = {
      name,
      description,
    };

    // Handle Polygon geometry
    const polygons = placemark.getElementsByTagName('Polygon');
    if (polygons.length > 0) {
      const polygon = polygons[0];
      const linearRings = polygon.getElementsByTagName('LinearRing');
      
      if (linearRings.length > 0) {
        const coordElem = linearRings[0].getElementsByTagName('coordinates')[0];
        if (coordElem) {
          const coords = parseCoords(coordElem.textContent);
          if (coords.length >= 3) {
            features.push({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coords]
              },
              properties
            });
          }
        }
      }
    }

    // Handle Point geometry
    const points = placemark.getElementsByTagName('Point');
    if (points.length > 0) {
      const point = points[0];
      const coordElem = point.getElementsByTagName('coordinates')[0];
      if (coordElem) {
        const coords = parseCoords(coordElem.textContent);
        if (coords.length > 0) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: coords[0]
            },
            properties
          });
        }
      }
    }

    // Handle LineString geometry
    const lineStrings = placemark.getElementsByTagName('LineString');
    if (lineStrings.length > 0) {
      const lineString = lineStrings[0];
      const coordElem = lineString.getElementsByTagName('coordinates')[0];
      if (coordElem) {
        const coords = parseCoords(coordElem.textContent);
        if (coords.length >= 2) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords
            },
            properties
          });
        }
      }
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

export async function parseKmzToGeoJSON(file) {
  if (!file) throw new Error('No file provided');

  try {
    const ab = await file.arrayBuffer();
    const zipInput = (typeof Buffer !== 'undefined' && Buffer.from) ? Buffer.from(ab) : ab;
    const zip = await JSZip.loadAsync(zipInput);

    // Find first .kml entry
    const kmlEntryName = Object.keys(zip.files).find((n) => n.toLowerCase().endsWith('.kml'));
    if (!kmlEntryName) throw new Error('No KML found inside KMZ');

    const kmlText = await zip.files[kmlEntryName].async('string');

    // Parse KML using browser's native DOMParser
    const parser = new window.DOMParser();
    const kmlDom = parser.parseFromString(kmlText, 'application/xml');

    // Check for parsing errors
    if (kmlDom.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Failed to parse KML: invalid XML');
    }

    // Convert KML to GeoJSON
    const geojson = kmlToGeoJSON(kmlDom);

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      throw new Error('No features extracted from KML');
    }

    // Compute derived properties for each feature
    const features = geojson.features.map((feat) => {
      const f = JSON.parse(JSON.stringify(feat)); // shallow clone

      try {
        // area in square meters (approx), then convert to dunum (1 dunum = 1000 m2)
        if (f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
          const polyArea = turf.area(f);
          f.properties = f.properties || {};
          f.properties.__computed_area_dunum = Number((polyArea / 1000).toFixed(2));
        }

        // try computing avg elevation from coordinates or properties if available
        const elevations = [];
        if (f.geometry && f.geometry.coordinates) {
          // traverse coordinates to collect z values
          function collect(coords) {
            if (typeof coords[0] === 'number') {
              if (coords.length >= 3 && typeof coords[2] === 'number') elevations.push(coords[2]);
            } else {
              coords.forEach(collect);
            }
          }
          collect(f.geometry.coordinates);
        }

        if (elevations.length) {
          const avg = elevations.reduce((s, v) => s + v, 0) / elevations.length;
          f.properties.__computed_elev_avg_m = Number(avg.toFixed(1));
        }
      } catch (e) {
        console.warn('Error computing derived properties:', e);
      }

      return f;
    });

    return {
      type: 'FeatureCollection',
      features
    };
  } catch (e) {
    console.error('KMZ parsing error:', e);
    throw e;
  }
}

export default parseKmzToGeoJSON;
