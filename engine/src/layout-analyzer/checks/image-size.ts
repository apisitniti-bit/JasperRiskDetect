import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const MAX_EMBEDDED_IMAGE_KB = 500;

export function checkImageSize(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  for (const band of ast.bands) {
    for (const el of band.elements) {
      if (el.type !== "image") continue;
      const expr = el.imageExpression || "";

      // Detect embedded base64 images
      if (!expr.includes("base64") && !isBase64DataUri(expr)) continue;

      const sizeKB = estimateBase64SizeKB(expr);

      if (sizeKB > MAX_EMBEDDED_IMAGE_KB) {
        findings.push({
          check_id: "LAYOUT-005",
          severity: "high",
          message: `Embedded base64 image in band "${band.type}" is ~${sizeKB} KB (threshold: ${MAX_EMBEDDED_IMAGE_KB} KB)`,
          thai_message: `พบรูปภาพแบบ base64 ฝังในแถบ "${band.type}" ขนาดประมาณ ${sizeKB} KB (เกณฑ์: ${MAX_EMBEDDED_IMAGE_KB} KB) — จะใช้หน่วยความจำมากทุกหน้าที่พิมพ์`,
          band_type: band.type,
          details: { estimated_size_kb: sizeKB, threshold_kb: MAX_EMBEDDED_IMAGE_KB },
        });
      }
    }
  }

  return findings;
}

function isBase64DataUri(expr: string): boolean {
  return /data:\s*image\/[^;]+;\s*base64\s*,/.test(expr);
}

function estimateBase64SizeKB(expr: string): number {
  // Base64 uses ~4/3 ratio. Estimate from string length.
  // Remove non-base64 wrapper characters for estimation.
  const base64Match = expr.match(/base64\s*,?\s*([A-Za-z0-9+/=\s]+)/);
  if (base64Match) {
    const raw = base64Match[1].replace(/\s/g, "");
    return Math.round((raw.length * 3) / 4 / 1024);
  }
  // Fallback: estimate from total expression length
  return Math.round((expr.length * 3) / 4 / 1024);
}
