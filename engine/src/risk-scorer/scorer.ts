import type { Finding, RiskLevel } from "../rule-engine/types";

export interface ScoreBreakdown {
  layout_score: number;
  compile_score: number;
  final_score: number;
  risk_level: RiskLevel;
  layout_findings_count: number;
  compile_findings_count: number;
  ci_should_fail: boolean;
}

const CI_FAIL_THRESHOLD = 80;

export function calculateRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

export function calculateCategoryScore(findings: Finding[]): number {
  let total = 0;
  for (const f of findings) {
    total += f.risk_weight;
  }
  return Math.min(100, total);
}

export function scoreFindings(findings: Finding[]): ScoreBreakdown {
  const layoutFindings: Finding[] = [];
  const compileFindings: Finding[] = [];

  for (const f of findings) {
    if (f.category === "layout") {
      layoutFindings.push(f);
    } else if (f.category === "compile") {
      compileFindings.push(f);
    }
  }

  const layoutScore = calculateCategoryScore(layoutFindings);
  const compileScore = calculateCategoryScore(compileFindings);
  const finalScore = Math.max(layoutScore, compileScore);

  return {
    layout_score: layoutScore,
    compile_score: compileScore,
    final_score: finalScore,
    risk_level: calculateRiskLevel(finalScore),
    layout_findings_count: layoutFindings.length,
    compile_findings_count: compileFindings.length,
    ci_should_fail: finalScore >= CI_FAIL_THRESHOLD,
  };
}
