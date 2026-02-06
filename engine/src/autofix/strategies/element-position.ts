import type { FixChange, FixContext } from "../types";

export function fixElementPosition(
  xml: string,
  lines: string[],
  context: FixContext
): FixChange[] {
  const changes: FixChange[] = [];
  const details = context.details || {};

  // Strategy: fix elements that extend beyond band boundary
  // For element-outside-band: clamp y+height to band height
  // For overlap: not auto-fixable safely (user decides layout)
  // We only handle the "element outside band" case here

  const bandHeight =
    typeof details["band_height"] === "number"
      ? (details["band_height"] as number)
      : 0;

  if (bandHeight <= 0) return changes;

  // Find <reportElement ... y="N" ... height="N" ...> lines
  const reportElementPattern =
    /(<reportElement\b[^>]*\by\s*=\s*")(\d+)("[^>]*\bheight\s*=\s*")(\d+)(")/;
  const reversePattern =
    /(<reportElement\b[^>]*\bheight\s*=\s*")(\d+)("[^>]*\by\s*=\s*")(\d+)(")/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes("reportElement")) continue;

    let y = -1;
    let height = -1;
    let matched = false;
    let useReverse = false;

    const m1 = reportElementPattern.exec(line);
    if (m1 !== null) {
      y = parseInt(m1[2], 10);
      height = parseInt(m1[4], 10);
      matched = true;
    }

    if (!matched) {
      const m2 = reversePattern.exec(line);
      if (m2 !== null) {
        height = parseInt(m2[2], 10);
        y = parseInt(m2[4], 10);
        matched = true;
        useReverse = true;
      }
    }

    if (!matched) continue;
    if (y + height <= bandHeight) continue;

    // Clamp: reduce height so y+height = bandHeight
    const newHeight = Math.max(1, bandHeight - y);
    if (newHeight >= height) continue;

    const original = line;
    let replacement: string;

    if (useReverse) {
      replacement = original.replace(
        reversePattern,
        "$1" + newHeight + "$3$4$5"
      );
    } else {
      replacement = original.replace(
        reportElementPattern,
        "$1$2$3" + newHeight + "$5"
      );
    }

    if (replacement !== original) {
      changes.push({
        line_start: i + 1,
        line_end: i + 1,
        original: original,
        replacement: replacement,
      });
    }
  }

  return changes;
}
