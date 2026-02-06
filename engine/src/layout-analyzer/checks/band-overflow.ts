import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";
import { getElementLabel } from "./element-label";

export function checkBandOverflow(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];
  const usableHeight = ast.page.height - ast.page.topMargin - ast.page.bottomMargin;

  for (const band of ast.bands) {
    if (band.height > usableHeight) {
      const elNames = band.elements.map((e) => getElementLabel(e));
      findings.push({
        check_id: "LAYOUT-001",
        severity: "critical",
        message: `Band "${band.type}" height (${band.height}) exceeds usable page height (${usableHeight})`,
        thai_message: `แถบ "${band.type}" มีความสูง ${band.height} px เกินพื้นที่ใช้งานของหน้า ${usableHeight} px (หน้า ${ast.page.height} - margin ${ast.page.topMargin}+${ast.page.bottomMargin})`,
        band_type: band.type,
        element_name: elNames.slice(0, 3).join(", ") + (elNames.length > 3 ? ` +${elNames.length - 3}` : ""),
        details: {
          band_height: band.height,
          usable_height: usableHeight,
          page_height: ast.page.height,
          top_margin: ast.page.topMargin,
          bottom_margin: ast.page.bottomMargin,
          elements: elNames,
        },
      });
    }
  }

  for (const group of ast.groups) {
    const allBands = [...group.headerBands, ...group.footerBands];
    for (const band of allBands) {
      if (band.height > usableHeight) {
        const elNames = band.elements.map((e) => getElementLabel(e));
        findings.push({
          check_id: "LAYOUT-001",
          severity: "critical",
          message: `Group "${group.name}" band "${band.type}" height (${band.height}) exceeds usable page height (${usableHeight})`,
          thai_message: `แถบ "${band.type}" ของกลุ่ม "${group.name}" มีความสูง ${band.height} px เกินพื้นที่ใช้งานของหน้า ${usableHeight} px`,
          band_type: band.type,
          element_name: elNames.slice(0, 3).join(", ") + (elNames.length > 3 ? ` +${elNames.length - 3}` : ""),
          details: {
            group_name: group.name,
            band_height: band.height,
            usable_height: usableHeight,
            elements: elNames,
          },
        });
      }
    }
  }

  return findings;
}
