-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create parcels table
CREATE TABLE IF NOT EXISTS parcels (
    id SERIAL PRIMARY KEY,
    parcel_number VARCHAR(50) UNIQUE NOT NULL,
    owner_name VARCHAR(255),
    address VARCHAR(500),
    area_sq_m NUMERIC(12, 2),
    zoning_type VARCHAR(50),
    land_use VARCHAR(100),
    purchase_date DATE,
    assessed_value NUMERIC(15, 2),
    geometry GEOMETRY(POLYGON, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create kmz_files table
CREATE TABLE IF NOT EXISTS kmz_files (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    description TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    layer_name VARCHAR(255),
    feature_count INTEGER DEFAULT 0,
    metadata JSONB,
    bounding_box GEOMETRY(POLYGON, 4326),
    thumbnail_path VARCHAR(500)
);

-- Create kmz_features table
CREATE TABLE IF NOT EXISTS kmz_features (
    id SERIAL PRIMARY KEY,
    kmz_id INTEGER REFERENCES kmz_files(id) ON DELETE CASCADE,
    feature_id VARCHAR(100),
    name VARCHAR(255),
    description TEXT,
    placemark_type VARCHAR(50),
    geometry GEOMETRY(GEOMETRY, 4326),
    style JSONB,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial indices
CREATE INDEX idx_parcels_geometry ON parcels USING GIST(geometry);
CREATE INDEX idx_parcels_parcel_number ON parcels(parcel_number);
CREATE INDEX idx_kmz_features_geometry ON kmz_features USING GIST(geometry);
CREATE INDEX idx_kmz_features_kmz_id ON kmz_features(kmz_id);

-- Insert sample parcel data
INSERT INTO parcels (parcel_number, owner_name, address, area_sq_m, zoning_type, land_use, assessed_value, geometry) VALUES
('PARCEL-001', 'John Smith', '123 Main St', 1200.50, 'Residential', 'Single Family', 250000.00, 
    ST_GeomFromText('POLYGON((-98.4933 29.4241, -98.4925 29.4241, -98.4925 29.4235, -98.4933 29.4235, -98.4933 29.4241))', 4326)),
('PARCEL-002', 'ABC Corporation', '456 Business Ave', 5000.75, 'Commercial', 'Retail', 750000.00, 
    ST_GeomFromText('POLYGON((-98.4950 29.4250, -98.4940 29.4250, -98.4940 29.4240, -98.4950 29.4240, -98.4950 29.4250))', 4326));

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for parcels table
CREATE TRIGGER update_parcels_updated_at 
    BEFORE UPDATE ON parcels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();