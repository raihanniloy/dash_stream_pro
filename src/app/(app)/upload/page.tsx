"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDropzone } from "@/components/file-dropzone";
import { apiFetch } from "@/lib/api";

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleFileSelect(file: File) {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Create a dashboard from this data source
      const dashboard = await apiFetch("/api/dashboards", {
        method: "POST",
        body: JSON.stringify({ data_source_id: data.id }),
      });

      router.push(`/dashboards/${dashboard.id}/preview`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Upload Data</h1>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 p-3 rounded mb-4">
          {error}
        </p>
      )}

      <FileDropzone
        onFileSelect={handleFileSelect}
        accept=".csv,.xlsx,.txt"
        disabled={uploading}
      />

      {uploading && (
        <p className="text-center text-muted-foreground mt-4">
          Uploading and processing your file...
        </p>
      )}
    </div>
  );
}
