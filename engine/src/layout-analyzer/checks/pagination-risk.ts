import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const ASSUMED_MAX_ROWS = 10_000;
const MEMORY_PER_ROW_BYTE = 512;
const WARN_THRESHOLD_MB = 128;
const CRITICAL_THRESHOLD_MB = 256;

export function checkPaginationRisk(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  const detailBands = ast.bands.filter(function (b) {
    return b.type === "detail";
  });

  if (detailBands.length === 0) return findings;

  for (const detail of detailBands) {
    if (detail.height === 0) continue;

    const usableHeight = ast.page.height - ast.page.topMargin - ast.page.bottomMargin;
    const rowsPerPage = usableHeight > 0 ? Math.floor(usableHeight / detail.height) : 1;
    const estimatedPages = rowsPerPage > 0 ? Math.ceil(ASSUMED_MAX_ROWS / rowsPerPage) : ASSUMED_MAX_ROWS;
    const elementsPerRow = detail.elements.length;
    const estimatedMemoryMB = Math.round(
      (ASSUMED_MAX_ROWS * elementsPerRow * MEMORY_PER_ROW_BYTE) / (1024 * 1024)
    );

    if (estimatedMemoryMB >= CRITICAL_THRESHOLD_MB) {
      findings.push({
        check_id: "LAYOUT-006",
        severity: "critical",
        message: `Pagination risk: detail band (${detail.height}px, ${elementsPerRow} elements) × ${ASSUMED_MAX_ROWS} rows ≈ ${estimatedMemoryMB} MB (${estimatedPages} pages)`,
        thai_message: `ความเสี่ยงด้านหน้ากระดาษ: แถบ detail (สูง ${detail.height}px, ${elementsPerRow} elements) × ${ASSUMED_MAX_ROWS} แถว ≈ ${estimatedMemoryMB} MB — เกินเกณฑ์วิกฤต ${CRITICAL_THRESHOLD_MB} MB เสี่ยง Java Heap Space`,
        band_type: "detail",
        details: {
          detail_height: detail.height,
          elements_per_row: elementsPerRow,
          assumed_rows: ASSUMED_MAX_ROWS,
          estimated_pages: estimatedPages,
          estimated_memory_mb: estimatedMemoryMB,
          rows_per_page: rowsPerPage,
        },
      });
    } else if (estimatedMemoryMB >= WARN_THRESHOLD_MB) {
      findings.push({
        check_id: "LAYOUT-006",
        severity: "high",
        message: `Pagination risk: detail band (${detail.height}px, ${elementsPerRow} elements) × ${ASSUMED_MAX_ROWS} rows ≈ ${estimatedMemoryMB} MB (${estimatedPages} pages)`,
        thai_message: `ความเสี่ยงด้านหน้ากระดาษ: แถบ detail (สูง ${detail.height}px, ${elementsPerRow} elements) × ${ASSUMED_MAX_ROWS} แถว ≈ ${estimatedMemoryMB} MB — เกินเกณฑ์เตือน ${WARN_THRESHOLD_MB} MB`,
        band_type: "detail",
        details: {
          detail_height: detail.height,
          elements_per_row: elementsPerRow,
          assumed_rows: ASSUMED_MAX_ROWS,
          estimated_pages: estimatedPages,
          estimated_memory_mb: estimatedMemoryMB,
          rows_per_page: rowsPerPage,
        },
      });
    }
  }

  return findings;
}
