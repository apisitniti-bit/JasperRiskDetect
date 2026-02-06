import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const WARN_THRESHOLD = 100;
const CRITICAL_THRESHOLD = 200;

export function checkFieldCount(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];
  const count = ast.fields.length;

  if (count >= CRITICAL_THRESHOLD) {
    findings.push({
      check_id: "LAYOUT-008",
      severity: "high",
      message: `Report has ${count} fields (critical threshold: ${CRITICAL_THRESHOLD}). Each field consumes memory per data row.`,
      thai_message: `รายงานมี field ${count} ตัว (เกณฑ์วิกฤต: ${CRITICAL_THRESHOLD}) — แต่ละ field ใช้หน่วยความจำต่อแถวข้อมูล เสี่ยง OutOfMemoryError เมื่อข้อมูลมาก`,
      details: { field_count: count, critical_threshold: CRITICAL_THRESHOLD },
    });
  } else if (count >= WARN_THRESHOLD) {
    findings.push({
      check_id: "LAYOUT-008",
      severity: "medium",
      message: `Report has ${count} fields (warning threshold: ${WARN_THRESHOLD}).`,
      thai_message: `รายงานมี field ${count} ตัว (เกณฑ์เตือน: ${WARN_THRESHOLD}) — ควรลด field ที่ไม่จำเป็นเพื่อลดการใช้หน่วยความจำ`,
      details: { field_count: count, warn_threshold: WARN_THRESHOLD },
    });
  }

  return findings;
}
