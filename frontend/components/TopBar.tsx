"use client";

import { Upload, RefreshCw } from "lucide-react";

interface TopBarProps {
  fileName: string | null;
  onUploadClick: () => void;
  onRefresh: () => void;
  isAnalyzing: boolean;
}

function Logo() {
  return (
    <svg
      width="28"
      height="32"
      viewBox="0 0 20 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10 1L2 4.5V10C2 15.5 10 21 10 21S18 15.5 18 10V4.5L10 1Z" fill="url(#shieldGradTB)" stroke="#5A8BBF" strokeWidth="1"/>
      <path d="M10 2.8L4 5.5V10C4 14.5 10 19 10 19S16 14.5 16 10V5.5L10 2.8Z" fill="none" stroke="#3D5A80" strokeWidth="0.4" opacity="0.6"/>
      <text x="10" y="10" fontFamily="system-ui,sans-serif" fontSize="5.5" fontWeight="700" fill="#FFFFFF" textAnchor="middle" dominantBaseline="central" letterSpacing="-0.3">JRD</text>
      <rect x="5" y="13" width="10" height="4" rx="0.6" fill="none" stroke="#E0B830" strokeWidth="0.5"/>
      <text x="10" y="15.3" fontFamily="monospace" fontSize="3" fontWeight="500" fill="#C0B090" textAnchor="middle" dominantBaseline="central">iR 3.7.1</text>
      <defs>
        <linearGradient id="shieldGradTB" x1="10" y1="1" x2="10" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2B3A4E"/>
          <stop offset="1" stopColor="#1A2636"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TopBar({ fileName, onUploadClick, onRefresh, isAnalyzing }: TopBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-ide-border bg-ide-sidebar px-4 select-none">
      <div className="flex items-center gap-3">
        <Logo />
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
