const { Worker } = require('bullmq');
const { connection } = require('./queue');
const path = require('path');
const fs = require('fs');
const { processKmzFile } = require('./kmzProcessor');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'parcel_db',
  user: process.env.DB_USER || 'parcel_user',
  password: process.env.DB_PASSWORD || ''
});

const worker = new Worker('kmz-processing', async (job) => {
  const { kmzId, filename, storedPath } = job.data;
  const client = await pool.connect();
  try {
    await client.query(`UPDATE kmz_files SET status = $1 WHERE id = $2`, ['processing', kmzId]);
    const filePath = storedPath || path.join(__dirname, 'uploads', 'kmz', filename);
    if (!fs.existsSync(filePath)) {
      await client.query(`UPDATE kmz_files SET status = $1, metadata = $2 WHERE id = $3`, ['failed', { error: 'file_missing' }, kmzId]);
      return;
    }

    await processKmzFile({ kmzId, filename, filePath, dbClient: client, geoserverUrl: process.env.GEOSERVER_URL, baseDir: __dirname });
  } catch (e) {
    console.error('Job failed for kmzId', job.data.kmzId, e);
    // set file status to failed and store error
    try {
      await client.query(`UPDATE kmz_files SET status = $1, metadata = $2 WHERE id = $3`, ['failed', { error: e.message }, job.data.kmzId]);
    } catch (u) { console.error('Failed to mark kmz as failed', u); }
    throw e; // rethrow so Bull's retry/backoff/attempts take effect
  } finally {
    client.release();
  }
}, { connection, concurrency: 2 });

worker.on('failed', async (job, err) => {
  console.error(`Job ${job.id} failed: ${err.message}`);

  // if job exhausted attempts, send alert
  try {
    const attempts = job.opts?.attempts || 0;
    const attemptsMade = job.attemptsMade || 0;
    if (attempts && attemptsMade >= attempts) {
      const { sendJobFailureNotification } = require('./notify');
      await sendJobFailureNotification({ kmzId: job.data.kmzId, filename: job.data.filename, error: err });
    }
  } catch (e) {
    console.warn('Failed to notify on job failure', e.message || e);
  }
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed for kmzId ${job.data.kmzId}`);
});

// small HTTP health endpoint to allow Docker healthchecks
const express = require('express');
const app = express();
const { queue } = require('./queue');

// cached counts to avoid latency/blocking when Redis/DNS is slow
let countsCache = null;
let countsLastUpdated = null;
async function refreshCounts() {
  try {
    const counts = await queue.getJobCounts();
    countsCache = counts;
    countsLastUpdated = Date.now();
  } catch (e) {
    // keep previous cache if available, otherwise leave as null
    // silently ignore transient errors
  }
}
// refresh immediately and then periodically
refreshCounts();
const COUNTS_REFRESH_MS = Number(process.env.COUNTS_REFRESH_MS || 5000);
setInterval(refreshCounts, COUNTS_REFRESH_MS);

app.get('/health', async (req, res) => {
  // fast response using cached counts; include info whether counts are fresh
  const now = Date.now();
  const isFresh = countsLastUpdated && (now - countsLastUpdated) < COUNTS_REFRESH_MS * 2;
  res.json({ status: 'OK', counts: countsCache, counts_last_updated: countsLastUpdated ? new Date(countsLastUpdated).toISOString() : null, counts_fresh: Boolean(isFresh), info: countsCache ? 'counts available' : 'queue unavailable' });
});

const PORT = process.env.WORKER_PORT || 3002;
app.listen(PORT, () => console.log(`Worker health endpoint listening on ${PORT}`));
