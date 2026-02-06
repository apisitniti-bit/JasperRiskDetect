import type { JrxmlAst } from "../parsers/jrxml-parser";
import type { LayoutFinding } from "../types";

export function checkVariableDependency(ast: JrxmlAst): LayoutFinding[] {
  const findings: LayoutFinding[] = [];

  // Build dependency graph: variable name → set of referenced variable names
  const varNames = new Set(ast.variables.map(function (v) { return v.name; }));
  const deps = new Map<string, string[]>();

  for (const v of ast.variables) {
    if (!v.expression) continue;
    const referenced: string[] = [];
    for (const name of varNames) {
      // Match $V{variableName} pattern
      const pattern = new RegExp("\\$V\\{" + escapeRegex(name) + "\\}");
      if (pattern.test(v.expression)) {
        referenced.push(name);
      }
    }
    deps.set(v.name, referenced);
  }

  // Detect cycles using DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): string[] | null {
    if (inStack.has(node)) {
      const cycleStart = path.indexOf(node);
      return path.slice(cycleStart).concat(node);
    }
    if (visited.has(node)) return null;

    visited.add(node);
    inStack.add(node);
    path.push(node);

    const neighbors = deps.get(node) || [];
    for (const neighbor of neighbors) {
      const cycle = dfs(neighbor, path);
      if (cycle !== null) return cycle;
    }

    path.pop();
    inStack.delete(node);
    return null;
  }

  for (const varName of deps.keys()) {
    if (visited.has(varName)) continue;
    const cycle = dfs(varName, []);
    if (cycle !== null) {
      findings.push({
        check_id: "LAYOUT-009",
        severity: "critical",
        message: `Circular variable dependency detected: ${cycle.join(" → ")}`,
        thai_message: `ตรวจพบ variable อ้างอิงวนรอบ: ${cycle.join(" → ")} — จะทำให้เกิด infinite loop ขณะ compile`,
        details: { cycle },
      });
      break;
    }
  }

  return findings;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
