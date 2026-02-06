export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type RuleCategory = "layout" | "compile";

export interface ThaiMessages {
  title: string;
  cause: string;
  impact: string;
  fix: string;
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

export interface VersionSignal {
  signal_id: string;
  detected: boolean;
  action: "reject" | "warn" | "pass";
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

export interface FixProposal {
  strategy: string;
  rule_id: string;
  description: string;
  thai_description: string;
  safe: boolean;
}

export interface AnalysisResult {
  file_id: string;
  file_name: string;
  version_check: VersionGuardResult;
  layout_score: number;
  compile_score: number;
  final_score: number;
  risk_level: RiskLevel;
  findings: Finding[];
  jrxml_content?: string;
  fix_proposals?: FixProposal[];
  diff?: string;
}

export interface UploadResponse {
  file_id: string;
  file_name: string;
  file_size: number;
}
