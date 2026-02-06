import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { fixBandHeight } from "./strategies/band-height";
import { fixStretchOverflow } from "./strategies/stretch-overflow";
import { fixElementPosition } from "./strategies/element-position";
import { generateUnifiedDiff, applyChanges } from "./diff-generator";
import { generateFixes, getAvailableStrategies } from "./fixer";
import type { FixContext } from "./types";
import type { Finding, Rule } from "../rule-engine/types";

// --- Fixtures ---

const BAND_OVERFLOW_XML = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<jasperReport pageWidth="595" pageHeight="842" topMargin="20" bottomMargin="20">',
  '  <title>',
  '    <band height="900">',
  '      <staticText>',
  '        <reportElement x="0" y="0" width="200" height="20"/>',
  '      </staticText>',
  '    </band>',
  '  </title>',
  '</jasperReport>',
];

const TEXTFIELD_NO_STRETCH_XML = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<jasperReport>',
  '  <detail>',
  '    <band height="40">',
  '      <textField>',
  '        <reportElement x="0" y="0" width="200" height="20"/>',
  '        <textFieldExpression><![CDATA[$F{name}]]></textFieldExpression>',
  '      </textField>',
  '      <textField isStretchWithOverflow="true">',
  '        <reportElement x="200" y="0" width="200" height="20"/>',
  '        <textFieldExpression><![CDATA[$F{age}]]></textFieldExpression>',
  '      </textField>',
  '    </band>',
  '  </detail>',
  '</jasperReport>',
];

const ELEMENT_OUTSIDE_BAND_XML = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<jasperReport>',
  '  <detail>',
  '    <band height="40">',
  '      <textField>',
  '        <reportElement x="0" y="30" width="200" height="20"/>',
  '      </textField>',
  '    </band>',
  '  </detail>',
  '</jasperReport>',
];

// ============================================================
// Strategy Tests
// ============================================================

describe("Auto-Fix Strategy — band-height", function () {
  it("should reduce band height exceeding usable page height", function () {
    const ctx: FixContext = {
      rule_id: "LAYOUT-001",
      band_type: "title",
      details: { usable_height: 802 },
    };
    const changes = fixBandHeight(
      BAND_OVERFLOW_XML.join("\n"),
      BAND_OVERFLOW_XML,
      ctx
    );
    assert.ok(changes.length >= 1);
    assert.ok(changes[0].replacement.includes('height="802"'));
    assert.ok(changes[0].original.includes('height="900"'));
  });

  it("should not modify bands within usable height", function () {
    const normalXml = [
      '<title>',
      '  <band height="100">',
      '  </band>',
      '</title>',
    ];
    const ctx: FixContext = {
      rule_id: "LAYOUT-001",
      details: { usable_height: 802 },
    };
    const changes = fixBandHeight(normalXml.join("\n"), normalXml, ctx);
    assert.equal(changes.length, 0);
  });
});

describe("Auto-Fix Strategy — stretch-overflow", function () {
  it("should add isStretchWithOverflow to textField missing it", function () {
    const ctx: FixContext = { rule_id: "LAYOUT-011" };
    const changes = fixStretchOverflow(
      TEXTFIELD_NO_STRETCH_XML.join("\n"),
      TEXTFIELD_NO_STRETCH_XML,
      ctx
    );
    assert.ok(changes.length >= 1);
    assert.ok(changes[0].replacement.includes('isStretchWithOverflow="true"'));
  });

  it("should not modify textField that already has isStretchWithOverflow", function () {
    const ctx: FixContext = { rule_id: "LAYOUT-011" };
    const changes = fixStretchOverflow(
      TEXTFIELD_NO_STRETCH_XML.join("\n"),
      TEXTFIELD_NO_STRETCH_XML,
      ctx
    );
    // Only 1 change (first textField), not the second which already has it
    assert.equal(changes.length, 1);
    assert.equal(changes[0].line_start, 5); // line 5 = first <textField>
  });
});

describe("Auto-Fix Strategy — element-position", function () {
  it("should clamp element height to fit within band", function () {
    const ctx: FixContext = {
      rule_id: "LAYOUT-014",
      details: { band_height: 40 },
    };
    const changes = fixElementPosition(
      ELEMENT_OUTSIDE_BAND_XML.join("\n"),
      ELEMENT_OUTSIDE_BAND_XML,
      ctx
    );
    assert.ok(changes.length >= 1);
    // y=30, band_height=40, so new height = 40-30 = 10
    assert.ok(changes[0].replacement.includes('height="10"'));
  });

  it("should not modify elements within band", function () {
    const withinBandXml = [
      '<reportElement x="0" y="0" width="200" height="20"/>',
    ];
    const ctx: FixContext = {
      rule_id: "LAYOUT-014",
      details: { band_height: 40 },
    };
    const changes = fixElementPosition(
      withinBandXml.join("\n"),
      withinBandXml,
      ctx
    );
    assert.equal(changes.length, 0);
  });
});

