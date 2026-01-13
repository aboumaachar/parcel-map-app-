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
      // Step 1: Upload to backend first
      setStatus("Uploading to server...");
      const formData = new FormData();
      formData.append("file", file);

      const uploadResponse = await fetch("/api/kmz/upload", {
        method: "POST",
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();
      console.log("Upload result:", uploadResult);

      // Step 2: Parse client-side for immediate display
      setStatus("Parsing KMZ...");
      const geojson = await parseKmzToGeoJSON(file);

      if (!geojson?.features?.length) {
        setError("No features found in this KMZ.");
        setStatus("");
        return;
      }

      onGeoJSONReady?.(geojson);
      setStatus(`Uploaded and loaded ${geojson.features.length} parcel(s).`);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Failed to upload/parse KMZ.");
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
