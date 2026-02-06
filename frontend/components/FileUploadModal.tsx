"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";

interface FileUploadModalProps {
  open: boolean;
  onClose: () => void;
  onFileSelected: (file: File) => void;
  uploading: boolean;
  error: string | null;
}

export default function FileUploadModal({
  open,
  onClose,
  onFileSelected,
  uploading,
  error,
}: FileUploadModalProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-lg border border-ide-border bg-ide-sidebar p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-ide-text-muted hover:text-ide-text"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="mb-4 text-lg font-semibold text-ide-text">
          อัปโหลดไฟล์ JRXML
        </h2>
        <p className="mb-4 text-sm text-ide-text-muted">
          รองรับเฉพาะ .jrxml สำหรับ iReport 3.7.1 เท่านั้น (ขนาดไม่เกิน 5MB)
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-ide-accent bg-ide-accent/10"
              : "border-ide-border hover:border-ide-accent/50"
          }`}
        >
          {uploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-ide-accent border-t-transparent" />
              <span className="text-sm text-ide-text-muted">กำลังอัปโหลด...</span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-ide-text-muted" />
              <span className="text-sm text-ide-text-muted">
                ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์
              </span>
              <span className="text-sm text-ide-text-muted">.jrxml</span>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".jrxml"
          onChange={handleFileChange}
          className="hidden"
        />

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded bg-ide-error/10 px-3 py-2 text-sm text-ide-error">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
