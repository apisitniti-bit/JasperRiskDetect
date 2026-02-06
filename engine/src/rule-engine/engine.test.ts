import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import * as path from "path";
import { validateRules, validateAndCastRules } from "./schema-validator";
import { loadRulesFromFile, loadLayoutRules, loadCompileRules, clearRuleCache, matchFinding, enrichFindings } from "./engine";
import { scoreFindings, calculateRiskLevel, calculateCategoryScore } from "../risk-scorer/scorer";
import type { Finding } from "./types";

const RULES_DIR = path.resolve(__dirname, "..", "..", "rules");

beforeEach(function () {
  clearRuleCache();
});

// ============================================================
// Schema Validator Tests
// ============================================================

describe("Schema Validator", function () {
  it("should accept a valid rule", function () {
    const result = validateRules([
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural", config: {} },
        risk_weight: 25,
        thai: {
          title: "test title",
          cause: "test cause",
          impact: "test impact",
          fix: "test fix",
        },
      },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rule_count, 1);
  });

  it("should reject rule with invalid severity", function () {
    const result = validateRules([
      {
        rule_id: "LAYOUT-001",
        severity: "extreme",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 25,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(function (e) { return e.field === "severity"; }));
  });

  it("should reject rule with mismatched category and prefix", function () {
    const result = validateRules([
      {
        rule_id: "COMPILE-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 25,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(function (e) { return e.message.includes("prefix"); }));
  });

  it("should reject rule with weight outside severity guideline", function () {
    const result = validateRules([
      {
        rule_id: "LAYOUT-001",
        severity: "low",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 10,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(function (e) { return e.message.includes("guideline"); }));
  });

  it("should reject duplicate rule_ids", function () {
    const result = validateRules([
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 25,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
      },
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 20,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(function (e) { return e.message === "duplicate rule_id"; }));
  });

  it("should reject rule with missing thai fields", function () {
    const result = validateRules([
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 25,
        thai: { title: "t", cause: "", impact: "i", fix: "f" },
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(function (e) { return e.field === "thai.cause"; }));
  });

  it("should reject rule_id with invalid pattern", function () {
    const result = validateRules([
      {
        rule_id: "INVALID-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural" },
        risk_weight: 25,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
      },
    ]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(function (e) { return e.message.includes("pattern"); }));
  });
});

// ============================================================
// Rule Loading Tests
// ============================================================

describe("Rule Engine — Loading", function () {
  it("should load layout rules from JSON file", function () {
    const result = loadRulesFromFile(path.join(RULES_DIR, "layout.rules.3.7.1.json"));
    assert.equal(result.validation.valid, true);
    assert.ok(result.rules.length >= 25, "Expected 25+ layout rules, got " + result.rules.length);
  });

  it("should load compile rules from JSON file", function () {
    const result = loadRulesFromFile(path.join(RULES_DIR, "compile.rules.3.7.1.json"));
    assert.equal(result.validation.valid, true);
    assert.ok(result.rules.length >= 25, "Expected 25+ compile rules, got " + result.rules.length);
  });

  it("should load layout rules via convenience function", function () {
    const rules = loadLayoutRules(RULES_DIR);
    assert.ok(rules.length >= 25);
    assert.equal(rules[0].rule_id, "LAYOUT-001");
    assert.equal(rules[0].category, "layout");
  });

  it("should load compile rules via convenience function", function () {
    const rules = loadCompileRules(RULES_DIR);
    assert.ok(rules.length >= 25);
    assert.equal(rules[0].rule_id, "COMPILE-001");
    assert.equal(rules[0].category, "compile");
  });

  it("should cache rules on second load", function () {
    const rules1 = loadLayoutRules(RULES_DIR);
    const rules2 = loadLayoutRules(RULES_DIR);
    assert.equal(rules1, rules2); // same reference
  });

  it("should all layout rules have Thai messages", function () {
    const rules = loadLayoutRules(RULES_DIR);
    for (const rule of rules) {
      assert.ok(rule.thai.title.length > 0, rule.rule_id + " missing thai.title");
      assert.ok(rule.thai.cause.length > 0, rule.rule_id + " missing thai.cause");
      assert.ok(rule.thai.impact.length > 0, rule.rule_id + " missing thai.impact");
      assert.ok(rule.thai.fix.length > 0, rule.rule_id + " missing thai.fix");
    }
  });

  it("should all compile rules have Thai messages", function () {
    const rules = loadCompileRules(RULES_DIR);
    for (const rule of rules) {
      assert.ok(rule.thai.title.length > 0, rule.rule_id + " missing thai.title");
      assert.ok(rule.thai.cause.length > 0, rule.rule_id + " missing thai.cause");
      assert.ok(rule.thai.impact.length > 0, rule.rule_id + " missing thai.impact");
      assert.ok(rule.thai.fix.length > 0, rule.rule_id + " missing thai.fix");
    }
  });

  it("should have 50+ total rules", function () {
    const layout = loadLayoutRules(RULES_DIR);
    const compile = loadCompileRules(RULES_DIR);
    assert.ok(layout.length + compile.length >= 50, "Expected 50+ total rules, got " + (layout.length + compile.length));
  });
});

// ============================================================
// Rule Matching Tests
// ============================================================

describe("Rule Engine — Matching", function () {
  it("should match finding by exact rule_id", function () {
    const rules = loadLayoutRules(RULES_DIR);
    const matched = matchFinding("LAYOUT-001", rules);
    assert.ok(matched !== null);
    assert.equal(matched!.rule_id, "LAYOUT-001");
  });

  it("should return null for unknown rule_id", function () {
    const rules = loadLayoutRules(RULES_DIR);
    const matched = matchFinding("LAYOUT-999", rules);
    assert.equal(matched, null);
  });

  it("should enrich findings with rule Thai messages", function () {
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "high",
        category: "layout",
        message: "Band overflow detected",
        thai: { title: "", cause: "", impact: "", fix: "" },
        risk_weight: 0,
      },
    ];
    const enriched = enrichFindings(findings, "layout", RULES_DIR);
    assert.equal(enriched.length, 1);
    assert.ok(enriched[0].thai.title.length > 0);
    assert.equal(enriched[0].severity, "critical"); // rule overrides to critical
    assert.equal(enriched[0].risk_weight, 25);
  });
});

// ============================================================
// Risk Scorer Tests
// ============================================================

describe("Risk Scorer", function () {
  it("should calculate risk level correctly", function () {
    assert.equal(calculateRiskLevel(0), "LOW");
    assert.equal(calculateRiskLevel(39), "LOW");
    assert.equal(calculateRiskLevel(40), "MEDIUM");
    assert.equal(calculateRiskLevel(59), "MEDIUM");
    assert.equal(calculateRiskLevel(60), "HIGH");
    assert.equal(calculateRiskLevel(79), "HIGH");
    assert.equal(calculateRiskLevel(80), "CRITICAL");
    assert.equal(calculateRiskLevel(100), "CRITICAL");
  });

  it("should cap category score at 100", function () {
    const findings: Finding[] = [];
    for (let i = 0; i < 10; i++) {
      findings.push({
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        message: "test",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 25,
      });
    }
    const score = calculateCategoryScore(findings);
    assert.equal(score, 100); // 10*25=250, capped at 100
  });

  it("should use max(layout, compile) for final score", function () {
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        message: "layout issue",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 20,
      },
      {
        rule_id: "COMPILE-001",
        severity: "critical",
        category: "compile",
        message: "compile issue",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 60,
      },
    ];
    const result = scoreFindings(findings);
    assert.equal(result.layout_score, 100); // critical → forced 100
    assert.equal(result.compile_score, 60);
    assert.equal(result.final_score, 100); // critical → forced 100
    assert.equal(result.risk_level, "CRITICAL");
    assert.equal(result.ci_should_fail, true); // 100 >= 80
  });

  it("should flag CI failure at score >= 80", function () {
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        message: "critical layout",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 25,
      },
      {
        rule_id: "LAYOUT-009",
        severity: "critical",
        category: "layout",
        message: "circular deps",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 25,
      },
      {
        rule_id: "LAYOUT-006",
        severity: "critical",
        category: "layout",
        message: "pagination",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 22,
      },
      {
        rule_id: "LAYOUT-003",
        severity: "critical",
        category: "layout",
        message: "memory",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 20,
      },
    ];
    const result = scoreFindings(findings);
    assert.equal(result.layout_score, 100); // critical → forced 100
    assert.equal(result.final_score, 100); // critical → forced 100
    assert.equal(result.risk_level, "CRITICAL");
    assert.equal(result.ci_should_fail, true);
  });

  it("should return 0 score for empty findings", function () {
    const result = scoreFindings([]);
    assert.equal(result.final_score, 0);
    assert.equal(result.risk_level, "LOW");
    assert.equal(result.ci_should_fail, false);
    assert.equal(result.layout_findings_count, 0);
    assert.equal(result.compile_findings_count, 0);
  });

  it("should count findings per category", function () {
    const findings: Finding[] = [
      { rule_id: "LAYOUT-001", severity: "critical", category: "layout", message: "", thai: { title: "t", cause: "c", impact: "i", fix: "f" }, risk_weight: 25 },
      { rule_id: "LAYOUT-002", severity: "medium", category: "layout", message: "", thai: { title: "t", cause: "c", impact: "i", fix: "f" }, risk_weight: 5 },
      { rule_id: "COMPILE-001", severity: "critical", category: "compile", message: "", thai: { title: "t", cause: "c", impact: "i", fix: "f" }, risk_weight: 25 },
    ];
    const result = scoreFindings(findings);
    assert.equal(result.layout_findings_count, 2);
    assert.equal(result.compile_findings_count, 1);
  });
});
