## Repo overview

This repo is a Docker-first parcel mapping app with two primary services:
- `backend/` — Node.js + Express API (file uploads, PostGIS/GeoServer integration). See `backend/server.js` and `backend/package.json`.
- `frontend/` — React UI (Leaflet/OpenLayers, KMZ upload + viewer). See `frontend/src/*` and `frontend/package.json`.

Key runtime pieces (from `README.md`): PostGIS, GeoServer, Backend, Frontend. Use `docker-compose.yml` or `docker-compose.dev.yml` for development.

## Immediate developer commands
- Start full stack (recommended):
  - Windows PowerShell: `.\docker-start.bat` or `.\docker-manage.ps1 start`
  - Docker Compose (prod): `docker-compose up -d`
  - Docker Compose (dev with hot reload): `docker-compose -f docker-compose.dev.yml up`
- Backend local dev (no Docker): `cd backend && npm run dev` (uses `nodemon`).
- Frontend local dev (no Docker): `cd frontend && npm start`.
- Inspect logs: `docker-compose logs -f backend` or `.\docker-manage.ps1 logs`.

## Architecture & important files
- `backend/server.js` — single Express entry; creates `uploads/` subfolders on startup; exposes `/api/*` routes and `/api/health`.
- `backend/package.json` — lists server dependencies (GDAL-related tooling, `multer`, `sharp`, `pg`). Use `npm run start` in production container and `npm run dev` for local iterative work.
- `frontend/src/App.js` and `frontend/src/components/KMZViewer.jsx` — UI: map viewer, parcel property extraction, and KMZ upload UI.
- Static uploads served from `backend/uploads` and thumbnails from `backend/uploads/thumbnails`.
- Proxy: frontend uses `proxy: "http://backend:3001"` in `frontend/package.json` — during dev the front-end will proxy API calls to the container host named `backend`.

## Patterns & conventions specific to this codebase
- Small monolithic backend — add new API routes by editing `backend/server.js` (or factor into `routes/` and `require()` them). Changes require container restart unless running with `nodemon`.
- File upload flow: UI sends KMZ -> backend stores under `uploads/kmz` -> backend processes (KMZ parsing code is partial in this repo). The frontend also attempts client-side parsing via `parseKmzToGeoJSON` (look for `frontend/src/utils/kmzParser`).
- Parcel ID detection: `frontend/src/App.js` contains a prioritized list of candidate property keys for cadaster/parcel numbers (see `getCadasterNumber`). Use that list when mapping parcel identifiers.
- Healthcheck: `GET /api/health` used across scripts and for service checks.

## Debugging and iterative development tips
- To quickly test backend changes: run `cd backend && npm run dev` locally, then point the frontend at `http://localhost:3001` (or run frontend locally with proxy).
- To inspect uploads and thumbnails: check `backend/uploads` inside the backend container: `docker-compose exec backend ls -la uploads`.
- If an endpoint is returning placeholder responses (e.g. `/api/kmz/upload`), search `backend/server.js` — some endpoints are intentionally stubbed and require full implementation.

## Integration points & external services
- Database: PostGIS (Postgres) — see `database/init.sql` and `.env.example` for DB credentials.
- GeoServer: used for WMS/WFS publishing; reachable at `http://geoserver:8080/geoserver` in Docker network.

## When you edit code — checklist for PRs
- Update `README.md` or relevant doc if you change service ports or env var names.
- If adding long-running native deps (GDAL, sharp) update Dockerfiles in `backend/Dockerfile` and `frontend/Dockerfile` as needed.
- Run the stack (`docker-compose -f docker-compose.dev.yml up`) to validate integration with PostGIS/GeoServer.

## Quick examples
- Add a route: edit `backend/server.js`, then `docker-compose restart backend` (or run backend locally with `npm run dev`).
- Test health locally: `curl http://localhost:3001/api/health`.

## CI & testing (current state)
- No GitHub Actions or CI workflows detected in `.github/workflows/` — there is currently no automated CI in the repo.
- Tests: frontend and backend have `test` scripts declared by common tooling (`react-scripts test` in `frontend`, none in `backend`), but there are no test files or `jest.config.js` present. The `.dockerignore` references `jest.config.js` but it is not included.
- Recommended quick checks for maintainers: add basic unit tests for parsing logic and an integration smoke test that verifies `/api/health` and the frontend build.

Minimal local sanity checks:
```bash
# Backend (dev)
cd backend && npm run dev
# Frontend (dev)
cd frontend && npm start
# Health check
curl http://localhost:3001/api/health
```

## Run integration smoke locally
You can exercise the full stack locally by starting the required services and running a sample KMZ upload:

```bash
# Start PostGIS, GeoServer and Backend
docker-compose -f docker-compose.yml up -d --build postgis geoserver backend
# Create sample KML and KMZ
cat > sample.kml <<'KML'
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>SAMPLE-001</name>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>35.8,34.2 35.81,34.2 35.81,34.21 35.8,34.21 35.8,34.2</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
  </Document>
</kml>
KML
zip -r sample.kmz sample.kml
# Upload to backend
curl -F "file=@sample.kmz" http://localhost:3001/api/kmz/upload
# Inspect DB
docker-compose exec -T postgis psql -U parcel_user -d parcel_db -c "SELECT * FROM kmz_files ORDER BY id DESC LIMIT 5;"
```

