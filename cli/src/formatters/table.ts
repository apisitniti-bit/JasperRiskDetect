import type { FileResult } from "../types";

const LEVEL_SYMBOL: Record<string, string> = {
  LOW: "[OK]",
  MEDIUM: "[!!]",
  HIGH: "[**]",
  CRITICAL: "[XX]",
};

export function formatTable(files: FileResult[], threshold: number): string {
  const lines: string[] = [];

  const pathWidth = Math.max(20, ...files.map((f) => f.path.length));
  const header =
    pad("File", pathWidth) +
    pad("Layout", 8) +
    pad("Compile", 9) +
    pad("Final", 7) +
    pad("Level", 12) +
    "Status";
  const sep = "-".repeat(header.length);

  lines.push(sep);
  lines.push(header);
  lines.push(sep);

  for (const f of files) {
    if (f.error) {
      lines.push(pad(f.path, pathWidth) + "  ERROR: " + f.error);
      continue;
    }
    if (!f.version_compatible) {
      lines.push(
        pad(f.path, pathWidth) + "  REJECTED: " + (f.version_rejection || "version incompatible")
      );
      continue;
    }
    const status = f.final_score >= threshold ? "FAIL" : "PASS";
    lines.push(
      pad(f.path, pathWidth) +
        pad(String(f.layout_score), 8) +
        pad(String(f.compile_score), 9) +
        pad(String(f.final_score), 7) +
        pad(LEVEL_SYMBOL[f.risk_level] + " " + f.risk_level, 12) +
        status
    );
  }

  lines.push(sep);

  const passed = files.filter((f) => f.final_score < threshold && f.version_compatible && !f.error).length;
  const failed = files.length - passed;
  lines.push(`Total: ${files.length}  Passed: ${passed}  Failed: ${failed}  Threshold: ${threshold}`);

  return lines.join("\n");
}

function pad(s: string, width: number): string {
  if (s.length >= width) return s + "  ";
  return s + " ".repeat(width - s.length) + "  ";
}
