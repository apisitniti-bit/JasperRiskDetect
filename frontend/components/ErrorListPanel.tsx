"use client";

import { AlertTriangle, AlertCircle, Info, XCircle, ChevronRight } from "lucide-react";
import type { Finding, Severity } from "../lib/types";

interface ErrorListPanelProps {
  findings: Finding[];
  selectedFinding: Finding | null;
  onSelectFinding: (finding: Finding) => void;
}

const SEVERITY_ICON: Record<Severity, typeof AlertCircle> = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
  info: Info,
};

const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "text-ide-error",
  high: "text-orange-400",
  medium: "text-ide-warning",
  low: "text-ide-info",
  info: "text-ide-text-muted",
};

export default function ErrorListPanel({
  findings,
  selectedFinding,
  onSelectFinding,
}: ErrorListPanelProps) {
  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const mediumCount = findings.filter((f) => f.severity === "medium" || f.severity === "low").length;

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>ปัญหาที่พบ</span>
        <div className="ml-auto flex items-center gap-2 text-[10px]">
          {criticalCount > 0 && (
            <span className="rounded bg-ide-error/20 px-1.5 py-0.5 text-ide-error">
              {criticalCount} วิกฤต
            </span>
          )}
          {highCount > 0 && (
            <span className="rounded bg-orange-500/20 px-1.5 py-0.5 text-orange-400">
              {highCount} สูง
            </span>
          )}
          {mediumCount > 0 && (
            <span className="rounded bg-ide-warning/20 px-1.5 py-0.5 text-ide-warning">
              {mediumCount} อื่นๆ
            </span>
          )}
        </div>
      </div>

      <div className="panel-body">
        {findings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ide-text-muted">
            <Info className="h-8 w-8 opacity-30" />
            <span className="text-xs">ยังไม่มีผลการวิเคราะห์</span>
          </div>
        ) : (
          <ul className="divide-y divide-ide-border">
            {findings.map((finding, idx) => {
              const Icon = SEVERITY_ICON[finding.severity];
              const colorClass = SEVERITY_COLOR[finding.severity];
              const isSelected = selectedFinding === finding;

              return (
                <li
                  key={`${finding.rule_id}-${idx}`}
                  className={`error-item flex cursor-pointer items-start gap-2 px-3 py-2 transition-colors hover:bg-ide-active/30 ${
                    isSelected ? "bg-ide-active/50" : ""
                  }`}
                  onClick={() => onSelectFinding(finding)}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorClass}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-semibold ${colorClass}`}>
                        {finding.rule_id}
                      </span>
                      {finding.line && (
                        <span className="text-[10px] text-ide-text-muted">
                          บรรทัด {finding.line}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-ide-text line-clamp-2">
                      {finding.thai.title}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-ide-text-muted" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
