"use client";

import { Upload, Shield, RefreshCw } from "lucide-react";

interface TopBarProps {
  fileName: string | null;
  onUploadClick: () => void;
  onRefresh: () => void;
  isAnalyzing: boolean;
}

export default function TopBar({ fileName, onUploadClick, onRefresh, isAnalyzing }: TopBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-ide-border bg-ide-sidebar px-4 select-none">
      <div className="flex items-center gap-3">
        <Shield className="h-4 w-4 text-ide-accent" />
        <span className="text-base font-semibold tracking-tight text-ide-text">
          JasperRiskDetect
        </span>
        <span className="text-sm text-ide-text-muted">iReport 3.7.1</span>
      </div>

      <div className="flex items-center gap-3">
        {fileName && (
          <div className="flex items-center gap-1.5 rounded bg-ide-bg px-2 py-0.5">
            <span className="text-sm text-ide-text-muted">{fileName}</span>
            {isAnalyzing && (
              <div className="h-3 w-3 animate-spin rounded-full border border-ide-accent border-t-transparent" />
            )}
          </div>
        )}
        {fileName && (
          <button
            onClick={onRefresh}
            disabled={isAnalyzing}
            title="เคลียร์ไฟล์และเริ่มใหม่"
            className="flex items-center gap-1.5 rounded border border-ide-border px-3 py-1.5 text-sm text-ide-text-muted transition-colors hover:bg-ide-active/30 hover:text-ide-text disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            เริ่มใหม่
          </button>
        )}
        <button
          onClick={onUploadClick}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 rounded bg-ide-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ide-accent/80 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          อัปโหลด .jrxml
        </button>
      </div>
    </header>
  );
}
