import type { Finding } from "../rule-engine/types";
import type { CompileResponse, CompileError, BridgeResult } from "./protocol";

const ERROR_TYPE_THAI: Record<string, string> = {
  COMPILE_ERROR: "ข้อผิดพลาดขณะ compile",
  UNRESOLVED_SYMBOL: "ไม่พบ symbol ที่อ้างอิง",
  UNRESOLVED_FIELD: "ไม่พบ field ที่อ้างอิง",
  UNRESOLVED_VARIABLE: "ไม่พบ variable ที่อ้างอิง",
  SYNTAX_ERROR: "syntax ผิดพลาดใน expression",
  VERSION_REJECTED: "เวอร์ชันไม่รองรับ",
  INPUT_ERROR: "ข้อผิดพลาดข้อมูลนำเข้า",
  SECURITY_VIOLATION: "ละเมิดนโยบายความปลอดภัย",
  UNEXPECTED_ERROR: "ข้อผิดพลาดที่ไม่คาดคิด",
};

function thaiErrorType(type: string): string {
  return ERROR_TYPE_THAI[type] || "ข้อผิดพลาดขณะ compile";
}

function severityFromType(type: string): "critical" | "high" | "medium" {
  if (type === "VERSION_REJECTED" || type === "SECURITY_VIOLATION") return "critical";
  if (type === "UNRESOLVED_FIELD" || type === "UNRESOLVED_VARIABLE") return "high";
  return "high";
}

export function parseCompileErrors(compileError: CompileError): Finding {
  return {
    rule_id: "COMPILE-" + compileError.type,
    severity: severityFromType(compileError.type),
    category: "compile",
    line: compileError.line || undefined,
    column: compileError.column || undefined,
    element: compileError.expression || undefined,
    message: compileError.message,
    thai: {
      title: thaiErrorType(compileError.type),
      cause: compileError.message,
      impact: "ไม่สามารถ compile รายงานได้ — รายงานจะใช้งานไม่ได้",
      fix: compileError.expression
        ? "ตรวจสอบ expression: " + compileError.expression
        : "ตรวจสอบไฟล์ JRXML ตามบรรทัดที่ระบุ",
    },
    risk_weight: severityFromType(compileError.type) === "critical" ? 25 : 15,
  };
}

export function parseBridgeResult(bridgeResult: BridgeResult): Finding[] {
  const findings: Finding[] = [];

  // Handle bridge-level errors (spawn failure, timeout)
  if (bridgeResult.error !== null) {
    findings.push({
      rule_id: "COMPILE-BRIDGE_ERROR",
      severity: "critical",
      category: "compile",
      message: bridgeResult.error,
      thai: {
        title: bridgeResult.timedOut ? "compile หมดเวลา" : "ข้อผิดพลาด compile bridge",
        cause: bridgeResult.error,
        impact: "ไม่สามารถทดสอบ compile ได้ — ไม่มีผลลัพธ์จาก Java compiler",
        fix: bridgeResult.timedOut
          ? "รายงานซับซ้อนเกินไป — ลด element หรือ expression ที่ซับซ้อน"
          : "ตรวจสอบว่า Java Runtime และ compiler JAR ติดตั้งถูกต้อง",
      },
      risk_weight: 25,
    });
    return findings;
  }

  const response = bridgeResult.response;
  if (response === null) return findings;

  // Parse compile errors
  for (const err of response.errors) {
    findings.push(parseCompileErrors(err));
  }

  // Parse warnings as low-severity findings
  for (const warn of response.warnings) {
    findings.push({
      rule_id: "COMPILE-WARNING",
      severity: "low",
      category: "compile",
      message: warn.message,
      thai: {
        title: "คำเตือนจาก compiler",
        cause: warn.message,
        impact: "รายงาน compile ได้ แต่อาจมีปัญหาเล็กน้อย",
        fix: "ตรวจสอบคำเตือนและแก้ไขถ้าจำเป็น",
      },
      risk_weight: 5,
    });
  }

  return findings;
}
