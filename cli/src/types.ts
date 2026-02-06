export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Finding {
  rule_id: string;
  severity: Severity;
  category: "layout" | "compile";
  line?: number;
  column?: number;
  element?: string;
  message: string;
  thai: {
    title: string;
    cause: string;
    impact: string;
    fix: string;
  };
  risk_weight: number;
}

export interface FileResult {
  path: string;
  version_compatible: boolean;
  version_rejection?: string;
  layout_score: number;
  compile_score: number;
  final_score: number;
  risk_level: RiskLevel;
  findings: Finding[];
  error?: string;
}

export interface BatchSummary {
  total_files: number;
  passed: number;
  failed: number;
  max_score: number;
  threshold: number;
}

export interface CliOptions {
  format: "json" | "table" | "thai";
  threshold: number;
  output: string | null;
  failOnWarning: boolean;
}

export const EXIT_OK = 0;
export const EXIT_RISK_EXCEEDED = 1;
export const EXIT_ERROR = 2;
export const EXIT_VERSION_REJECTED = 3;
