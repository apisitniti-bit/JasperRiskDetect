import type { Rule, Severity, RuleCategory, DetectionType } from "./types";

const VALID_SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
const VALID_CATEGORIES: RuleCategory[] = ["layout", "compile"];
const VALID_DETECTION_TYPES: DetectionType[] = [
  "xpath",
  "element_count",
  "attribute_check",
  "expression_pattern",
  "structural",
];

const RULE_ID_PATTERN = /^(LAYOUT|COMPILE)-\d{3}$/;

const WEIGHT_RANGES: Record<Severity, [number, number]> = {
  critical: [15, 25],
  high: [8, 14],
  medium: [3, 7],
  low: [1, 2],
  info: [0, 0],
};

export interface ValidationError {
  rule_id: string;
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  rule_count: number;
}

function validateSingleRule(rule: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const ruleId = (rule as Record<string, unknown>)?.["rule_id"];
  const id = typeof ruleId === "string" ? ruleId : "rules[" + index + "]";

  if (rule === null || typeof rule !== "object") {
    errors.push({ rule_id: id, field: "(root)", message: "Rule must be an object" });
    return errors;
  }

  const r = rule as Record<string, unknown>;

  // rule_id
  if (typeof r["rule_id"] !== "string") {
    errors.push({ rule_id: id, field: "rule_id", message: "rule_id must be a string" });
  } else if (!RULE_ID_PATTERN.test(r["rule_id"] as string)) {
    errors.push({
      rule_id: id,
      field: "rule_id",
      message: "rule_id must match pattern LAYOUT-NNN or COMPILE-NNN",
    });
  }

  // severity
  if (typeof r["severity"] !== "string" || VALID_SEVERITIES.indexOf(r["severity"] as Severity) === -1) {
    errors.push({
      rule_id: id,
      field: "severity",
      message: "severity must be one of: " + VALID_SEVERITIES.join(", "),
    });
  }

  // category
  if (typeof r["category"] !== "string" || VALID_CATEGORIES.indexOf(r["category"] as RuleCategory) === -1) {
    errors.push({
      rule_id: id,
      field: "category",
      message: "category must be one of: " + VALID_CATEGORIES.join(", "),
    });
  }

  // detection
  if (r["detection"] === null || typeof r["detection"] !== "object") {
    errors.push({ rule_id: id, field: "detection", message: "detection must be an object" });
  } else {
    const det = r["detection"] as Record<string, unknown>;
    if (
      typeof det["type"] !== "string" ||
      VALID_DETECTION_TYPES.indexOf(det["type"] as DetectionType) === -1
    ) {
      errors.push({
        rule_id: id,
        field: "detection.type",
        message: "detection.type must be one of: " + VALID_DETECTION_TYPES.join(", "),
      });
    }
  }

  // risk_weight
  if (typeof r["risk_weight"] !== "number" || !Number.isInteger(r["risk_weight"])) {
    errors.push({ rule_id: id, field: "risk_weight", message: "risk_weight must be an integer" });
  } else {
    const w = r["risk_weight"] as number;
    if (w < 0 || w > 25) {
      errors.push({ rule_id: id, field: "risk_weight", message: "risk_weight must be 0–25" });
    }
    // Validate weight matches severity guideline
    const sev = r["severity"] as Severity;
    if (typeof sev === "string" && WEIGHT_RANGES[sev]) {
      const [min, max] = WEIGHT_RANGES[sev];
      if (w < min || w > max) {
        errors.push({
          rule_id: id,
          field: "risk_weight",
          message: "risk_weight " + w + " outside guideline range for " + sev + " (" + min + "–" + max + ")",
        });
      }
    }
  }

  // thai messages
  if (r["thai"] === null || typeof r["thai"] !== "object") {
    errors.push({ rule_id: id, field: "thai", message: "thai must be an object" });
  } else {
    const thai = r["thai"] as Record<string, unknown>;
    const requiredFields = ["title", "cause", "impact", "fix"];
    for (const f of requiredFields) {
      if (typeof thai[f] !== "string" || (thai[f] as string).trim().length === 0) {
        errors.push({
          rule_id: id,
          field: "thai." + f,
          message: "thai." + f + " must be a non-empty string",
        });
      }
    }
  }

  // autofix (optional)
  if (r["autofix"] !== undefined && r["autofix"] !== null) {
    if (typeof r["autofix"] !== "object") {
      errors.push({ rule_id: id, field: "autofix", message: "autofix must be an object if present" });
    } else {
      const af = r["autofix"] as Record<string, unknown>;
      if (typeof af["available"] !== "boolean") {
        errors.push({ rule_id: id, field: "autofix.available", message: "autofix.available must be a boolean" });
      }
      if (typeof af["strategy"] !== "string" && af["strategy"] !== null) {
        errors.push({ rule_id: id, field: "autofix.strategy", message: "autofix.strategy must be a string or null" });
      }
      if (typeof af["safe"] !== "boolean") {
        errors.push({ rule_id: id, field: "autofix.safe", message: "autofix.safe must be a boolean" });
      }
    }
  }

  // category ↔ rule_id prefix consistency
  if (typeof r["rule_id"] === "string" && typeof r["category"] === "string") {
    const rid = r["rule_id"] as string;
    const cat = r["category"] as string;
    if (cat === "layout" && !rid.startsWith("LAYOUT-")) {
      errors.push({ rule_id: id, field: "rule_id", message: "layout category rule must have LAYOUT- prefix" });
    }
    if (cat === "compile" && !rid.startsWith("COMPILE-")) {
      errors.push({ rule_id: id, field: "rule_id", message: "compile category rule must have COMPILE- prefix" });
    }
  }

  return errors;
}

export function validateRules(rules: unknown[]): ValidationResult {
  const allErrors: ValidationError[] = [];

  // Check for duplicate rule_ids
  const seenIds = new Set<string>();

  for (let i = 0; i < rules.length; i++) {
    const errs = validateSingleRule(rules[i], i);
    for (const e of errs) {
      allErrors.push(e);
    }

    const rid = (rules[i] as Record<string, unknown>)?.["rule_id"];
    if (typeof rid === "string") {
      if (seenIds.has(rid)) {
        allErrors.push({ rule_id: rid, field: "rule_id", message: "duplicate rule_id" });
      }
      seenIds.add(rid);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    rule_count: rules.length,
  };
}

export function validateAndCastRules(rules: unknown[]): { rules: Rule[]; validation: ValidationResult } {
  const validation = validateRules(rules);
  if (!validation.valid) {
    return { rules: [], validation };
  }
  return { rules: rules as Rule[], validation };
}
