"use client";

import { useState, useMemo, useCallback } from "react";
import { AlertTriangle, AlertCircle, Info, XCircle, ChevronRight, ChevronDown } from "lucide-react";
import type { Finding, Severity } from "../lib/types";

interface ErrorListPanelProps {
  findings: Finding[];
  selectedFinding: Finding | null;
  onSelectFinding: (finding: Finding) => void;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

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

const SEVERITY_LABEL_TH: Record<Severity, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
  info: "ข้อมูล",
};

const SEVERITY_GROUP_BG: Record<Severity, string> = {
  critical: "bg-ide-error/10 text-ide-error",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-ide-warning/10 text-ide-warning",
  low: "bg-ide-info/10 text-ide-info",
  info: "bg-ide-sidebar text-ide-text-muted",
};

export default function ErrorListPanel({
  findings,
  selectedFinding,
  onSelectFinding,
}: ErrorListPanelProps) {
  // All groups collapsed by default
  const [expanded, setExpanded] = useState<Set<Severity>>(new Set());

  const toggleGroup = useCallback((severity: Severity) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(severity)) next.delete(severity);
      else next.add(severity);
      return next;
    });
  }, []);

  // Sort by severity (critical first) — derived state per SKILL.md
  const sorted = useMemo(() => {
    return [...findings].sort(
      (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
    );
  }, [findings]);

  // Group by severity for section headers
  const groups = useMemo(() => {
    const map = new Map<Severity, Finding[]>();
    for (const f of sorted) {
      const list = map.get(f.severity);
      if (list) list.push(f);
      else map.set(f.severity, [f]);
    }
    return map;
  }, [sorted]);

  const criticalCount = groups.get("critical")?.length ?? 0;
  const highCount = groups.get("high")?.length ?? 0;
  const otherCount = findings.length - criticalCount - highCount;

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>ปัญหาที่พบ ({findings.length})</span>
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
          {otherCount > 0 && (
            <span className="rounded bg-ide-warning/20 px-1.5 py-0.5 text-ide-warning">
              {otherCount} อื่นๆ
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
          <div>
            {Array.from(groups.entries()).map(([severity, items]) => {
              const isOpen = expanded.has(severity);
              const GroupIcon = SEVERITY_ICON[severity];

              return (
                <div key={severity}>
                  {/* Severity group header — clickable to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(severity)}
                    className={`sticky top-0 z-10 flex w-full items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider select-none ${SEVERITY_GROUP_BG[severity]}`}
                  >
                    <ChevronRight
                      className={`h-3 w-3 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                    />
                    <GroupIcon className="h-3 w-3 shrink-0" />
                    <span>{SEVERITY_LABEL_TH[severity]} ({items.length})</span>
                  </button>

                  {/* Collapsible findings list */}
                  {isOpen && (
                    <ul className="divide-y divide-ide-border">
                      {items.map((finding, idx) => {
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
