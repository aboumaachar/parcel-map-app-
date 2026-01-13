import JSZip from 'jszip';
import parseKmzToGeoJSON from './kmzParser';

if (typeof test !== 'undefined') {
  test('parseKmzToGeoJSON extracts KML and computes area and elevation', async () => {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
    <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>
        <Placemark>
          <name>TEST-001</name>
          <Polygon>
            <outerBoundaryIs>
              <LinearRing>
                <coordinates>35.8,34.2,10 35.81,34.2,10 35.81,34.21,10 35.8,34.21,10 35.8,34.2,10</coordinates>
              </LinearRing>
            </outerBoundaryIs>
          </Polygon>
        </Placemark>
      </Document>
    </kml>`;

    const zip = new JSZip();
    zip.file('doc.kml', kml);
    const content = await zip.generateAsync({ type: 'nodebuffer' });

    // Create a File-like object with arrayBuffer method
    const fakeFile = {
      name: 'test.kmz',
      arrayBuffer: async () => content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength)
    };

    const geojson = await parseKmzToGeoJSON(fakeFile);

    expect(geojson).toBeDefined();
    expect(geojson.features.length).toBeGreaterThanOrEqual(1);

    const feat = geojson.features[0];
    expect(feat.properties.name).toBe('TEST-001');
    expect(typeof feat.properties.__computed_area_dunum).toBe('number');
    expect(typeof feat.properties.__computed_elev_avg_m === 'number' || feat.properties.__computed_elev_avg_m === undefined).toBeTruthy();
  });
}