// ============================================================
// Diff Generator Tests
// ============================================================

describe("Diff Generator", function () {
  it("should produce unified diff format", function () {
    const original = ["line1", "line2", "line3", "line4", "line5"];
    const changes = [
      { line_start: 3, line_end: 3, original: "line3", replacement: "line3-fixed" },
    ];
    const diff = generateUnifiedDiff(original, changes, "test.jrxml");
    assert.ok(diff.includes("--- a/test.jrxml"));
    assert.ok(diff.includes("+++ b/test.jrxml"));
    assert.ok(diff.includes("@@"));
    assert.ok(diff.includes("-line3"));
    assert.ok(diff.includes("+line3-fixed"));
  });

  it("should return empty string for no changes", function () {
    const diff = generateUnifiedDiff(["line1"], [], "test.jrxml");
    assert.equal(diff, "");
  });

  it("should apply changes correctly", function () {
    const original = ["aaa", "bbb", "ccc"];
    const changes = [
      { line_start: 2, line_end: 2, original: "bbb", replacement: "BBB" },
    ];
    const result = applyChanges(original, changes);
    assert.deepEqual(result, ["aaa", "BBB", "ccc"]);
  });

  it("should apply multiple changes correctly", function () {
    const original = ["aaa", "bbb", "ccc", "ddd"];
    const changes = [
      { line_start: 1, line_end: 1, original: "aaa", replacement: "AAA" },
      { line_start: 4, line_end: 4, original: "ddd", replacement: "DDD" },
    ];
    const result = applyChanges(original, changes);
    assert.deepEqual(result, ["AAA", "bbb", "ccc", "DDD"]);
  });
});

// ============================================================
// Orchestrator Tests
// ============================================================

describe("Auto-Fix Orchestrator", function () {
  it("should list available strategies", function () {
    const strategies = getAvailableStrategies();
    assert.ok(strategies.includes("band-height"));
    assert.ok(strategies.includes("stretch-overflow"));
    assert.ok(strategies.includes("element-position"));
  });

  it("should generate fix proposals for matching findings+rules", function () {
    const xml = BAND_OVERFLOW_XML.join("\n");
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        message: "Band overflow",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 25,
      },
    ];
    const rules: Rule[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural", config: {} },
        risk_weight: 25,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        autofix: { available: true, strategy: "band-height", safe: true },
      },
    ];
    const result = generateFixes(xml, findings, rules, "test.jrxml");
    assert.equal(result.applied, false);
    assert.ok(result.proposals.length >= 1);
    assert.ok(result.diff.length > 0);
    assert.ok(result.fixed_xml !== null);
    assert.ok(result.proposals[0].thai_description.length > 0);
  });

  it("should skip findings without autofix rule", function () {
    const xml = BAND_OVERFLOW_XML.join("\n");
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-003",
        severity: "critical",
        category: "layout",
        message: "Memory high",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 20,
      },
    ];
    const rules: Rule[] = [
      {
        rule_id: "LAYOUT-003",
        severity: "critical",
        category: "layout",
        detection: { type: "element_count", config: {} },
        risk_weight: 20,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        // No autofix
      },
    ];
    const result = generateFixes(xml, findings, rules, "test.jrxml");
    assert.equal(result.proposals.length, 0);
    assert.equal(result.diff, "");
    assert.equal(result.fixed_xml, null);
    assert.equal(result.applied, false);
  });

  it("should skip unsafe autofix strategies", function () {
    const xml = BAND_OVERFLOW_XML.join("\n");
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        message: "Band overflow",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 25,
      },
    ];
    const rules: Rule[] = [
      {
        rule_id: "LAYOUT-001",
        severity: "critical",
        category: "layout",
        detection: { type: "structural", config: {} },
        risk_weight: 25,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        autofix: { available: true, strategy: "band-height", safe: false },
      },
    ];
    const result = generateFixes(xml, findings, rules, "test.jrxml");
    assert.equal(result.proposals.length, 0);
  });

  it("should never set applied to true", function () {
    const xml = TEXTFIELD_NO_STRETCH_XML.join("\n");
    const findings: Finding[] = [
      {
        rule_id: "LAYOUT-011",
        severity: "medium",
        category: "layout",
        message: "Missing stretch",
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        risk_weight: 4,
      },
    ];
    const rules: Rule[] = [
      {
        rule_id: "LAYOUT-011",
        severity: "medium",
        category: "layout",
        detection: { type: "attribute_check", config: {} },
        risk_weight: 4,
        thai: { title: "t", cause: "c", impact: "i", fix: "f" },
        autofix: { available: true, strategy: "stretch-overflow", safe: true },
      },
    ];
    const result = generateFixes(xml, findings, rules, "test.jrxml");
    assert.equal(result.applied, false);
    assert.ok(result.proposals.length >= 1);
  });
});
