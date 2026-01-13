const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const { processKmzFile } = require('./kmzProcessor');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'parcel_db',
  user: process.env.DB_USER || 'parcel_user',
  password: process.env.DB_PASSWORD || ''
});

const BASE_DIR = path.join(__dirname);
const GEOSERVER_URL = process.env.GEOSERVER_URL;

async function pickAndProcess() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT id, filename FROM kmz_files WHERE status = 'queued' ORDER BY id ASC LIMIT 1 FOR UPDATE SKIP LOCKED");
    if (!res.rows.length) return;
    const row = res.rows[0];

    await client.query(`UPDATE kmz_files SET status = $1 WHERE id = $2`, ['processing', row.id]);

    const filePath = path.join(BASE_DIR, 'uploads', 'kmz', row.filename);
    if (!fs.existsSync(filePath)) {
      await client.query(`UPDATE kmz_files SET status = $1, metadata = $2 WHERE id = $3`, ['failed', { error: 'file_missing' }, row.id]);
      return;
    }

    const result = await processKmzFile({ kmzId: row.id, filename: row.filename, filePath, dbClient: client, geoserverUrl: GEOSERVER_URL, baseDir: BASE_DIR });
    if (!result.success) {
      console.warn('Processing failed', result);
    }
  } catch (e) {
    console.error('Worker error', e);
  } finally {
    client.release();
  }
}

// Looping worker
setInterval(async () => {
  try { await pickAndProcess(); } catch (e) { console.error(e); }
}, 3000);

console.log('Worker started, polling for queued KMZ files...');