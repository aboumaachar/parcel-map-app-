import { useEffect, useMemo, useRef, useState } from "react";
import KMZUpload from "./components/KMZViewer";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function escapeHtml(str) {
  return (str ?? "")
    .toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Try many common field names used for cadaster/parcel numbers.
 * Adjust/add keys here once you see your actual KMZ property names.
 */
function getCadasterNumber(props) {
  const candidates = [
    "cadaster_number",
    "cadaster_no",
    "cadaster",
    "parcel_number",
    "parcel_no",
    "parcel",
    "cadastral_number",
    "cadastral_no",
    "CAD_NO",
    "PARCEL_NO",
    "PARCELNUM",
    "Parcel No",
    "Cadaster No",
    "Cadastral No",
    "رقم_العقار",
    "رقم العقار",
    "رقم_المساحة",
    "رقم المساحة"
  ];

  for (const key of candidates) {
    if (props?.[key] !== undefined && props?.[key] !== null && `${props[key]}`.trim() !== "") {
      return props[key];
    }
  }

  // Fallback: sometimes the parcel number is the name
  if (props?.name) return props.name;

  return null;
}

function FitBounds({ geojson, searchFeature }) {
  const map = useMap();

  useEffect(() => {
    if (searchFeature) {
      // Zoom to search result
      try {
        const layer = new window.L.GeoJSON(searchFeature);
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
      } catch {
        // ignore
      }
      return;
    }

    if (!geojson?.features?.length) return;
    try {
      const layer = new window.L.GeoJSON(geojson);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
    } catch {
      // ignore
    }
  }, [geojson, searchFeature, map]);

  return null;
}

export default function App() {
  const [geojson, setGeojson] = useState(null);
  const [selected, setSelected] = useState(null);
  const [kmzFiles, setKmzFiles] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [searchFeature, setSearchFeature] = useState(null);
  const lastLayerRef = useRef(null);

  // Fetch list of uploaded KMZ files on mount
  useEffect(() => {
    const fetchKmzFiles = async () => {
      try {
        const response = await fetch("/api/kmz");
        if (response.ok) {
          const data = await response.json();
          setKmzFiles(data.files || []);
        }
      } catch (error) {
        console.error("Error fetching KMZ files:", error);
      }
    };

    fetchKmzFiles();
  }, []);

  // Fetch list of uploaded KMZ files on mount
  useEffect(() => {
    const fetchKmzFiles = async () => {
      try {
        const response = await fetch("/api/kmz");
        if (response.ok) {
          const data = await response.json();
          setKmzFiles(data.files || []);
        }
      } catch (error) {
        console.error("Error fetching KMZ files:", error);
      }
    };

    fetchKmzFiles();
  }, []);

  const handleSearch = () => {
    if (!searchText.trim()) {
      setSearchMessage("Please enter a parcel/cadaster number");
      return;
    }

    if (!geojson?.features?.length) {
      setSearchMessage("No parcels loaded. Upload a KMZ file first.");
      return;
    }

    // Search for parcel matching the cadaster number
    const found = geojson.features.find((feature) => {
      const cad = getCadasterNumber(feature.properties);
      return cad && cad.toString().toLowerCase().includes(searchText.toLowerCase());
    });

    if (found) {
      setSearchMessage("✓ Found and zoomed to parcel!");
      setSearchFeature(found);
      setSelected(found);
    } else {
      setSearchMessage("❌ No parcel found matching that number");
      setSearchFeature(null);
    }
  };

  const handleClearSearch = () => {
    setSearchText("");
    setSearchMessage("");
    setSearchFeature(null);
  };

  const onEachFeature = useMemo(() => {
    return (feature, layer) => {
      layer.on("click", (e) => {
        // un-highlight previous
        if (lastLayerRef.current?.setStyle) {
          lastLayerRef.current.setStyle({ weight: 1 });
        }

        // highlight current
        if (layer.setStyle) layer.setStyle({ weight: 3 });
        lastLayerRef.current = layer;

        setSelected(feature);

        const props = feature.properties || {};
        const cadNo = getCadasterNumber(props);

        const areaDunum =
          typeof props.__computed_area_dunum === "number"
            ? props.__computed_area_dunum.toFixed(2)
            : null;

        const elevAvg =
          typeof props.__computed_elev_avg_m === "number"
            ? props.__computed_elev_avg_m.toFixed(1)
            : null;

        const popupHtml = `
          <div style="min-width:240px">
            <div><b>Cadaster #:</b> ${escapeHtml(cadNo ?? "N/A")}</div>
            ${areaDunum ? `<div><b>Computed Area:</b> ${escapeHtml(areaDunum)} dunum</div>` : ""}
            ${elevAvg ? `<div><b>Computed Avg Elev:</b> ${escapeHtml(elevAvg)} m</div>` : ""}
          </div>
        `;

        layer.bindPopup(popupHtml).openPopup(e.latlng);
      });
    };
  }, []);

  const defaultStyle = () => ({
    weight: 1
  });

  return (
    <div style={{ padding: 12 }}>
      <h2>Parcel Map Viewer</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12 }}>
        <div style={{ height: "70vh", borderRadius: 10, overflow: "hidden", border: "1px solid #333" }}>
          <MapContainer center={[34.2, 35.8]} zoom={9} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {geojson ? <FitBounds geojson={geojson} searchFeature={searchFeature} /> : null}

            {geojson ? (
              <GeoJSON
                data={geojson}
                style={defaultStyle}
                onEachFeature={onEachFeature}
              />
            ) : null}
          </MapContainer>
        </div>

        <aside style={{ padding: 12, border: "1px solid #333", borderRadius: 10, display: "flex", flexDirection: "column" }}>
          <KMZUpload onGeoJSONReady={setGeojson} />

          <h3 style={{ marginTop: 12, marginBottom: 6 }}>Search & Filter</h3>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
              <strong>Uploaded KMZ Files:</strong>
            </label>
            <select
              disabled
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
                fontSize: 12,
                opacity: 0.7
              }}
            >
              <option>{kmzFiles.length ? `${kmzFiles.length} files uploaded` : "No files uploaded"}</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13 }}>
              <strong>Search by Cadaster #:</strong>
            </label>
            <input
              type="text"
              placeholder="Enter parcel/cadaster number..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              style={{
                width: "100%",
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
                fontSize: 12,
                boxSizing: "border-box",
                marginBottom: 8
              }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <button
                onClick={handleSearch}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #333",
                  backgroundColor: "#007bff",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Search
              </button>
              <button
                onClick={handleClearSearch}
                style={{
                  padding: "6px 10px",
                  borderRadius: 4,
                  border: "1px solid #999",
                  backgroundColor: "#f0f0f0",
                  color: "#333",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600
                }}
              >
                Clear
              </button>
            </div>
            {searchMessage && (
              <div
                style={{
                  marginTop: 8,
                  padding: 6,
                  borderRadius: 4,
                  backgroundColor: searchMessage.includes("✓") ? "#d4edda" : "#f8d7da",
                  color: searchMessage.includes("✓") ? "#155724" : "#721c24",
                  fontSize: 12
                }}
              >
                {searchMessage}
              </div>
            )}
          </div>

          <h3 style={{ marginTop: 12, marginBottom: 6 }}>Selected Parcel</h3>

          {!selected ? (
            <div style={{ opacity: 0.85 }}>
              Click any parcel area on the map to view its <b>cadaster number</b> and <b>all metadata</b>.
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 10 }}>
                <b>Cadaster #:</b> {getCadasterNumber(selected.properties) ?? "N/A"}
              </div>

              <div style={{ marginBottom: 10, opacity: 0.9 }}>
                <b>Computed area:</b>{" "}
                {typeof selected.properties?.__computed_area_dunum === "number"
                  ? `${selected.properties.__computed_area_dunum.toFixed(2)} dunum`
                  : "N/A"}
                <br />
                <b>Computed elevation:</b>{" "}
                {typeof selected.properties?.__computed_elev_avg_m === "number"
                  ? `${selected.properties.__computed_elev_avg_m.toFixed(1)} m avg`
                  : "N/A"}
              </div>

              <div style={{ fontWeight: 600, marginBottom: 6 }}>All metadata (from KMZ + computed):</div>

              <div style={{ maxHeight: "52vh", overflow: "auto", fontSize: 13 }}>
                {Object.entries(selected.properties || {})
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 10, marginBottom: 8 }}>
                      <div style={{ opacity: 0.8, wordBreak: "break-word" }}>{k}</div>
                      <div style={{ wordBreak: "break-word" }}>
                        {typeof v === "number" ? v : (v ?? "").toString()}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
