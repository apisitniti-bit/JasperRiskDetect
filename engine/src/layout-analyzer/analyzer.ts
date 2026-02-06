import { parseJrxml } from "./parsers/jrxml-parser";
import type { JrxmlAst } from "./parsers/jrxml-parser";
import type { LayoutFinding, LayoutCheck } from "./types";

import { checkBandOverflow } from "./checks/band-overflow";
import { checkMemoryEstimation } from "./checks/memory-estimation";
import { checkSubreportDepth } from "./checks/subreport-depth";
import { checkImageSize } from "./checks/image-size";
import { checkPaginationRisk } from "./checks/pagination-risk";
import { checkExpressionComplexity } from "./checks/expression-complexity";
import { checkFieldCount } from "./checks/field-count";
import { checkVariableDependency } from "./checks/variable-dependency";
import { checkGroupNesting } from "./checks/group-nesting";
import { checkOverflowOutsideDetail } from "./checks/overflow-outside-detail";

const ALL_CHECKS: LayoutCheck[] = [
  checkBandOverflow,
  checkMemoryEstimation,
  checkSubreportDepth,
  checkImageSize,
  checkPaginationRisk,
  checkExpressionComplexity,
  checkFieldCount,
  checkVariableDependency,
  checkGroupNesting,
  checkOverflowOutsideDetail,
];

export interface LayoutAnalysisResult {
  findings: LayoutFinding[];
  ast: JrxmlAst;
  check_count: number;
}

export function analyzeLayout(rawXml: string): LayoutAnalysisResult {
  const ast = parseJrxml(rawXml);
  const findings: LayoutFinding[] = [];

  for (const check of ALL_CHECKS) {
    const results = check(ast);
    for (const f of results) {
      findings.push(f);
    }
  }

  return {
    findings,
    ast,
    check_count: ALL_CHECKS.length,
  };
}
