import type { FixChange, FixContext } from "../types";

export function fixStretchOverflow(
  xml: string,
  lines: string[],
  context: FixContext
): FixChange[] {
  const changes: FixChange[] = [];

  // Find <textField> blocks and check their <reportElement> for stretchType
  let insideTextField = false;
  let textFieldStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("<textField") && !line.includes("<textFieldExpression")) {
      insideTextField = true;
      textFieldStartLine = i;

      // If <textField> already has isStretchWithOverflow, skip
      if (line.includes("isStretchWithOverflow")) {
        insideTextField = false;
        continue;
      }

      // Add isStretchWithOverflow="true" to the <textField> tag
      if (line.includes(">")) {
        // Tag closes on this line
        const original = line;
        const replacement = line.replace(
          /(<textField\b)/,
          '$1 isStretchWithOverflow="true"'
        );
        if (replacement !== original) {
          changes.push({
            line_start: i + 1,
            line_end: i + 1,
            original: original,
            replacement: replacement,
          });
        }
        insideTextField = false;
      }
      continue;
    }

    // Handle multi-line <textField ...> tag
    if (insideTextField && line.includes(">")) {
      if (!lines.slice(textFieldStartLine, i + 1).join("").includes("isStretchWithOverflow")) {
        const original = lines[textFieldStartLine];
        const replacement = original.replace(
          /(<textField\b)/,
          '$1 isStretchWithOverflow="true"'
        );
        if (replacement !== original) {
          changes.push({
            line_start: textFieldStartLine + 1,
            line_end: textFieldStartLine + 1,
            original: original,
            replacement: replacement,
          });
        }
      }
      insideTextField = false;
    }

    if (line.includes("</textField>")) {
      insideTextField = false;
    }
  }

  return changes;
}
