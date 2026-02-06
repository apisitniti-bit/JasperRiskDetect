import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const MEMORY_PER_ELEMENT_KB: Record<string, number> = {
  staticText: 2,
  textField: 4,
  image: 50,
  subreport: 100,
  chart: 80,
  crosstab: 60,
  frame: 3,
  line: 1,
  rectangle: 1,
  ellipse: 1,
  componentElement: 10,
  genericElement: 10,
  break: 1,
};

const WARN_THRESHOLD_KB = 50_000;
const CRITICAL_THRESHOLD_KB = 100_000;

export function checkMemoryEstimation(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  let totalKB = 0;
  const breakdown: Record<string, { count: number; kb: number }> = {};

  for (const band of ast.bands) {
    for (const el of band.elements) {
      const perEl = MEMORY_PER_ELEMENT_KB[el.type] || 5;
      totalKB += perEl;
      if (!breakdown[el.type]) {
        breakdown[el.type] = { count: 0, kb: 0 };
      }
      breakdown[el.type].count += 1;
      breakdown[el.type].kb += perEl;
    }
  }

  for (const group of ast.groups) {
    for (const b of [...group.headerBands, ...group.footerBands]) {
      for (const el of b.elements) {
        const perEl = MEMORY_PER_ELEMENT_KB[el.type] || 5;
        totalKB += perEl;
        if (!breakdown[el.type]) {
          breakdown[el.type] = { count: 0, kb: 0 };
        }
        breakdown[el.type].count += 1;
        breakdown[el.type].kb += perEl;
      }
    }
  }

  if (totalKB >= CRITICAL_THRESHOLD_KB) {
    findings.push({
      check_id: "LAYOUT-003",
      severity: "critical",
      message: `Estimated memory per page: ${totalKB} KB (${ast.totalElementCount} elements) exceeds critical threshold ${CRITICAL_THRESHOLD_KB} KB`,
      thai_message: `ประมาณการใช้หน่วยความจำต่อหน้า: ${totalKB} KB (${ast.totalElementCount} elements) เกินเกณฑ์วิกฤต ${CRITICAL_THRESHOLD_KB} KB — เสี่ยง OutOfMemoryError`,
      details: { estimated_kb: totalKB, element_count: ast.totalElementCount, breakdown },
    });
  } else if (totalKB >= WARN_THRESHOLD_KB) {
    findings.push({
      check_id: "LAYOUT-003",
      severity: "high",
      message: `Estimated memory per page: ${totalKB} KB (${ast.totalElementCount} elements) exceeds warning threshold ${WARN_THRESHOLD_KB} KB`,
      thai_message: `ประมาณการใช้หน่วยความจำต่อหน้า: ${totalKB} KB (${ast.totalElementCount} elements) เกินเกณฑ์เตือน ${WARN_THRESHOLD_KB} KB — อาจมีปัญหาเมื่อข้อมูลมาก`,
      details: { estimated_kb: totalKB, element_count: ast.totalElementCount, breakdown },
    });
  }

  return findings;
}
