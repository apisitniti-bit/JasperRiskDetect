import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";
import { detectVersion } from "@jasper-risk-detect/engine/src/version-guard/detector";
import { analyzeLayout } from "@jasper-risk-detect/engine/src/layout-analyzer/analyzer";
import { scoreFindings } from "@jasper-risk-detect/engine/src/risk-scorer/scorer";
import { enrichFindings } from "@jasper-risk-detect/engine/src/rule-engine/engine";
import type { Finding } from "@jasper-risk-detect/engine/src/rule-engine/types";
import type { LayoutFinding } from "@jasper-risk-detect/engine/src/layout-analyzer/types";

const UPLOAD_DIR = join(tmpdir(), "jasper-risk-detect");
// Resolve rules dir — works from both frontend/ cwd and monorepo root
const RULES_DIR = existsSync(resolve(process.cwd(), "..", "engine", "rules"))
  ? resolve(process.cwd(), "..", "engine", "rules")
  : resolve(process.cwd(), "engine", "rules");

function layoutToFinding(lf: LayoutFinding): Finding {
  return {
    rule_id: lf.check_id,
    severity: lf.severity,
    category: "layout",
    line: lf.line,
    element: lf.band_type,
    element_name: lf.element_name,
    message: lf.message,
    thai: {
      title: lf.thai_message,
      cause: lf.message,
      impact: "",
      fix: "",
    },
    risk_weight: 0,
    details: lf.details,
  };
}

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId");

    if (!fileId) {
      return Response.json(
        { error: "ไม่ระบุ fileId" },
        { status: 400 }
      );
    }

    const filePath = join(UPLOAD_DIR, `${fileId}.jrxml`);

    if (!existsSync(filePath)) {
      return Response.json(
        { error: "ไม่พบไฟล์ที่อัปโหลด" },
        { status: 404 }
      );
    }

    const rawXml = await readFile(filePath, "utf-8");

    // 1. Version guard
    const versionResult = detectVersion(rawXml);

    if (!versionResult.compatible) {
      return Response.json({
        file_id: fileId,
        file_name: `${fileId}.jrxml`,
        version_check: versionResult,
        layout_score: 0,
        compile_score: 0,
        final_score: 0,
        risk_level: "CRITICAL",
        findings: [],
        jrxml_content: rawXml,
      });
    }

    // 2. Layout analysis — analyzeLayout takes raw XML string
    let findings: Finding[] = [];
    let parameters: { name: string; className: string }[] = [];
    let fields: { name: string; className: string }[] = [];
    let variables: { name: string; className: string; expression?: string }[] = [];
    try {
      const layoutResult = analyzeLayout(rawXml);
      findings = layoutResult.findings.map(layoutToFinding);
      parameters = layoutResult.ast.parameters.map((p) => ({ name: p.name, className: p.className }));
      fields = layoutResult.ast.fields.map((f) => ({ name: f.name, className: f.className }));
      variables = layoutResult.ast.variables.map((v) => ({ name: v.name, className: v.className, expression: v.expression }));
    } catch {
      // Layout parse failed — continue with empty findings
    }

    // 3. Enrich findings with rule engine (Thai messages + weights)
    try {
      findings = enrichFindings(findings, "layout", RULES_DIR);
    } catch {
      // Rule engine not available — use raw findings
    }

    // 4. Score
    const score = scoreFindings(findings);

    return Response.json({
      file_id: fileId,
      file_name: `${fileId}.jrxml`,
      version_check: versionResult,
      layout_score: score.layout_score,
      compile_score: score.compile_score,
      final_score: score.final_score,
      risk_level: score.risk_level,
      findings,
      parameters,
      fields,
      variables,
      jrxml_content: rawXml,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return Response.json({ error: msg }, { status: 500 });
  }
}
