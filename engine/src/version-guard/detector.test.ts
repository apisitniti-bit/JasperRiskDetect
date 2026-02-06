import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectVersion, parseRootAttributes, isJrxmlFile } from "./detector";

// --- Valid iReport 3.7.1 JRXML (should PASS) ---

const VALID_371_JRXML = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xsi:schemaLocation="http://jasperreports.sourceforge.net/jasperreports http://jasperreports.sourceforge.net/xsd/jasperreport.xsd"
              name="patient_summary"
              pageWidth="595"
              pageHeight="842"
              whenNoDataType="NoPages"
              columnWidth="555"
              leftMargin="20"
              rightMargin="20"
              topMargin="20"
              bottomMargin="20">
  <field name="patient_name" class="java.lang.String"/>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$F{patient_name}]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

// --- JasperReports 4.x+ JRXML with uuid (should REJECT) ---

const JRXML_WITH_UUID = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report1"
              uuid="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
              pageWidth="595"
              pageHeight="842">
  <detail>
    <band height="20"/>
  </detail>
</jasperReport>`;

// --- JasperReports 4.x+ with <propertyExpression> (should REJECT) ---

const JRXML_WITH_PROPERTY_EXPRESSION = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report2"
              pageWidth="595"
              pageHeight="842">
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="100" height="20"/>
        <propertyExpression name="net.sf.jasperreports.export.xls.column.width"><![CDATA[100]]></propertyExpression>
        <textFieldExpression><![CDATA["test"]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

// --- JRXML with styled markup (should REJECT) ---

const JRXML_WITH_STYLED_MARKUP = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report3"
              pageWidth="595"
              pageHeight="842">
  <style name="body" markup="styled" fontSize="10"/>
  <detail><band height="20"/></detail>
</jasperReport>`;

// --- JRXML with NoDataSection (should REJECT) ---

const JRXML_WITH_NO_DATA_SECTION = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report4"
              whenNoDataType="NoDataSection"
              pageWidth="595"
              pageHeight="842">
  <detail><band height="20"/></detail>
</jasperReport>`;

// --- JRXML with Java 8 lambda in expression (should REJECT) ---

const JRXML_WITH_JAVA8 = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report5"
              pageWidth="595"
              pageHeight="842">
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="200" height="20"/>
        <textFieldExpression><![CDATA[$P{items}.stream().filter(x -> x.isActive()).collect(Collectors.toList()).size()]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

// --- JRXML with <genericElement> (should WARN, not reject) ---

const JRXML_WITH_GENERIC_ELEMENT = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report6"
              pageWidth="595"
              pageHeight="842">
  <detail>
    <band height="40">
      <genericElement>
        <reportElement x="0" y="0" width="100" height="30"/>
        <genericElementType namespace="http://example.com" name="widget"/>
      </genericElement>
    </band>
  </detail>
</jasperReport>`;

// --- Not a JRXML file ---

const NOT_JRXML = `<?xml version="1.0"?>
<html><body>Not a jasper report</body></html>`;

// --- JRXML with wrong namespace (should WARN) ---

const JRXML_WRONG_NAMESPACE = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://wrong.namespace.example.com"
              name="report7"
              pageWidth="595"
              pageHeight="842">
  <detail><band height="20"/></detail>
</jasperReport>`;

// --- Multiple rejection signals ---

const JRXML_MULTIPLE_REJECTIONS = `<?xml version="1.0" encoding="UTF-8"?>
<jasperReport xmlns="http://jasperreports.sourceforge.net/jasperreports"
              name="report8"
              uuid="abcdef-1234"
              whenNoDataType="NoDataSection"
              pageWidth="595"
              pageHeight="842">
  <style name="s1" markup="styled"/>
  <detail>
    <band height="20">
      <textField>
        <reportElement x="0" y="0" width="100" height="20"/>
        <textFieldExpression><![CDATA[$P{list}.stream().map(x -> x.getName()).collect(Collectors.toList())]]></textFieldExpression>
      </textField>
    </band>
  </detail>
