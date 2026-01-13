const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { processKmzFile } = require('../kmzProcessor');

const tmpDir = path.join(__dirname, '..', '..', 'tmp_test');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

function createTestKmz(kmlText, name = 'test.kmz') {
  const zip = new JSZip();
  zip.file('doc.kml', kmlText);
  const buf = zip.generateAsync({ type: 'nodebuffer' });
  return buf.then(b => {
    const filePath = path.join(tmpDir, `${Date.now()}-${name}`);
    fs.writeFileSync(filePath, b);
    return filePath;
  });
}

test('processKmzFile inserts features and updates kmz_files', async () => {
  // prepare a fake kmz with a simple polygon with z values
  const kml = `<?xml version="1.0" encoding="UTF-8"?>
  <kml xmlns="http://www.opengis.net/kml/2.2">
    <Document>
      <Placemark>
        <name>TST</name>
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

  const filePath = await createTestKmz(kml);

  // Mock db client
  const queries = [];
  const mockClient = {
    query: async (text, params) => {
      queries.push({ text: text.toString(), params });
      if (text.toString().startsWith('UPDATE kmz_files SET thumbnail_path')) return { rows: [] };
      return { rows: [] };
    }
  };

  const res = await processKmzFile({ kmzId: 9999, filename: 'fake.kmz', filePath, dbClient: mockClient, baseDir: path.join(__dirname, '..', '..') });

  expect(res.success).toBe(true);
  // expect insertion into kmz_features and update of kmz_files
  const texts = queries.map(q => q.text);
  const hasInsertFeature = texts.some(t => t.includes('INSERT INTO kmz_features'));
  const hasUpdateKmz = texts.some(t => t.includes('UPDATE kmz_files SET status'));
  expect(hasInsertFeature).toBe(true);
  expect(hasUpdateKmz).toBe(true);
});
