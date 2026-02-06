import * as fs from "fs";
import * as path from "path";
import type { FileResult, CliOptions } from "../types";
import { EXIT_OK, EXIT_RISK_EXCEEDED, EXIT_ERROR, EXIT_VERSION_REJECTED } from "../types";
import { formatJson } from "../formatters/json";
import { formatTable } from "../formatters/table";
import { formatThai } from "../formatters/thai";

export async function analyzeCommand(
  filePath: string,
  opts: CliOptions
): Promise<number> {
  const absPath = path.resolve(filePath);

  if (!fs.existsSync(absPath)) {
    process.stderr.write(`Error: File not found: ${absPath}\n`);
    return EXIT_ERROR;
  }

  if (!absPath.endsWith(".jrxml")) {
    process.stderr.write(`Error: Not a .jrxml file: ${absPath}\n`);
    return EXIT_ERROR;
  }

  let result: FileResult;

  try {
    result = await analyzeFile(absPath);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error analyzing ${absPath}: ${msg}\n`);
    return EXIT_ERROR;
  }

  const output = formatOutput([result], opts);
  writeOutput(output, opts.output);

  if (!result.version_compatible) return EXIT_VERSION_REJECTED;
  if (result.final_score >= opts.threshold) return EXIT_RISK_EXCEEDED;
  return EXIT_OK;
}

async function analyzeFile(absPath: string): Promise<FileResult> {
  const rawXml = fs.readFileSync(absPath, "utf-8");

  // Lazy-load engine modules to avoid hard dependency at parse time
  let detectVersion: Function;
  let parseJrxml: Function;
  let analyzeLayout: Function;
  let scoreFindings: Function;

  try {
    const versionMod = require("@jasper-risk-detect/engine/src/version-guard/detector");
    detectVersion = versionMod.detectVersion;
  } catch {
    // Fallback: version check passes
    detectVersion = () => ({ compatible: true, signals: [], rejection_reasons: [], warnings: [] });
  }

  try {
    const parserMod = require("@jasper-risk-detect/engine/src/layout-analyzer/parsers/jrxml-parser");
    const analyzerMod = require("@jasper-risk-detect/engine/src/layout-analyzer/analyzer");
    parseJrxml = parserMod.parseJrxml;
    analyzeLayout = analyzerMod.analyzeLayout;
  } catch {
    parseJrxml = null;
    analyzeLayout = null;
  }

  try {
    const scorerMod = require("@jasper-risk-detect/engine/src/risk-scorer/scorer");
    scoreFindings = scorerMod.scoreFindings;
  } catch {
    scoreFindings = () => ({ layout_score: 0, compile_score: 0, final_score: 0, risk_level: "LOW" });
  }

  // Version check
  const versionResult = detectVersion(rawXml);
  if (!versionResult.compatible) {
    return {
      path: absPath,
      version_compatible: false,
      version_rejection: versionResult.rejection_reasons.join("; "),
      layout_score: 0,
      compile_score: 0,
      final_score: 0,
      risk_level: "CRITICAL",
      findings: [],
    };
  }

  // Layout analysis
  let findings: any[] = [];
  if (parseJrxml && analyzeLayout) {
    try {
      const ast = parseJrxml(rawXml);
      const layoutResult = analyzeLayout(ast);
      findings = layoutResult.findings || [];
    } catch (err) {
      // Layout analysis failed — continue with empty findings
    }
  }

  // Score
  const score = scoreFindings(findings);

  return {
    path: absPath,
    version_compatible: true,
    layout_score: score.layout_score || 0,
    compile_score: score.compile_score || 0,
    final_score: score.final_score || 0,
    risk_level: score.risk_level || "LOW",
    findings,
  };
}

function formatOutput(files: FileResult[], opts: CliOptions): string {
  switch (opts.format) {
    case "json":
      return formatJson(files, opts.threshold);
    case "table":
      return formatTable(files, opts.threshold);
    case "thai":
    default:
      return formatThai(files, opts.threshold);
  }
}

function writeOutput(output: string, outputPath: string | null): void {
  if (outputPath) {
    fs.writeFileSync(outputPath, output, "utf-8");
  } else {
    process.stdout.write(output + "\n");
  }
}

export { analyzeFile, formatOutput, writeOutput };
