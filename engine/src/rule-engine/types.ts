export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RuleCategory = "layout" | "compile";

export type DetectionType =
  | "xpath"
  | "element_count"
  | "attribute_check"
  | "expression_pattern"
  | "structural";

export interface ThaiMessages {
  title: string;
  cause: string;
  impact: string;
  fix: string;
}

export interface RuleDetection {
  type: DetectionType;
  config: Record<string, unknown>;
}

export interface RuleAutoFix {
  available: boolean;
  strategy: string;
  safe: boolean;
}

export interface Rule {
  rule_id: string;
  severity: Severity;
  category: RuleCategory;
  detection: RuleDetection;
  risk_weight: number;
  thai: ThaiMessages;
  autofix?: RuleAutoFix;
}

export interface Finding {
  rule_id: string;
  severity: Severity;
  category: RuleCategory;
  line?: number;
  column?: number;
  element?: string;
  message: string;
  thai: ThaiMessages;
  risk_weight: number;
}

export interface AnalysisResult {
  file_path: string;
  version_check: VersionGuardResult;
  layout_score: number;
  compile_score: number;
  final_score: number;
  risk_level: RiskLevel;
  findings: Finding[];
}

// --- Version Guard types ---

export type VersionSignalAction = "reject" | "warn" | "pass";

export interface VersionSignal {
  signal_id: string;
  detected: boolean;
  action: VersionSignalAction;
  min_version: string;
  detail: string;
  thai_message: string;
}

export interface VersionGuardResult {
  compatible: boolean;
  signals: VersionSignal[];
  rejection_reasons: string[];
  warnings: string[];
}
