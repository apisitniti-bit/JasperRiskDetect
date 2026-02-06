"use client";

import { useState, useCallback } from "react";
import type { UploadResponse } from "../lib/types";

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(body.error || `Upload failed: ${res.status}`);
      }

      const data: UploadResponse = await res.json();
      setUploadResult(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setUploadError(null);
    setUploadResult(null);
  }, []);

  return { upload, uploading, uploadError, uploadResult, reset };
}
