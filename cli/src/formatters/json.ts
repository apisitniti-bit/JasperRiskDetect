import type { FileResult, BatchSummary } from "../types";

export function formatJson(files: FileResult[], threshold: number): string {
  const passed = files.filter((f) => f.final_score < threshold).length;
  const failed = files.length - passed;
  const maxScore = files.reduce((max, f) => Math.max(max, f.final_score), 0);

  const output = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    files: files.map((f) => ({
      path: f.path,
      version_check: f.version_compatible ? "pass" : "rejected",
      layout_score: f.layout_score,
      compile_score: f.compile_score,
      final_score: f.final_score,
      risk_level: f.risk_level,
      findings_count: {
        critical: f.findings.filter((fd) => fd.severity === "critical").length,
        high: f.findings.filter((fd) => fd.severity === "high").length,
        medium: f.findings.filter((fd) => fd.severity === "medium").length,
        low: f.findings.filter((fd) => fd.severity === "low").length,
      },
      findings: f.findings,
    })),
    summary: {
      total_files: files.length,
      passed,
      failed,
      max_score: maxScore,
      threshold,
    } as BatchSummary,
  };

  return JSON.stringify(output, null, 2);
}
