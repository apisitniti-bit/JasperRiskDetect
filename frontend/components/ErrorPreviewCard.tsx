"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, XCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { Finding, Severity } from "../lib/types";

interface ErrorPreviewCardProps {
  finding: Finding;
  jrxmlContent: string;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#f44747",
  high: "#ff8c00",
  medium: "#cca700",
  low: "#3794ff",
  info: "#858585",
};

const SEVERITY_BG: Record<Severity, string> = {
  critical: "rgba(244, 71, 71, 0.15)",
  high: "rgba(255, 140, 0, 0.12)",
  medium: "rgba(204, 167, 0, 0.10)",
  low: "rgba(55, 148, 255, 0.08)",
  info: "transparent",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
  info: "ข้อมูล",
};

const SEVERITY_ICON: Record<Severity, typeof XCircle> = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  info: Info,
};

const CONTEXT_LINES = 5;

export default function ErrorPreviewCard({ finding, jrxmlContent }: ErrorPreviewCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);

  const errorLine = finding.line || 0;
  const lines = jrxmlContent.split("\n");
  const startLine = Math.max(1, errorLine - CONTEXT_LINES);
  const endLine = Math.min(lines.length, errorLine + CONTEXT_LINES);
  const visibleLines = lines.slice(startLine - 1, endLine);

  const color = SEVERITY_COLOR[finding.severity];
  const Icon = SEVERITY_ICON[finding.severity];

  const handleCapture = useCallback(async () => {
    if (!cardRef.current) return;
    setCapturing(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#1e1e1e",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `error-${finding.rule_id}${errorLine ? `-line-${errorLine}` : ""}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Screenshot failed:", err);
    } finally {
      setCapturing(false);
    }
  }, [finding.rule_id, errorLine]);

  if (!errorLine) return null;

  return (
    <div className="space-y-2">
      {/* Capturable card */}
      <div
        ref={cardRef}
        className="overflow-hidden rounded-lg border border-ide-border"
        style={{ backgroundColor: "#1e1e1e" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ borderBottom: `2px solid ${color}` }}
        >
          <Icon className="h-4 w-4 shrink-0" style={{ color }} />
          <span className="font-mono text-sm font-bold" style={{ color }}>
            {finding.rule_id}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: SEVERITY_BG[finding.severity], color }}
          >
            {SEVERITY_LABEL[finding.severity]}
          </span>
        </div>

        {/* Thai title + location */}
        <div className="border-b border-ide-border px-4 py-2">
          <p className="text-sm text-[#d4d4d4]">{finding.thai.title}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-[#858585]">
            {finding.element && (
              <span>
                Band: <code className="text-[#4ec9b0]">{finding.element}</code>
              </span>
            )}
            {finding.element_name && (
              <span>
                Element: <code className="text-[#9cdcfe]">{finding.element_name}</code>
              </span>
            )}
            {errorLine > 0 && <span>บรรทัด: {errorLine}</span>}
          </div>
        </div>

        {/* Code lines */}
        <div className="font-mono text-xs leading-5">
          {visibleLines.map((line, idx) => {
            const lineNum = startLine + idx;
            const isError = lineNum === errorLine;
            return (
              <div
                key={lineNum}
                className="flex"
                style={{
                  backgroundColor: isError ? SEVERITY_BG[finding.severity] : "transparent",
                  borderLeft: isError ? `3px solid ${color}` : "3px solid transparent",
                }}
              >
                <span
                  className="inline-block w-10 shrink-0 select-none pr-2 text-right"
                  style={{ color: isError ? color : "#6e7681" }}
                >
                  {lineNum}
                </span>
                <span
                  className="whitespace-pre"
                  style={{ color: isError ? "#d4d4d4" : "#8b949e" }}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>

        {/* Thai explanation footer */}
        <div className="border-t border-ide-border px-4 py-2.5 text-xs">
          <div className="text-[#d4d4d4]">
            <span className="font-semibold" style={{ color }}>
              ปัญหา:{" "}
            </span>
            {finding.thai.title}
          </div>
          <div className="mt-1 text-[#d4d4d4]">
            <span className="font-semibold text-[#89d185]">วิธีแก้: </span>
            {finding.thai.fix.split("\n")[0]}
          </div>
        </div>
      </div>

      {/* Capture button (outside the card so it's not in the screenshot) */}
      <button
        onClick={handleCapture}
        disabled={capturing}
        className="flex items-center gap-2 rounded bg-ide-accent/20 px-3 py-1.5 text-sm text-ide-accent hover:bg-ide-accent/30 disabled:opacity-50"
      >
        {capturing ? (
          <>
            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-ide-accent border-t-transparent" />
            กำลังจับภาพ...
          </>
        ) : (
          <>
            <Camera className="h-3.5 w-3.5" />
            บันทึกภาพ
          </>
        )}
      </button>
    </div>
  );
}
