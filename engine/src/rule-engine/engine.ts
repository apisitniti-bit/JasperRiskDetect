import * as fs from "fs";
import * as path from "path";
import type { Rule, Finding, RuleCategory } from "./types";
import { validateAndCastRules } from "./schema-validator";
import type { ValidationResult } from "./schema-validator";

let cachedLayoutRules: Rule[] | null = null;
let cachedCompileRules: Rule[] | null = null;

function defaultRulesDir(): string {
  return path.resolve(__dirname, "..", "..", "rules");
}

export function loadRulesFromFile(filePath: string): { rules: Rule[]; validation: ValidationResult } {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    return {
      rules: [],
      validation: {
        valid: false,
        errors: [{ rule_id: "(file)", field: "(root)", message: "Rules file must contain a JSON array" }],
        rule_count: 0,
      },
    };
  }

  return validateAndCastRules(parsed);
}

export function loadLayoutRules(rulesDir?: string): Rule[] {
  if (cachedLayoutRules !== null) return cachedLayoutRules;

  const dir = rulesDir || defaultRulesDir();
  const filePath = path.join(dir, "layout.rules.3.7.1.json");
  const result = loadRulesFromFile(filePath);

  if (!result.validation.valid) {
    const msgs = result.validation.errors.map(function (e) {
      return e.rule_id + ": " + e.field + " — " + e.message;
    });
    throw new Error("Invalid layout rules:\n" + msgs.join("\n"));
  }

  cachedLayoutRules = result.rules;
  return cachedLayoutRules;
}

export function loadCompileRules(rulesDir?: string): Rule[] {
  if (cachedCompileRules !== null) return cachedCompileRules;

  const dir = rulesDir || defaultRulesDir();
  const filePath = path.join(dir, "compile.rules.3.7.1.json");
  const result = loadRulesFromFile(filePath);

  if (!result.validation.valid) {
    const msgs = result.validation.errors.map(function (e) {
      return e.rule_id + ": " + e.field + " — " + e.message;
    });
    throw new Error("Invalid compile rules:\n" + msgs.join("\n"));
  }

  cachedCompileRules = result.rules;
  return cachedCompileRules;
}

export function clearRuleCache(): void {
  cachedLayoutRules = null;
  cachedCompileRules = null;
}

export function matchFinding(checkId: string, rules: Rule[]): Rule | null {
  // Direct match by rule_id
  for (const rule of rules) {
    if (rule.rule_id === checkId) return rule;
  }

  // Prefix match: "LAYOUT-001" matches check_id "LAYOUT-001"
  // Also match "COMPILE-COMPILE_ERROR" → find closest COMPILE-0xx rule
  return null;
}

export function enrichFindings(
  findings: Finding[],
  category: RuleCategory,
  rulesDir?: string
): Finding[] {
  const rules = category === "layout"
    ? loadLayoutRules(rulesDir)
    : loadCompileRules(rulesDir);

  const enriched: Finding[] = [];

  for (const finding of findings) {
    const rule = matchFinding(finding.rule_id, rules);

    if (rule !== null) {
      // Enrich finding with rule's Thai messages and weight
      enriched.push({
        rule_id: finding.rule_id,
        severity: rule.severity,
        category: rule.category,
        line: finding.line,
        column: finding.column,
        element: finding.element,
        element_name: finding.element_name,
        message: finding.message,
        thai: rule.thai,
        risk_weight: rule.risk_weight,
        details: finding.details,
      });
    } else {
      // Keep finding as-is if no matching rule
      enriched.push(finding);
    }
  }

  return enriched;
}

export function getAllRules(rulesDir?: string): Rule[] {
  const layout = loadLayoutRules(rulesDir);
  const compile = loadCompileRules(rulesDir);
  return layout.concat(compile);
}
