import { useState } from "react";
import { parseKmzToGeoJSON } from "../utils/kmzParser";

export default function KMZUpload({ onGeoJSONReady }) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    setError("");
    setStatus("");

    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith(".kmz")) {
      setError("Please upload a .kmz file.");
      return;
    }

    try {
      setStatus("Parsing KMZ...");
      const geojson = await parseKmzToGeoJSON(file);

      if (!geojson?.features?.length) {
        setError("No features found in this KMZ.");
        setStatus("");
        return;
      }

      onGeoJSONReady?.(geojson);
      setStatus(`Loaded ${geojson.features.length} parcel(s).`);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to parse KMZ.");
      setStatus("");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontWeight: 600 }}>Upload KMZ (Cadaster Parcels)</label>

      <input
        type="file"
        accept=".kmz"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {status ? <div style={{ opacity: 0.85 }}>{status}</div> : null}
      {error ? <div style={{ color: "tomato" }}>{error}</div> : null}
    </div>
  );
}
