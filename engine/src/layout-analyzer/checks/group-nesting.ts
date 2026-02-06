import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const MAX_GROUP_DEPTH = 5;

export function checkGroupNesting(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];
  const depth = ast.groups.length;

  if (depth > MAX_GROUP_DEPTH) {
    findings.push({
      check_id: "LAYOUT-010",
      severity: "high",
      message: `Report has ${depth} group levels (threshold: ${MAX_GROUP_DEPTH}). Each group level multiplies memory usage.`,
      thai_message: `รายงานมีกลุ่มซ้อน ${depth} ชั้น (เกณฑ์: ${MAX_GROUP_DEPTH}) — แต่ละชั้นเพิ่มการใช้หน่วยความจำเป็นทวีคูณ`,
      details: {
        group_count: depth,
        threshold: MAX_GROUP_DEPTH,
        group_names: ast.groups.map(function (g) { return g.name; }),
      },
    });
  }

  return findings;
}
