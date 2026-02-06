"use client";

import { BarChart3 } from "lucide-react";
import type { RiskLevel } from "../lib/types";
import RiskGauge from "./RiskGauge";

interface RiskScorePanelProps {
  layoutScore: number;
  compileScore: number;
  riskLevel: RiskLevel;
}

export default function RiskScorePanel({
  layoutScore,
  compileScore,
  riskLevel,
}: RiskScorePanelProps) {
  // Per SKILL.md: rerender-derived-state-no-effect — derive during render
  const finalScore = Math.max(layoutScore, compileScore);

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>คะแนนความเสี่ยง</span>
      </div>

      <div className="panel-body flex flex-col items-center gap-4 p-4">
        <RiskGauge score={finalScore} level={riskLevel} />

        <div className="w-full space-y-2">
          <ScoreBar label="Layout" score={layoutScore} />
          <ScoreBar label="Compile" score={compileScore} />
        </div>

        {finalScore >= 80 && (
          <div className="mt-2 w-full rounded bg-ide-error/10 px-3 py-2 text-center text-xs text-ide-error">
            ⚠ CI จะล้มเหลว — คะแนน ≥ 80
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
      <div className="mb-1 flex items-center justify-between text-xs">
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
