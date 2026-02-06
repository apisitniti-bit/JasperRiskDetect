/**
 * JSON protocol types for Node.js ↔ Java subprocess communication.
 *
 * stdin  → CompileRequest  (Node.js sends to Java)
 * stdout ← CompileResponse (Java sends to Node.js)
 */

export interface CompileRequest {
  action: "compile";
  filePath: string;
  timeout: number;
}

export interface CompileError {
  type: string;
  line: number;
  column: number;
  message: string;
  expression: string;
}

export interface CompileWarning {
  type: string;
  message: string;
}

export interface CompileMetrics {
  compileTimeMs: number;
  estimatedMemoryMB: number;
}

export interface CompileResponse {
  success: boolean;
  errors: CompileError[];
  warnings: CompileWarning[];
  metrics: CompileMetrics;
}

export interface BridgeResult {
  response: CompileResponse | null;
  timedOut: boolean;
  exitCode: number | null;
  stderr: string;
  error: string | null;
}
