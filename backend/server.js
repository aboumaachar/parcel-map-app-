const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const multer = require('multer');
const AdmZip = require('adm-zip');
const { DOMParser } = require('xmldom');
const togeojson = require('@mapbox/togeojson');
const { Pool } = require('pg');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Postgres pool (uses env vars from .env)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'parcel_db',
    user: process.env.DB_USER || 'parcel_user',
    password: process.env.DB_PASSWORD || ''
});

// Configure multer for KMZ uploads to `uploads/kmz`
const uploadDir = process.env.KMZ_UPLOAD_DIR || path.join(__dirname, 'uploads', 'kmz');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const unique = `${Date.now()}-${Math.random().toString(36).substring(2,8)}-${file.originalname}`;
        cb(null, unique);
    }
});
const maxSize = (() => {
    const m = process.env.UPLOAD_MAX_SIZE || '100MB';
    // very small parser: accept only MB values like 100MB
    if (m.toUpperCase().endsWith('MB')) return parseInt(m.slice(0, -2), 10) * 1024 * 1024;
    return 100 * 1024 * 1024;
})();

const upload = multer({ 
    storage,
    limits: { fileSize: maxSize },
    fileFilter: function (req, file, cb) {
        const name = file.originalname.toLowerCase();
        if (!name.endsWith('.kmz')) return cb(new Error('Only .kmz files are accepted'));
        cb(null, true);
    }
});

// Create necessary directories
const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/kmz'),
    path.join(__dirname, 'uploads/shapefiles'),
    path.join(__dirname, 'uploads/thumbnails'),
    path.join(__dirname, 'temp')
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/thumbnails', express.static(path.join(__dirname, 'uploads/thumbnails')));

// Routes
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        services: {
            database: 'PostgreSQL with PostGIS',
            geoserver: 'GeoServer 2.23',
            file_processing: 'KMZ & Shapefile support'
        }
    });
});

// Parcel routes (simplified for demo)
app.get('/api/parcels', (req, res) => {
    res.json({
        parcels: [
            {
                id: 1,
                parcel_number: 'PARCEL-001',
                owner_name: 'John Smith',
                address: '123 Main St',
                area_sq_m: 1200.50,
                zoning_type: 'Residential',
                land_use: 'Single Family',
                assessed_value: 250000
            },
            {
                id: 2,
                parcel_number: 'PARCEL-002',
                owner_name: 'ABC Corporation',
                address: '456 Business Ave',
                area_sq_m: 5000.75,
                zoning_type: 'Commercial',
                land_use: 'Retail',
                assessed_value: 750000
            }
        ],
        pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
        }
    });
});

// KMZ upload endpoint (accepts multipart/form-data `file` field)
app.post('/api/kmz/upload', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { filename, originalname, size, path: storedPath } = req.file;

        // Save metadata in kmz_files
        const client = await pool.connect();
        try {
            // Extract KML content from KMZ
            const zip = new AdmZip(storedPath);
            const entries = zip.getEntries();
            const kmlEntry = entries.find(e => e.entryName.toLowerCase().endsWith('.kml'));
            if (!kmlEntry) {
                // mark as failed
                const insertRes = await client.query(
                    `INSERT INTO kmz_files (filename, original_name, file_size, status, feature_count, metadata)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [filename, originalname, size, 'failed', 0, { error: 'no_kml_found' }]
                );

                return res.status(400).json({ error: 'No KML found inside KMZ' });
            }

            const kmlText = kmlEntry.getData().toString('utf8');
            // parse KML
            const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
            const gj = togeojson.kml(dom);

            // Insert file record
            const meta = { layerName: kmlEntry.entryName };
            // insert a queued file record (will be processed by worker)
            const insertFile = await client.query(
                `INSERT INTO kmz_files (filename, original_name, file_size, status, feature_count, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                [filename, originalname, size, 'queued', 0, meta]
            );
            const kmzId = insertFile.rows[0].id;

            // enqueue a job to process this KMZ
            const { queue } = require('./queue');
            await queue.add('process', { kmzId, filename, storedPath }, { attempts: 5, backoff: { type: 'exponential', delay: 2000 } });

            res.json({ message: 'KMZ uploaded and queued', kmz_id: kmzId });
        } finally {
            client.release();
        }
    } catch (err) {
        next(err);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: err.message
    });
});

// Worker used to process queued KMZ files is implemented in a separate script (backend/worker.js)
// We removed the in-process interval and refactored processing into `kmzProcessor.js` for testability and re-use.

// Status endpoint for a KMZ
app.get('/api/kmz/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const r = await pool.query('SELECT * FROM kmz_files WHERE id = $1', [id]);
        if (!r.rows.length) return res.status(404).json({ error: 'not_found' });
        res.json(r.rows[0]);
    } catch (e) { next(e); }
});

// Get all KMZ files (for dropdown)
app.get('/api/kmz', async (req, res, next) => {
    try {
        const r = await pool.query(
            'SELECT id, original_name, status, feature_count, upload_date FROM kmz_files ORDER BY upload_date DESC LIMIT 100',
            []
        );
        res.json({ files: r.rows });
    } catch (e) { next(e); }
});

// Start server only when run directly (prevents tests from auto-starting a listener)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Backend server running on port ${PORT}`);
        console.log(`API URL: http://localhost:${PORT}/api`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
}

// Export app for tests
module.exports = app;