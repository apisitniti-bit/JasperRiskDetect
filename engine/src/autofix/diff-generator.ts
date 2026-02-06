import type { FixChange } from "./types";

export function generateUnifiedDiff(
  originalLines: string[],
  changes: FixChange[],
  filename: string
): string {
  if (changes.length === 0) return "";

  // Sort changes by line_start
  const sorted = changes.slice().sort(function (a, b) {
    return a.line_start - b.line_start;
  });

  const diffLines: string[] = [];
  diffLines.push("--- a/" + filename);
  diffLines.push("+++ b/" + filename);

  // Group nearby changes into hunks (context: 3 lines)
  const CONTEXT = 3;
  const hunks = groupIntoHunks(sorted, CONTEXT, originalLines.length);

  for (const hunk of hunks) {
    const hunkChanges = hunk.changes;
    const startLine = Math.max(1, hunk.startLine - CONTEXT);
    const endLine = Math.min(originalLines.length, hunk.endLine + CONTEXT);

    // Build hunk content
    const removeLines: string[] = [];
    const addLines: string[] = [];

    // Create a change map for quick lookup
    const changeMap = new Map<number, FixChange>();
    for (const c of hunkChanges) {
      changeMap.set(c.line_start, c);
    }

    let removeCount = 0;
    let addCount = 0;

    const hunkContent: string[] = [];
    for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
      const change = changeMap.get(lineNum);
      if (change) {
        hunkContent.push("-" + change.original);
        hunkContent.push("+" + change.replacement);
        removeCount++;
        addCount++;
      } else {
        const contextLine = originalLines[lineNum - 1] || "";
        hunkContent.push(" " + contextLine);
        removeCount++;
        addCount++;
      }
    }

    diffLines.push(
      "@@ -" + startLine + "," + removeCount + " +" + startLine + "," + addCount + " @@"
    );
    for (const line of hunkContent) {
      diffLines.push(line);
    }
  }

  return diffLines.join("\n");
}

interface Hunk {
  startLine: number;
  endLine: number;
  changes: FixChange[];
}

function groupIntoHunks(
  sortedChanges: FixChange[],
  context: number,
  totalLines: number
): Hunk[] {
  if (sortedChanges.length === 0) return [];

  const hunks: Hunk[] = [];
  let currentHunk: Hunk = {
    startLine: sortedChanges[0].line_start,
    endLine: sortedChanges[0].line_end,
    changes: [sortedChanges[0]],
  };

  for (let i = 1; i < sortedChanges.length; i++) {
    const change = sortedChanges[i];
    // Merge if within context distance
    if (change.line_start <= currentHunk.endLine + context * 2 + 1) {
      currentHunk.endLine = Math.max(currentHunk.endLine, change.line_end);
      currentHunk.changes.push(change);
    } else {
      hunks.push(currentHunk);
      currentHunk = {
        startLine: change.line_start,
        endLine: change.line_end,
        changes: [change],
      };
    }
  }
  hunks.push(currentHunk);

  return hunks;
}

export function applyChanges(
  originalLines: string[],
  changes: FixChange[]
): string[] {
  const result = originalLines.slice();

  // Sort changes by line_start descending so indices stay valid
  const sorted = changes.slice().sort(function (a, b) {
    return b.line_start - a.line_start;
  });

  for (const change of sorted) {
    const idx = change.line_start - 1;
    if (idx >= 0 && idx < result.length) {
      result[idx] = change.replacement;
    }
  }

  return result;
}
