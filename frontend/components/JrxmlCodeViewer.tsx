"use client";

import { useRef, useEffect } from "react";
import type { Finding } from "../lib/types";

interface JrxmlCodeViewerProps {
  content: string;
  findings: Finding[];
  selectedFinding: Finding | null;
}

const SEVERITY_BG: Record<string, string> = {
  critical: "rgba(244, 71, 71, 0.15)",
  high: "rgba(255, 140, 0, 0.12)",
  medium: "rgba(204, 167, 0, 0.10)",
  low: "rgba(55, 148, 255, 0.08)",
  info: "transparent",
};

export default function JrxmlCodeViewer({
  content,
  findings,
  selectedFinding,
}: JrxmlCodeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = content.split("\n");

  // Build set of error lines for highlighting
  const errorLines = new Map<number, Finding>();
  for (const f of findings) {
    if (f.line && f.line > 0) {
      errorLines.set(f.line, f);
    }
  }

  // Scroll to selected finding line
  useEffect(() => {
    if (!selectedFinding?.line || !containerRef.current) return;
    const lineEl = containerRef.current.querySelector(
      `[data-line="${selectedFinding.line}"]`
    );
    if (lineEl) {
      lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [selectedFinding]);

  return (
    <div ref={containerRef} className="h-full overflow-auto font-mono text-xs">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line, idx) => {
            const lineNum = idx + 1;
            const finding = errorLines.get(lineNum);
            const isSelected = selectedFinding?.line === lineNum;
            const bgColor = isSelected
              ? "rgba(9, 71, 113, 0.5)"
              : finding
              ? SEVERITY_BG[finding.severity] || "transparent"
              : "transparent";

            return (
              <tr
                key={lineNum}
                data-line={lineNum}
                style={{ backgroundColor: bgColor }}
              >
                <td className="w-12 select-none border-r border-ide-border px-2 py-0 text-right text-ide-text-muted">
                  {lineNum}
                </td>
                <td className="whitespace-pre px-3 py-0 text-ide-text">
                  {highlightXml(line)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function highlightXml(line: string): React.ReactNode {
  // Lightweight XML syntax highlighting — no heavy lib
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Comments
    const commentMatch = remaining.match(/^(<!--[\s\S]*?-->)/);
    if (commentMatch) {
      parts.push(
        <span key={key++} className="text-ide-success/60">
          {commentMatch[1]}
        </span>
      );
      remaining = remaining.slice(commentMatch[1].length);
      continue;
    }

    // Tags
    const tagMatch = remaining.match(/^(<\/?[\w:.-]+)/);
    if (tagMatch) {
      parts.push(
        <span key={key++} className="text-ide-info">
          {tagMatch[1]}
        </span>
      );
      remaining = remaining.slice(tagMatch[1].length);
      continue;
    }

    // Attribute names
    const attrMatch = remaining.match(/^(\s+[\w:.-]+)(=)/);
    if (attrMatch) {
      parts.push(
        <span key={key++}>
          <span className="text-sky-300">{attrMatch[1]}</span>
          <span className="text-ide-text-muted">{attrMatch[2]}</span>
        </span>
      );
      remaining = remaining.slice(attrMatch[0].length);
      continue;
    }

    // String values
    const strMatch = remaining.match(/^("[^"]*"|'[^']*')/);
    if (strMatch) {
      parts.push(
        <span key={key++} className="text-orange-300">
          {strMatch[1]}
        </span>
      );
      remaining = remaining.slice(strMatch[1].length);
      continue;
    }

    // CDATA
    const cdataMatch = remaining.match(/^(<!\[CDATA\[[\s\S]*?\]\]>)/);
    if (cdataMatch) {
      parts.push(
        <span key={key++} className="text-green-300">
          {cdataMatch[1]}
        </span>
      );
      remaining = remaining.slice(cdataMatch[1].length);
      continue;
    }

    // Close bracket
    const closeBracket = remaining.match(/^(\/?>)/);
    if (closeBracket) {
      parts.push(
        <span key={key++} className="text-ide-info">
          {closeBracket[1]}
        </span>
      );
      remaining = remaining.slice(closeBracket[1].length);
      continue;
    }

    // Regular text — take one char at a time
    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}
