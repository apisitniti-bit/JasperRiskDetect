import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const NON_DETAIL_BANDS = [
  "title",
  "pageHeader",
  "columnHeader",
  "columnFooter",
  "pageFooter",
  "lastPageFooter",
  "summary",
  "noData",
  "background",
  "groupHeader",
  "groupFooter",
];

export function checkOverflowOutsideDetail(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  for (const band of ast.bands) {
    if (band.type === "detail") continue;

    for (const el of band.elements) {
      if (el.isPrintWhenDetailOverflows) {
        findings.push({
          check_id: "LAYOUT-027",
          severity: "critical",
          message: `Element "${el.type}" in "${band.type}" band has isPrintWhenDetailOverflows="true" — risk of Java Heap Space`,
          thai_message: `Element "${el.type}" ใน Band "${band.type}" ตั้งค่า isPrintWhenDetailOverflows="true" — Band นี้ไม่มีกลไก pagination เสี่ยง Java Heap Space อย่างร้ายแรง`,
          band_type: band.type,
          element_index: band.elements.indexOf(el),
          details: {
            element_type: el.type,
            element_position: { x: el.x, y: el.y, width: el.width, height: el.height },
            band_type: band.type,
            risk: "isPrintWhenDetailOverflows outside detail band causes unbounded memory growth — no pagination to break overflow, leading to Java Heap Space crash",
          },
        });
      }
    }
  }

  // Also check group bands
  for (const group of ast.groups) {
    const allBands = [...group.headerBands, ...group.footerBands];
    for (const band of allBands) {
      for (const el of band.elements) {
        if (el.isPrintWhenDetailOverflows) {
          findings.push({
            check_id: "LAYOUT-027",
            severity: "critical",
            message: `Element "${el.type}" in group "${group.name}" ${band.type} has isPrintWhenDetailOverflows="true" — risk of Java Heap Space`,
            thai_message: `Element "${el.type}" ใน ${band.type} ของกลุ่ม "${group.name}" ตั้งค่า isPrintWhenDetailOverflows="true" — เสี่ยง Java Heap Space เนื่องจากไม่มีกลไก pagination`,
            band_type: band.type,
            element_index: band.elements.indexOf(el),
            details: {
              element_type: el.type,
              group_name: group.name,
              band_type: band.type,
              risk: "isPrintWhenDetailOverflows in group band causes unbounded memory growth",
            },
          });
        }
      }
    }
  }

  return findings;
}
