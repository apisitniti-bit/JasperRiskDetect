import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const MAX_SAFE_DEPTH = 3;

export function checkSubreportDepth(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  if (ast.subreports.length === 0) return findings;

  // Static analysis can only detect depth=1 from this file.
  // Multiple subreports in the same report multiply memory.
  const count = ast.subreports.length;

  if (count > MAX_SAFE_DEPTH) {
    findings.push({
      check_id: "LAYOUT-004",
      severity: "high",
      message: `Report contains ${count} subreport elements (threshold: ${MAX_SAFE_DEPTH}). Each subreport multiplies memory usage.`,
      thai_message: `รายงานมี subreport ${count} ตัว (เกณฑ์: ${MAX_SAFE_DEPTH}) — แต่ละ subreport เพิ่มการใช้หน่วยความจำเป็นทวีคูณ เสี่ยง Stack Overflow หรือ Heap Exhaustion`,
      details: {
        subreport_count: count,
        threshold: MAX_SAFE_DEPTH,
        subreports: ast.subreports.map(function (s) {
          return { expression: s.expression, band: s.bandType };
        }),
      },
    });
  } else if (count > 0) {
    findings.push({
      check_id: "LAYOUT-004",
      severity: "info",
      message: `Report contains ${count} subreport element(s). Monitor memory if subreports are nested further.`,
      thai_message: `รายงานมี subreport ${count} ตัว — ควรตรวจสอบว่า subreport ไม่มีการซ้อนลึกเกิน ${MAX_SAFE_DEPTH} ชั้น`,
      details: {
        subreport_count: count,
        threshold: MAX_SAFE_DEPTH,
        subreports: ast.subreports.map(function (s) {
          return { expression: s.expression, band: s.bandType };
        }),
      },
    });
  }

  return findings;
}
