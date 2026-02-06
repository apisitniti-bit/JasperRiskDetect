"use client";

import { useState } from "react";
import { BarChart3, ChevronRight, Database, FileText, Variable } from "lucide-react";
import type { RiskLevel, JrxmlParamInfo, JrxmlVarInfo } from "../lib/types";
import RiskGauge from "./RiskGauge";

interface RiskScorePanelProps {
  layoutScore: number;
  compileScore: number;
  riskLevel: RiskLevel;
  parameters: JrxmlParamInfo[];
  fields: JrxmlParamInfo[];
  variables: JrxmlVarInfo[];
}

export default function RiskScorePanel({
  layoutScore,
  compileScore,
  riskLevel,
  parameters,
  fields,
  variables,
}: RiskScorePanelProps) {
  // Per SKILL.md: rerender-derived-state-no-effect — derive during render
  const finalScore = Math.max(layoutScore, compileScore);

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>คะแนนความเสี่ยง</span>
      </div>

      <div className="panel-body flex flex-col gap-4 p-4">
        <div className="flex flex-col items-center gap-4">
          <RiskGauge score={finalScore} level={riskLevel} />

          <div className="w-full space-y-2">
            <ScoreBar label="Layout" score={layoutScore} />
            <ScoreBar label="Compile" score={compileScore} />
          </div>

          {finalScore >= 80 && (
            <div className="mt-2 w-full rounded bg-ide-error/10 px-3 py-2 text-center text-sm text-ide-error">
              ⚠ CI จะล้มเหลว — คะแนน ≥ 80
            </div>
          )}
        </div>

        {/* Parameters / Fields / Variables */}
        {(parameters.length > 0 || fields.length > 0 || variables.length > 0) && (
          <div className="space-y-1 border-t border-ide-border pt-3">
            <DataSection
              icon={<Database className="h-3 w-3" />}
              label="Parameters"
              prefix="$P"
              items={parameters.map((p) => ({ name: p.name, type: p.className }))}
            />
            <DataSection
              icon={<FileText className="h-3 w-3" />}
              label="Fields"
              prefix="$F"
              items={fields.map((f) => ({ name: f.name, type: f.className }))}
            />
            <DataSection
              icon={<Variable className="h-3 w-3" />}
              label="Variables"
              prefix="$V"
              items={variables.map((v) => ({ name: v.name, type: v.className, extra: v.expression }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const width = Math.min(100, Math.max(0, score));
  let barColor = "bg-ide-success";
  if (score >= 80) barColor = "bg-ide-error";
  else if (score >= 60) barColor = "bg-orange-500";
  else if (score >= 40) barColor = "bg-ide-warning";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ide-text-muted">{label}</span>
        <span className="font-mono text-ide-text">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-ide-border">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function DataSection({
  icon,
  label,
  prefix,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  prefix: string;
  items: { name: string; type: string; extra?: string }[];
}) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-xs font-semibold text-ide-text-muted hover:bg-ide-active/20"
      >
        <ChevronRight className={`h-2.5 w-2.5 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
        {icon}
        <span>{label} ({items.length})</span>
      </button>
      {open && (
        <ul className="ml-4 space-y-0.5 pb-1">
          {items.map((item) => (
            <li key={item.name} className="flex items-baseline gap-1 text-xs" title={item.type}>
              <code className="font-mono text-sky-300">{prefix}&#123;{item.name}&#125;</code>
              <span className="truncate text-ide-text-muted">{shortClass(item.type)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function shortClass(cls: string): string {
  const idx = cls.lastIndexOf(".");
  return idx >= 0 ? cls.substring(idx + 1) : cls;
}
