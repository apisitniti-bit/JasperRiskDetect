import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatJson } from "./formatters/json";
import { formatTable } from "./formatters/table";
import { formatThai } from "./formatters/thai";
import type { FileResult } from "./types";

const MOCK_FINDING = {
  rule_id: "LAYOUT-001",
  severity: "critical" as const,
  category: "layout" as const,
  line: 10,
  message: "Band overflow",
  thai: {
    title: "แถบสูงเกินหน้ากระดาษ",
    cause: "ความสูง Band มากเกินไป",
    impact: "Java Heap Space error",
    fix: "ลดความสูง Band",
  },
  risk_weight: 25,
};

const PASS_FILE: FileResult = {
  path: "reports/safe.jrxml",
  version_compatible: true,
  layout_score: 15,
  compile_score: 0,
  final_score: 15,
  risk_level: "LOW",
  findings: [MOCK_FINDING],
};

const FAIL_FILE: FileResult = {
  path: "reports/risky.jrxml",
  version_compatible: true,
  layout_score: 90,
  compile_score: 25,
  final_score: 90,
  risk_level: "CRITICAL",
  findings: [MOCK_FINDING, MOCK_FINDING, MOCK_FINDING, MOCK_FINDING],
};

const REJECTED_FILE: FileResult = {
  path: "reports/v5.jrxml",
  version_compatible: false,
  version_rejection: "JRXML contains uuid attribute",
  layout_score: 0,
  compile_score: 0,
  final_score: 0,
  risk_level: "CRITICAL",
  findings: [],
};

const ERROR_FILE: FileResult = {
  path: "reports/broken.jrxml",
  version_compatible: false,
  layout_score: 0,
  compile_score: 0,
  final_score: 0,
  risk_level: "LOW",
  findings: [],
  error: "XML parse error",
};

// ============================================================
// JSON Formatter Tests
// ============================================================

describe("JSON Formatter", function () {
  it("should produce valid JSON with correct schema", function () {
    const output = formatJson([PASS_FILE, FAIL_FILE], 80);
    const parsed = JSON.parse(output);

    assert.equal(parsed.version, "1.0.0");
    assert.ok(parsed.timestamp);
    assert.equal(parsed.files.length, 2);
    assert.equal(parsed.summary.total_files, 2);
    assert.equal(parsed.summary.passed, 1);
    assert.equal(parsed.summary.failed, 1);
    assert.equal(parsed.summary.threshold, 80);
    assert.equal(parsed.summary.max_score, 90);
  });

  it("should include findings_count per severity", function () {
    const output = formatJson([FAIL_FILE], 80);
    const parsed = JSON.parse(output);
    const file = parsed.files[0];

    assert.equal(file.findings_count.critical, 4);
    assert.equal(file.findings_count.high, 0);
    assert.equal(file.risk_level, "CRITICAL");
  });

  it("should show rejected version_check", function () {
    const output = formatJson([REJECTED_FILE], 80);
    const parsed = JSON.parse(output);

    assert.equal(parsed.files[0].version_check, "rejected");
  });
});

// ============================================================
// Table Formatter Tests
// ============================================================

describe("Table Formatter", function () {
  it("should produce table with header and separator", function () {
    const output = formatTable([PASS_FILE], 80);
    assert.ok(output.includes("File"));
    assert.ok(output.includes("Layout"));
    assert.ok(output.includes("Compile"));
    assert.ok(output.includes("Final"));
    assert.ok(output.includes("PASS"));
  });

  it("should show FAIL for high-risk files", function () {
    const output = formatTable([FAIL_FILE], 80);
    assert.ok(output.includes("FAIL"));
    assert.ok(output.includes("[XX] CRITICAL"));
  });

  it("should show REJECTED for version-incompatible files", function () {
    const output = formatTable([REJECTED_FILE], 80);
    assert.ok(output.includes("REJECTED"));
  });

  it("should show summary line", function () {
    const output = formatTable([PASS_FILE, FAIL_FILE], 80);
    assert.ok(output.includes("Total: 2"));
    assert.ok(output.includes("Passed: 1"));
    assert.ok(output.includes("Failed: 1"));
  });
});

// ============================================================
// Thai Formatter Tests
// ============================================================

describe("Thai Formatter", function () {
  it("should output Thai header", function () {
    const output = formatThai([PASS_FILE], 80);
    assert.ok(output.includes("ผลการวิเคราะห์ความเสี่ยง"));
  });

  it("should show Thai risk level label", function () {
    const output = formatThai([PASS_FILE], 80);
    assert.ok(output.includes("ต่ำ"));
    assert.ok(output.includes("ผ่าน"));
  });

  it("should show Thai finding details", function () {
    const output = formatThai([PASS_FILE], 80);
    assert.ok(output.includes("ปัญหา:"));
    assert.ok(output.includes("สาเหตุ:"));
    assert.ok(output.includes("ผลกระทบ:"));
    assert.ok(output.includes("วิธีแก้:"));
    assert.ok(output.includes("แถบสูงเกินหน้ากระดาษ"));
  });

  it("should show fail for high-risk files", function () {
    const output = formatThai([FAIL_FILE], 80);
    assert.ok(output.includes("ไม่ผ่าน"));
    assert.ok(output.includes("วิกฤต"));
  });

  it("should show version rejection in Thai", function () {
    const output = formatThai([REJECTED_FILE], 80);
    assert.ok(output.includes("เวอร์ชันไม่รองรับ"));
  });

  it("should show summary in Thai", function () {
    const output = formatThai([PASS_FILE, FAIL_FILE], 80);
    assert.ok(output.includes("สรุป:"));
    assert.ok(output.includes("ไฟล์ทั้งหมด 2"));
    assert.ok(output.includes("ผ่าน 1"));
    assert.ok(output.includes("ไม่ผ่าน 1"));
  });
});

// ============================================================
// Exit Code Tests
// ============================================================

describe("Exit Codes", function () {
  it("should define correct exit code values", function () {
    const { EXIT_OK, EXIT_RISK_EXCEEDED, EXIT_ERROR, EXIT_VERSION_REJECTED } = require("./types");
    assert.equal(EXIT_OK, 0);
    assert.equal(EXIT_RISK_EXCEEDED, 1);
    assert.equal(EXIT_ERROR, 2);
    assert.equal(EXIT_VERSION_REJECTED, 3);
  });
});

// ============================================================
// Types Tests
// ============================================================

describe("CLI Types", function () {
  it("should FileResult have all required fields", function () {
    const result: FileResult = {
      path: "test.jrxml",
      version_compatible: true,
      layout_score: 0,
      compile_score: 0,
      final_score: 0,
      risk_level: "LOW",
      findings: [],
    };
    assert.equal(result.path, "test.jrxml");
    assert.equal(result.version_compatible, true);
    assert.equal(result.risk_level, "LOW");
  });
});
