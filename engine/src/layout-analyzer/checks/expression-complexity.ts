import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

const MAX_TERNARY_DEPTH = 3;
const MAX_CONCAT_CHAIN = 10;

export function checkExpressionComplexity(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  for (const expr of ast.rawExpressions) {
    // Check nested ternary depth
    const ternaryDepth = countNestedTernary(expr);
    if (ternaryDepth > MAX_TERNARY_DEPTH) {
      findings.push({
        check_id: "LAYOUT-007",
        severity: "medium",
        message: `Expression has ${ternaryDepth} levels of nested ternary (threshold: ${MAX_TERNARY_DEPTH})`,
        thai_message: `พบ expression ที่มี ternary ซ้อนกัน ${ternaryDepth} ชั้น (เกณฑ์: ${MAX_TERNARY_DEPTH}) — เสี่ยงทำให้ compile ช้าหรือ timeout`,
        element_name: expr,
        details: {
          ternary_depth: ternaryDepth,
          threshold: MAX_TERNARY_DEPTH,
          expression_preview: expr,
        },
      });
    }

    // Check string concatenation chains
    const concatCount = countConcatenations(expr);
    if (concatCount > MAX_CONCAT_CHAIN) {
      findings.push({
        check_id: "LAYOUT-007",
        severity: "low",
        message: `Expression has ${concatCount} string concatenations (threshold: ${MAX_CONCAT_CHAIN})`,
        thai_message: `พบ expression ที่มีการต่อ String ${concatCount} ครั้ง (เกณฑ์: ${MAX_CONCAT_CHAIN}) — ใช้ StringBuilder แทนเพื่อประสิทธิภาพ`,
        element_name: expr,
        details: {
          concat_count: concatCount,
          threshold: MAX_CONCAT_CHAIN,
          expression_preview: expr,
        },
      });
    }
  }

  return findings;
}

function countNestedTernary(expr: string): number {
  let maxDepth = 0;
  let currentDepth = 0;

  for (let i = 0; i < expr.length; i++) {
    if (expr[i] === "?" && i + 1 < expr.length && expr[i + 1] !== "." && expr[i + 1] !== "?") {
      currentDepth++;
      if (currentDepth > maxDepth) maxDepth = currentDepth;
    }
    if (expr[i] === ":") {
      if (currentDepth > 0) currentDepth--;
    }
  }

  return maxDepth;
}

function countConcatenations(expr: string): number {
  // Count + operators that are likely string concatenation
  // Simple heuristic: count occurrences of + surrounded by quotes or string expressions
  const matches = expr.match(/"\s*\+|\+\s*"/g);
  return matches ? matches.length : 0;
}
