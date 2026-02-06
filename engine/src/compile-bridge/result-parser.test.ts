import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseBridgeResult, parseCompileErrors } from "./result-parser";
import type { BridgeResult, CompileError } from "./protocol";

describe("Compile Bridge — parseCompileErrors", function () {
  it("should convert a CompileError to a Finding", function () {
    const err: CompileError = {
      type: "UNRESOLVED_FIELD",
      line: 42,
      column: 15,
      message: "Cannot resolve symbol: $F{unknownField}",
      expression: "$F{unknownField}.toString()",
    };
    const finding = parseCompileErrors(err);
    assert.equal(finding.rule_id, "COMPILE-UNRESOLVED_FIELD");
    assert.equal(finding.severity, "high");
    assert.equal(finding.category, "compile");
    assert.equal(finding.line, 42);
    assert.equal(finding.column, 15);
    assert.ok(finding.thai.title.includes("field"));
    assert.ok(finding.thai.fix.includes("expression"));
  });

  it("should set critical severity for VERSION_REJECTED", function () {
    const err: CompileError = {
      type: "VERSION_REJECTED",
      line: 0,
      column: 0,
      message: "JRXML contains 'uuid' attribute",
      expression: "",
    };
    const finding = parseCompileErrors(err);
    assert.equal(finding.severity, "critical");
    assert.equal(finding.risk_weight, 25);
  });
});

describe("Compile Bridge — parseBridgeResult", function () {
  it("should return bridge error finding on spawn failure", function () {
    const result: BridgeResult = {
      response: null,
      timedOut: false,
      exitCode: null,
      stderr: "",
      error: "Failed to spawn Java process: ENOENT",
    };
    const findings = parseBridgeResult(result);
    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule_id, "COMPILE-BRIDGE_ERROR");
    assert.equal(findings[0].severity, "critical");
    assert.ok(findings[0].thai.fix.includes("Java Runtime"));
  });

  it("should return timeout finding when process timed out", function () {
    const result: BridgeResult = {
      response: null,
      timedOut: true,
      exitCode: null,
      stderr: "",
      error: "Compile timed out after 30000ms — process killed",
    };
    const findings = parseBridgeResult(result);
    assert.equal(findings.length, 1);
    assert.ok(findings[0].thai.title.includes("หมดเวลา"));
    assert.ok(findings[0].thai.fix.includes("ลด element"));
  });

  it("should parse successful compile with no errors", function () {
    const result: BridgeResult = {
      response: {
        success: true,
        errors: [],
        warnings: [],
        metrics: { compileTimeMs: 500, estimatedMemoryMB: 20 },
      },
      timedOut: false,
      exitCode: 0,
      stderr: "",
      error: null,
    };
    const findings = parseBridgeResult(result);
    assert.equal(findings.length, 0);
  });

  it("should parse compile response with errors", function () {
    const result: BridgeResult = {
      response: {
        success: false,
        errors: [
          {
            type: "COMPILE_ERROR",
            line: 10,
            column: 5,
            message: "Some compile error",
            expression: "$F{foo}",
          },
          {
            type: "SYNTAX_ERROR",
            line: 20,
            column: 1,
            message: "Syntax error in expression",
            expression: "$F{bar",
          },
        ],
        warnings: [
          { type: "DEPRECATION", message: "Deprecated API usage" },
        ],
        metrics: { compileTimeMs: 1200, estimatedMemoryMB: 45 },
      },
      timedOut: false,
      exitCode: 0,
      stderr: "",
      error: null,
    };
    const findings = parseBridgeResult(result);
    // 2 errors + 1 warning = 3 findings
    assert.equal(findings.length, 3);
    assert.equal(findings[0].rule_id, "COMPILE-COMPILE_ERROR");
    assert.equal(findings[1].rule_id, "COMPILE-SYNTAX_ERROR");
    assert.equal(findings[2].rule_id, "COMPILE-WARNING");
    assert.equal(findings[2].severity, "low");
  });

  it("should return empty findings for null response and no error", function () {
    const result: BridgeResult = {
      response: null,
      timedOut: false,
      exitCode: 0,
      stderr: "",
      error: null,
    };
    const findings = parseBridgeResult(result);
    assert.equal(findings.length, 0);
  });
});
