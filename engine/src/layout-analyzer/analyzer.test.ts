import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeLayout } from "./analyzer";
import { parseJrxml } from "./parsers/jrxml-parser";

// --- Fixtures ---

const CLEAN_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="clean_report"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555"
              whenNoDataType="NoPages">
  <field name="name" class="java.lang.String"/>
  <field name="age" class="java.lang.Integer"/>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{name}]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="200" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$F{age}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

const BAND_OVERFLOW_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="overflow_report"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  <title>
    <band height="900">
      <staticText>
        <reportElement x="0" y="0" width="200" height="20"/>
      </staticText>
    </band>
  </title>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA["test"]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

const OVERLAP_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="overlap_report"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  <detail>
    <band height="40">
      <textField>
        <reportElement x="0" y="0" width="200" height="30"/>
        <textFieldExpression><![CDATA["A"]]></textFieldExpression>
      </textField>
      <textField>
        <reportElement x="100" y="10" width="200" height="30"/>
        <textFieldExpression><![CDATA["B"]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

const MANY_FIELDS_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="many_fields"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  ${Array.from({ length: 210 }, function (_, i) { return `<field name="f${i}" class="java.lang.String"/>`; }).join("\n  ")}
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$F{f0}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

const CIRCULAR_VAR_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="circular_vars"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  <variable name="varA" class="java.lang.Integer">
    <variableExpression><![CDATA[$V{varB} + 1]]></variableExpression>
  </variable>
  <variable name="varB" class="java.lang.Integer">
    <variableExpression><![CDATA[$V{varC} + 1]]></variableExpression>
  </variable>
  <variable name="varC" class="java.lang.Integer">
    <variableExpression><![CDATA[$V{varA} + 1]]></variableExpression>
  </variable>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$V{varA}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

const DEEP_GROUPS_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="deep_groups"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  <field name="a" class="java.lang.String"/>
  <group name="g1"><groupExpression><![CDATA[$F{a}]]></groupExpression><groupHeader><band height="10"/></groupHeader><groupFooter><band height="10"/></groupFooter></group>
  <group name="g2"><groupExpression><![CDATA[$F{a}]]></groupExpression><groupHeader><band height="10"/></groupHeader><groupFooter><band height="10"/></groupFooter></group>
  <group name="g3"><groupExpression><![CDATA[$F{a}]]></groupExpression><groupHeader><band height="10"/></groupHeader><groupFooter><band height="10"/></groupFooter></group>
  <group name="g4"><groupExpression><![CDATA[$F{a}]]></groupExpression><groupHeader><band height="10"/></groupHeader><groupFooter><band height="10"/></groupFooter></group>
  <group name="g5"><groupExpression><![CDATA[$F{a}]]></groupExpression><groupHeader><band height="10"/></groupHeader><groupFooter><band height="10"/></groupFooter></group>
  <group name="g6"><groupExpression><![CDATA[$F{a}]]></groupExpression><groupHeader><band height="10"/></groupHeader><groupFooter><band height="10"/></groupFooter></group>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$F{a}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

const SUBREPORT_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="subreport_heavy"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  <detail>
    <band height="100">
      <subreport>
        <reportElement x="0" y="0" width="555" height="20"/>
        <subreportExpression><![CDATA["sub1.jasper"]]></subreportExpression>
      </subreport>
      <subreport>
        <reportElement x="0" y="20" width="555" height="20"/>
        <subreportExpression><![CDATA["sub2.jasper"]]></subreportExpression>
      </subreport>
      <subreport>
        <reportElement x="0" y="40" width="555" height="20"/>
        <subreportExpression><![CDATA["sub3.jasper"]]></subreportExpression>
      </subreport>
      <subreport>
        <reportElement x="0" y="60" width="555" height="20"/>
        <subreportExpression><![CDATA["sub4.jasper"]]></subreportExpression>
      </subreport>
    </band>
  </detail>
</jasperReport>`;

const COMPLEX_EXPRESSION_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="complex_expr"
              pageWidth="595" pageHeight="842"
              topMargin="20" bottomMargin="20"
              leftMargin="20" rightMargin="20"
              columnWidth="555">
  <field name="status" class="java.lang.String"/>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{status}.equals("A") ? ($F{status}.equals("B") ? ($F{status}.equals("C") ? ($F{status}.equals("D") ? "deep" : "d") : "c") : "b") : "a"]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

// ============================================================
// Tests
// ============================================================

describe("JRXML Parser", function () {
  it("should parse page dimensions", function () {
    const ast = parseJrxml(CLEAN_JRXML);
    assert.equal(ast.page.width, 595);
    assert.equal(ast.page.height, 842);
    assert.equal(ast.page.topMargin, 20);
    assert.equal(ast.page.bottomMargin, 20);
  });

  it("should parse fields", function () {
    const ast = parseJrxml(CLEAN_JRXML);
    assert.equal(ast.fields.length, 2);
    assert.equal(ast.fields[0].name, "name");
    assert.equal(ast.fields[1].name, "age");
  });

  it("should parse detail band with elements", function () {
    const ast = parseJrxml(CLEAN_JRXML);
    const detail = ast.bands.find(function (b) { return b.type === "detail"; });
    assert.ok(detail);
    assert.equal(detail!.height, 20);
    assert.equal(detail!.elements.length, 2);
    assert.equal(detail!.elements[0].type, "textField");
  });

  it("should extract expressions from CDATA", function () {
    const ast = parseJrxml(CLEAN_JRXML);
    assert.ok(ast.rawExpressions.length > 0);
    assert.ok(ast.rawExpressions.some(function (e) { return e.includes("$F{name}"); }));
  });

  it("should count total elements", function () {
    const ast = parseJrxml(CLEAN_JRXML);
    assert.equal(ast.totalElementCount, 2);
  });

  it("should parse groups", function () {
    const ast = parseJrxml(DEEP_GROUPS_JRXML);
    assert.equal(ast.groups.length, 6);
    assert.equal(ast.groups[0].name, "g1");
  });

  it("should parse variables", function () {
    const ast = parseJrxml(CIRCULAR_VAR_JRXML);
    assert.equal(ast.variables.length, 3);
    assert.equal(ast.variables[0].name, "varA");
  });

  it("should parse subreports", function () {
    const ast = parseJrxml(SUBREPORT_JRXML);
    assert.equal(ast.subreports.length, 4);
    assert.equal(ast.subreports[0].expression, '"sub1.jasper"');
  });
});

describe("Layout Analyzer — Full Pipeline", function () {
  it("should return no findings for a clean report", function () {
    const result = analyzeLayout(CLEAN_JRXML);
    assert.equal(result.check_count, 10);
    // Clean report should have 0 or only info-level findings
    const nonInfo = result.findings.filter(function (f) { return f.severity !== "info"; });
    assert.equal(nonInfo.length, 0);
  });
});

describe("Layout Check — Band Overflow", function () {
  it("should detect band exceeding usable page height", function () {
    const result = analyzeLayout(BAND_OVERFLOW_JRXML);
    const overflows = result.findings.filter(function (f) { return f.check_id === "LAYOUT-001"; });
    assert.ok(overflows.length >= 1);
    assert.equal(overflows[0].severity, "critical");
    assert.ok(overflows[0].thai_message.includes("เกินพื้นที่ใช้งาน"));
  });
});

describe("Layout Check — Element Overlap", function () {
  it("should detect overlapping elements", function () {
    const result = analyzeLayout(OVERLAP_JRXML);
    const overlaps = result.findings.filter(function (f) { return f.check_id === "LAYOUT-002"; });
    assert.ok(overlaps.length >= 1);
    assert.equal(overlaps[0].severity, "medium");
    assert.ok(overlaps[0].thai_message.includes("ทับซ้อน"));
  });
});

describe("Layout Check — Field Count", function () {
  it("should flag reports with > 200 fields", function () {
    const result = analyzeLayout(MANY_FIELDS_JRXML);
    const fieldFindings = result.findings.filter(function (f) { return f.check_id === "LAYOUT-008"; });
    assert.ok(fieldFindings.length >= 1);
    assert.ok(fieldFindings[0].severity === "high" || fieldFindings[0].severity === "medium");
  });
});

describe("Layout Check — Variable Dependency", function () {
  it("should detect circular variable references", function () {
    const result = analyzeLayout(CIRCULAR_VAR_JRXML);
    const circular = result.findings.filter(function (f) { return f.check_id === "LAYOUT-009"; });
    assert.ok(circular.length >= 1);
    assert.equal(circular[0].severity, "critical");
    assert.ok(circular[0].thai_message.includes("อ้างอิงวนรอบ"));
  });
});

describe("Layout Check — Group Nesting", function () {
  it("should flag reports with > 5 group levels", function () {
    const result = analyzeLayout(DEEP_GROUPS_JRXML);
    const groupFindings = result.findings.filter(function (f) { return f.check_id === "LAYOUT-010"; });
    assert.ok(groupFindings.length >= 1);
    assert.equal(groupFindings[0].severity, "high");
    assert.ok(groupFindings[0].thai_message.includes("กลุ่มซ้อน"));
  });
});

describe("Layout Check — Subreport Depth", function () {
  it("should flag reports with > 3 subreports", function () {
    const result = analyzeLayout(SUBREPORT_JRXML);
    const subFindings = result.findings.filter(function (f) { return f.check_id === "LAYOUT-004"; });
    assert.ok(subFindings.length >= 1);
    assert.equal(subFindings[0].severity, "high");
  });
});

describe("Layout Check — Expression Complexity", function () {
  it("should detect deeply nested ternary expressions", function () {
    const result = analyzeLayout(COMPLEX_EXPRESSION_JRXML);
    const exprFindings = result.findings.filter(function (f) {
      return f.check_id === "LAYOUT-007" && f.details["ternary_depth"] !== undefined;
    });
    assert.ok(exprFindings.length >= 1);
    assert.equal(exprFindings[0].severity, "medium");
  });
});