</jasperReport>`;

// ============================================================
// Tests
// ============================================================

describe("Version Guard — detectVersion", function () {
  it("should pass a valid iReport 3.7.1 JRXML", function () {
    const result = detectVersion(VALID_371_JRXML);
    assert.equal(result.compatible, true);
    assert.equal(result.rejection_reasons.length, 0);
    assert.equal(result.signals.length, 7);
  });

  it("should reject JRXML with uuid attribute", function () {
    const result = detectVersion(JRXML_WITH_UUID);
    assert.equal(result.compatible, false);
    assert.equal(result.rejection_reasons.length, 1);
    assert.ok(result.rejection_reasons[0].includes("uuid"));
  });

  it("should reject JRXML with <propertyExpression> element", function () {
    const result = detectVersion(JRXML_WITH_PROPERTY_EXPRESSION);
    assert.equal(result.compatible, false);
    assert.ok(
      result.rejection_reasons.some(function (r) {
        return r.includes("propertyExpression");
      })
    );
  });

  it("should reject JRXML with styled markup", function () {
    const result = detectVersion(JRXML_WITH_STYLED_MARKUP);
    assert.equal(result.compatible, false);
    assert.ok(
      result.rejection_reasons.some(function (r) {
        return r.includes("styled");
      })
    );
  });

  it("should reject JRXML with NoDataSection", function () {
    const result = detectVersion(JRXML_WITH_NO_DATA_SECTION);
    assert.equal(result.compatible, false);
    assert.ok(
      result.rejection_reasons.some(function (r) {
        return r.includes("NoDataSection");
      })
    );
  });

  it("should reject JRXML with Java 8 lambda/stream syntax", function () {
    const result = detectVersion(JRXML_WITH_JAVA8);
    assert.equal(result.compatible, false);
    const java8Signal = result.signals.find(function (s) {
      return s.signal_id === "VGUARD-006";
    });
    assert.ok(java8Signal);
    assert.equal(java8Signal!.detected, true);
    assert.equal(java8Signal!.action, "reject");
    assert.ok(java8Signal!.detail.includes("stream"));
    assert.ok(java8Signal!.detail.includes("lambda"));
  });

  it("should warn (not reject) on <genericElement>", function () {
    const result = detectVersion(JRXML_WITH_GENERIC_ELEMENT);
    assert.equal(result.compatible, true);
    assert.equal(result.rejection_reasons.length, 0);
    assert.equal(result.warnings.length, 1);
    assert.ok(result.warnings[0].includes("genericElement"));
  });

  it("should reject non-JRXML files", function () {
    const result = detectVersion(NOT_JRXML);
    assert.equal(result.compatible, false);
    assert.equal(result.signals.length, 0);
    assert.ok(result.rejection_reasons[0].includes("ไม่พบ <jasperReport>"));
  });

  it("should warn on wrong namespace", function () {
    const result = detectVersion(JRXML_WRONG_NAMESPACE);
    assert.equal(result.compatible, true);
    assert.ok(
      result.warnings.some(function (w) {
        return w.includes("namespace");
      })
    );
  });

  it("should collect multiple rejection signals", function () {
    const result = detectVersion(JRXML_MULTIPLE_REJECTIONS);
    assert.equal(result.compatible, false);
    assert.ok(result.rejection_reasons.length >= 3);
  });

  it("should return all 7 signals for valid JRXML", function () {
    const result = detectVersion(VALID_371_JRXML);
    assert.equal(result.signals.length, 7);
    const ids = result.signals.map(function (s) {
      return s.signal_id;
    });
    assert.ok(ids.indexOf("VGUARD-001") !== -1);
    assert.ok(ids.indexOf("VGUARD-002") !== -1);
    assert.ok(ids.indexOf("VGUARD-003") !== -1);
    assert.ok(ids.indexOf("VGUARD-004") !== -1);
    assert.ok(ids.indexOf("VGUARD-005") !== -1);
    assert.ok(ids.indexOf("VGUARD-006") !== -1);
    assert.ok(ids.indexOf("VGUARD-007") !== -1);
  });

  it("should have Thai text in all rejection messages", function () {
    const result = detectVersion(JRXML_WITH_UUID);
    for (const reason of result.rejection_reasons) {
      assert.ok(reason.includes("ข้อผิดพลาด"));
      assert.ok(reason.includes("กรุณาใช้ไฟล์ที่สร้างด้วย iReport 3.7.1"));
    }
  });
});

describe("Version Guard — parseRootAttributes", function () {
  it("should extract attributes from jasperReport tag", function () {
    const attrs = parseRootAttributes(VALID_371_JRXML);
    assert.equal(attrs["name"], "patient_summary");
    assert.equal(attrs["pageWidth"], "595");
    assert.equal(attrs["whenNoDataType"], "NoPages");
  });

  it("should return empty object for non-JRXML", function () {
    const attrs = parseRootAttributes(NOT_JRXML);
    assert.equal(Object.keys(attrs).length, 0);
  });
});

describe("Version Guard — isJrxmlFile", function () {
  it("should return true for valid JRXML", function () {
    assert.equal(isJrxmlFile(VALID_371_JRXML), true);
  });

  it("should return false for non-JRXML", function () {
    assert.equal(isJrxmlFile(NOT_JRXML), false);
  });

  it("should return false for empty string", function () {
    assert.equal(isJrxmlFile(""), false);
  });
});
