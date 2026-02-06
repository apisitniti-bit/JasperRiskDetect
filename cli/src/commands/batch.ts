import * as fs from "fs";
import * as path from "path";
import type { FileResult, CliOptions } from "../types";
import { EXIT_OK, EXIT_RISK_EXCEEDED, EXIT_ERROR } from "../types";
import { analyzeFile, formatOutput, writeOutput } from "./analyze";

export async function batchCommand(
  dirPath: string,
  recursive: boolean,
  opts: CliOptions
): Promise<number> {
  const absDir = path.resolve(dirPath);

  if (!fs.existsSync(absDir)) {
    process.stderr.write(`Error: Directory not found: ${absDir}\n`);
    return EXIT_ERROR;
  }

  const stat = fs.statSync(absDir);
  if (!stat.isDirectory()) {
    process.stderr.write(`Error: Not a directory: ${absDir}\n`);
    return EXIT_ERROR;
  }

  const jrxmlFiles = findJrxmlFiles(absDir, recursive);

  if (jrxmlFiles.length === 0) {
    process.stderr.write(`No .jrxml files found in: ${absDir}\n`);
    return EXIT_OK;
  }

  const results: FileResult[] = [];
  for (const filePath of jrxmlFiles) {
    try {
      const result = await analyzeFile(filePath);
      results.push(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({
        path: filePath,
        version_compatible: false,
        layout_score: 0,
        compile_score: 0,
        final_score: 0,
        risk_level: "LOW",
        findings: [],
        error: msg,
      });
    }
  }

  const output = formatOutput(results, opts);
  writeOutput(output, opts.output);

  const maxScore = results.reduce((max, r) => Math.max(max, r.final_score), 0);
  if (maxScore >= opts.threshold) return EXIT_RISK_EXCEEDED;
  return EXIT_OK;
}

function findJrxmlFiles(dir: string, recursive: boolean): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isFile() && entry.name.endsWith(".jrxml")) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      const subFiles = findJrxmlFiles(fullPath, true);
      for (const sf of subFiles) {
        files.push(sf);
      }
    }
  }

  return files;
}