## KMZ parsing (what to look for)
- Database schema supporting KMZ: see `database/init.sql` (tables `kmz_files` and `kmz_features`) — these describe how uploaded KMZs and extracted features are stored (fields: `feature_id`, `properties` JSONB, `geometry`, `thumbnail_path`, `status`).
- Current gaps:
  - `POST /api/kmz/upload` in `backend/server.js` is a placeholder and returns a stub message.
  - The frontend component `frontend/src/components/KMZViewer.jsx` imports `parseKmzToGeoJSON` from `frontend/src/utils/kmzParser`. A minimal client-side parser has been implemented at `frontend/src/utils/kmzParser.js` using `jszip` + `xmldom` + `@mapbox/togeojson` + `@turf/turf` to extract KML from KMZ and compute basic derived properties (`__computed_area_dunum`, `__computed_elev_avg_m`) for UI testing.
- The backend `POST /api/kmz/upload` endpoint has been implemented to accept `multipart/form-data` (`file` field) using `multer`. Uploads are validated (only `.kmz` accepted, `UPLOAD_MAX_SIZE` is respected) and initially recorded in `kmz_files` with status `queued`. A Redis-backed BullMQ queue (`kmz-processing`) is used to process files asynchronously (see `backend/queue.js`). Uploads enqueue a `process` job (attempts: 5, exponential backoff).

- The worker implementation (`backend/worker.bull.js`) consumes jobs, runs `backend/kmzProcessor.js`, computes derived properties and thumbnails (prefers GeoServer WMS if configured), and updates `kmz_files` status to `processed` (or `failed` with metadata on error). The worker exposes a small `/health` endpoint (port 3002) which Docker healthchecks and CI use to verify worker readiness.

- Dev tools: a developer-only queue UI (Bull Board) is available at `http://localhost:3003/admin/queues` when running `docker-compose -f docker-compose.dev.yml up bull-board`; this is intentionally development-only and not exposed in production.

- Notifications: if a job permanently fails (exhausts configured attempts) the worker will POST a JSON payload to `JOB_ALERT_WEBHOOK` (if configured). This is useful to integrate with Slack incoming webhooks or custom incident endpoints.
- Where to implement parsing (recommended approach):
  - Server-side: extend `/api/kmz/upload` to accept `multer`-multipart, store KMZ to `uploads/kmz`, extract KML/KMZ entries (use `adm-zip`, `@mapbox/togeojson`, `xml2js`), compute geometry and derived properties, insert into `kmz_files` and `kmz_features`.
  - Client-side: replace the stub `frontend/src/utils/kmzParser.js` with a full implementation that reads the uploaded `.kmz` File object, extracts KML, converts to GeoJSON and computes derived fields expected by `KMZViewer` (e.g., `__computed_area_dunum`, `__computed_elev_avg_m`).
+  - Helpful libraries: `jszip` or `adm-zip` (zip extraction), `xmldom`/`jsdom` + `@mapbox/togeojson` (KML -> GeoJSON), and `@turf/turf` for geo computations.
+  - Quick local test: upload any file from the frontend to trigger the stub and verify the map loads a sample parcel.
+  
+## CI added
+- A minimal GitHub Actions workflow has been added at `.github/workflows/ci.yml`:
+  - `frontend-build` job: runs `npm ci` and `npm run build` in `frontend`.
+  - `backend-smoke` job: installs backend deps, starts `node server.js` in background and curls `/api/health` to verify the server responds (this works without PostGIS/GeoServer because `/api/health` returns static JSON).
+  - This is intentionally minimal; expand later to run containerized integration tests if you add DB/GeoServer-dependent tests.

## Docker & native dependency notes
- Backend Dockerfile installs GDAL and other native toolchain bits in the `base` stage. When you add or change native modules (GDAL-dependent npm packages), update `backend/Dockerfile` (or `dockerfile.dockerfile`) and test the image build locally.
- Development convenience: `docker-compose.dev.yml` builds `backend` with `target: base` and runs `npm run dev` so native deps are available for local dev.
- Important production choices: containers run as non-root users, use `dumb-init` for signal handling, and include healthchecks that hit `/api/health`.

## Troubleshooting tips
- Inspect uploads: `docker-compose exec backend ls -la /app/uploads` and check `uploads/kmz` for stored files.
- Database: `docker-compose exec postgis psql -U parcel_user -d parcel_db` to inspect tables and `SELECT * FROM kmz_files LIMIT 10;`.
- GeoServer: verify at `http://localhost:8080/geoserver` and ensure GeoServer has access to its data dir volume.
- Common Docker dev issue: if native builds fail, run `docker-compose down -v` then `docker-compose up --build` to rebuild images.

---

If you'd like, I can (a) add a minimal `frontend/src/utils/kmzParser.js` stub that returns parsed GeoJSON for tests, (b) add a minimal GitHub Actions workflow to run a build and simple checks, or (c) scaffold a suite of unit tests for the parsing logic — tell me which you'd like to prioritize.

---

**Queue & notifications**
- Dev queue admin UI: `http://localhost:3003/admin/queues` (run `docker-compose -f docker-compose.dev.yml up bull-board`).
- Configure `JOB_ALERT_WEBHOOK` in `.env` to receive POST notifications when a job permanently fails.
- See `docs/QUEUE_ADMIN.md` for quick admin commands, troubleshooting, and notes about security.

