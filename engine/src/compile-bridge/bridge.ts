import { spawn } from "child_process";
import * as path from "path";
import type { CompileRequest, CompileResponse, BridgeResult } from "./protocol";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_HEAP = "256m";

export interface BridgeOptions {
  javaPath?: string;
  compilerDir?: string;
  jarPath?: string;
  policyPath?: string;
  maxHeap?: string;
  timeoutMs?: number;
}

function resolveCompilerDir(opts?: BridgeOptions): string {
  if (opts && opts.compilerDir) return opts.compilerDir;
  return path.resolve(__dirname, "..", "..", "..", "..", "compiler");
}

function resolveJarPath(compilerDir: string, opts?: BridgeOptions): string {
  if (opts && opts.jarPath) return opts.jarPath;
  return path.join(compilerDir, "target", "compile-sandbox-1.0.0.jar");
}

function resolvePolicyPath(compilerDir: string, opts?: BridgeOptions): string {
  if (opts && opts.policyPath) return opts.policyPath;
  return path.join(compilerDir, "jasper.policy");
}

export function compileJrxml(
  filePath: string,
  opts?: BridgeOptions
): Promise<BridgeResult> {
  return new Promise(function (resolve) {
    const compilerDir = resolveCompilerDir(opts);
    const jarPath = resolveJarPath(compilerDir, opts);
    const policyPath = resolvePolicyPath(compilerDir, opts);
    const javaCmd = (opts && opts.javaPath) ? opts.javaPath : "java";
    const maxHeap = (opts && opts.maxHeap) ? opts.maxHeap : DEFAULT_MAX_HEAP;
    const timeoutMs = (opts && opts.timeoutMs) ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;

    const javaArgs = [
      "-Xmx" + maxHeap,
      "-Djava.security.manager",
      "-Djava.security.policy=" + policyPath,
      "-jar", jarPath,
    ];

    const request: CompileRequest = {
      action: "compile",
      filePath: filePath,
      timeout: timeoutMs,
    };

    let stdoutData = "";
    let stderrData = "";
    let killed = false;
    let finished = false;

    const child = spawn(javaCmd, javaArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: compilerDir,
    });

    // Timeout enforcement — kill -9 on exceed
    const timer = setTimeout(function () {
      if (!finished) {
        killed = true;
        child.kill("SIGKILL");
      }
    }, timeoutMs);

    child.stdout.on("data", function (chunk: Buffer) {
      stdoutData += chunk.toString("utf-8");
    });

    child.stderr.on("data", function (chunk: Buffer) {
      stderrData += chunk.toString("utf-8");
    });

    child.on("error", function (err: Error) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        resolve({
          response: null,
          timedOut: false,
          exitCode: null,
          stderr: stderrData,
          error: "Failed to spawn Java process: " + err.message,
        });
      }
    });

    child.on("close", function (code: number | null) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);

        if (killed) {
          resolve({
            response: null,
            timedOut: true,
            exitCode: code,
            stderr: stderrData,
            error: "Compile timed out after " + timeoutMs + "ms — process killed",
          });
          return;
        }

        // Parse stdout JSON
        let response: CompileResponse | null = null;
        let parseError: string | null = null;

        try {
          const trimmed = stdoutData.trim();
          if (trimmed.length > 0) {
            response = JSON.parse(trimmed) as CompileResponse;
          } else {
            parseError = "Java process produced no stdout output";
          }
        } catch (e) {
          parseError = "Failed to parse Java output: " + (e instanceof Error ? e.message : String(e));
        }

        resolve({
          response: response,
          timedOut: false,
          exitCode: code,
          stderr: stderrData,
          error: parseError,
        });
      }
    });

    // Send request JSON via stdin, then close stdin
    const requestJson = JSON.stringify(request);
    child.stdin.write(requestJson, "utf-8");
    child.stdin.end();
  });
}
