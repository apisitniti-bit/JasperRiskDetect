import type { JrxmlAst, JrxmlElement } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

function rectsOverlap(a: JrxmlElement, b: JrxmlElement): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function checkElementOverlap(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  for (const band of ast.bands) {
    const els = band.elements;
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        if (els[i].width === 0 || els[i].height === 0) continue;
        if (els[j].width === 0 || els[j].height === 0) continue;
        if (rectsOverlap(els[i], els[j])) {
          findings.push({
            check_id: "LAYOUT-002",
            severity: "medium",
            message: `Elements overlap in band "${band.type}": ${els[i].type}(${els[i].x},${els[i].y},${els[i].width}x${els[i].height}) and ${els[j].type}(${els[j].x},${els[j].y},${els[j].width}x${els[j].height})`,
            thai_message: `พบ element ทับซ้อนกันในแถบ "${band.type}": ${els[i].type} กับ ${els[j].type} — อาจทำให้ข้อมูลแสดงผลซ้อนทับกัน`,
            band_type: band.type,
            details: {
              element_a: { type: els[i].type, x: els[i].x, y: els[i].y, w: els[i].width, h: els[i].height },
              element_b: { type: els[j].type, x: els[j].x, y: els[j].y, w: els[j].width, h: els[j].height },
            },
          });
        }
      }
    }
  }

  return findings;
}
