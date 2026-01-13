const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// This test assumes the full stack is running on localhost (3000 frontend, 3001 backend)
// It will upload a sample KMZ via the frontend file input and then check the UI for loaded parcels.

test('uploads KMZ via UI and shows parcel', async ({ page }) => {
  await page.goto('/');

  // create sample KMZ in tmp
  const tmp = path.join(process.cwd(), 'tmp_playwright');
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n    <Placemark><name>PLAY-001</name><Polygon><outerBoundaryIs><LinearRing><coordinates>35.8,34.2 35.81,34.2 35.81,34.21 35.8,34.21 35.8,34.2</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>\n  </Document>\n</kml>`;
  // Create KMZ using JSZip for cross-platform compatibility
  const JSZip = require('jszip');
  const maker = new JSZip();
  maker.file('doc.kml', kml);
  const content = await maker.generateAsync({ type: 'nodebuffer' });
  fs.writeFileSync(path.join(tmp, 'sample.kmz'), content);

  const kmzPath = path.join(tmp, 'sample.kmz');

  // set file input
  const fileInput = await page.$('input[type=file]');
  await fileInput.setInputFiles(kmzPath);

  // wait for status to appear
  await page.waitForSelector('text=Loaded', { timeout: 15000 });

  // check that GeoJSON polygon was rendered (leaflet uses .leaflet-interactive)
  const interactiveCount = await page.evaluate(() => document.querySelectorAll('.leaflet-interactive').length);
  console.log('leaflet-interactive-count', interactiveCount);
  expect(interactiveCount).toBeGreaterThan(0);

  // click the rendered polygon directly then check aside for cadaster
  const poly = await page.locator('.leaflet-interactive').first();
  await poly.click();

  await page.waitForSelector('text=Cadaster #', { timeout: 15000 });
  const cad = await page.locator('text=Cadaster #').first();
  expect(cad).toBeDefined();
});
