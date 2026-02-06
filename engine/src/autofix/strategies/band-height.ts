import type { FixChange, FixContext } from "../types";

const DEFAULT_PAGE_HEIGHT = 842;
const DEFAULT_TOP_MARGIN = 20;
const DEFAULT_BOTTOM_MARGIN = 20;

export function fixBandHeight(
  xml: string,
  lines: string[],
  context: FixContext
): FixChange[] {
  const changes: FixChange[] = [];
  const details = context.details || {};
  const usableHeight =
    typeof details["usable_height"] === "number"
      ? (details["usable_height"] as number)
      : DEFAULT_PAGE_HEIGHT - DEFAULT_TOP_MARGIN - DEFAULT_BOTTOM_MARGIN;

  const bandType = context.band_type || "";

  // Find <band height="NNN"> lines where height exceeds usable
  const bandHeightPattern = /(<band\b[^>]*\bheight\s*=\s*")(\d+)(")/;

  for (let i = 0; i < lines.length; i++) {
    const match = bandHeightPattern.exec(lines[i]);
    if (match === null) continue;

    const currentHeight = parseInt(match[2], 10);
    if (currentHeight <= usableHeight) continue;

    // Only fix if we're in the right band context, or fix all overflows
    if (bandType.length > 0) {
      // Check if this band is within the matching band section
      const sectionFound = findBandSection(lines, i, bandType);
      if (!sectionFound) continue;
    }

    const newHeight = usableHeight;
    const original = lines[i];
    const replacement = original.replace(
      bandHeightPattern,
      "$1" + newHeight + "$3"
    );

    changes.push({
      line_start: i + 1,
      line_end: i + 1,
      original: original,
      replacement: replacement,
    });
  }

  return changes;
}

function findBandSection(lines: string[], lineIndex: number, bandType: string): boolean {
  // Walk backwards to find the enclosing band section tag
  for (let i = lineIndex - 1; i >= 0 && i >= lineIndex - 10; i--) {
    if (lines[i].includes("<" + bandType + ">") || lines[i].includes("<" + bandType + " ")) {
      return true;
    }
    // Stop if we hit another section close
    if (/<\/(title|pageHeader|columnHeader|detail|columnFooter|pageFooter|lastPageFooter|summary|noData|background|groupHeader|groupFooter)>/.test(lines[i])) {
      return false;
    }
  }
  return false;
}
