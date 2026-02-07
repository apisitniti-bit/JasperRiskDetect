#!/usr/bin/env node

import type { CliOptions } from "../src/types";
import { EXIT_ERROR } from "../src/types";
import { analyzeCommand } from "../src/commands/analyze";
import { batchCommand } from "../src/commands/batch";
import { printLogo } from "../src/logo";

const HELP = `
JasperRiskDetect CLI — วิเคราะห์ความเสี่ยง JasperReports สำหรับ iReport 3.7.1

Usage:
  jasper-risk-detect analyze <file>                   วิเคราะห์ไฟล์เดียว
  jasper-risk-detect analyze-dir <directory>           วิเคราะห์ทั้งโฟลเดอร์

Options:
  --format=json|table|thai    รูปแบบผลลัพธ์ (default: thai)
  --threshold=<N>             เกณฑ์คะแนน (default: 80)
  --output=<file>             เขียนผลลัพธ์ลงไฟล์
  --recursive                 สแกน subdirectory (analyze-dir)
  --fail-on-warning           ล้มเหลวเมื่อมีคำเตือน
  --help                      แสดงข้อความนี้

Exit Codes:
  0   ผ่าน (risk < threshold)
  1   ไม่ผ่าน (risk >= threshold)
  2   ข้อผิดพลาด (file not found, parse error)
  3   เวอร์ชันไม่รองรับ (JRXML >= 4.x)
`.trim();

function parseArgs(argv: string[]): {
  command: string;
  target: string;
  recursive: boolean;
  opts: CliOptions;
} {
  let format: "json" | "table" | "thai" = "thai";
  let threshold = 80;
  let output: string | null = null;
  let failOnWarning = false;
  let recursive = false;
  let command = "";
  let target = "";

  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      process.stdout.write(HELP + "\n");
      process.exit(0);
    }
    if (arg === "--recursive" || arg === "-r") {
      recursive = true;
      continue;
    }
    if (arg === "--fail-on-warning") {
      failOnWarning = true;
      continue;
    }
    if (arg.startsWith("--format=")) {
      const val = arg.slice("--format=".length);
      if (val === "json" || val === "table" || val === "thai") {
        format = val;
      }
      continue;
    }
    if (arg.startsWith("--threshold=")) {
      const val = parseInt(arg.slice("--threshold=".length), 10);
      if (!isNaN(val) && val >= 0 && val <= 100) {
        threshold = val;
      }
      continue;
    }
    if (arg.startsWith("--output=")) {
      output = arg.slice("--output=".length);
      continue;
    }
    positional.push(arg);
  }

  command = positional[0] || "";
  target = positional[1] || "";

  return {
    command,
    target,
    recursive,
    opts: { format, threshold, output, failOnWarning },
  };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printLogo(false);
    process.stdout.write("\n" + HELP + "\n");
    process.exit(0);
  }

  const { command, target, recursive, opts } = parseArgs(args);

  let exitCode: number;

  switch (command) {
    case "analyze":
      if (!target) {
        process.stderr.write("Error: Missing file path. Usage: jasper-risk-detect analyze <file>\n");
        process.exit(EXIT_ERROR);
      }
      exitCode = await analyzeCommand(target, opts);
      break;

    case "analyze-dir":
      if (!target) {
        process.stderr.write("Error: Missing directory. Usage: jasper-risk-detect analyze-dir <dir>\n");
        process.exit(EXIT_ERROR);
      }
      exitCode = await batchCommand(target, recursive, opts);
      break;

    default:
      process.stderr.write(`Unknown command: ${command}\n\n`);
      process.stdout.write(HELP + "\n");
      exitCode = EXIT_ERROR;
  }

  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(EXIT_ERROR);
});
