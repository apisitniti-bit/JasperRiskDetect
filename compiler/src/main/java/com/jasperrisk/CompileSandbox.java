package com.jasperrisk;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;

import net.sf.jasperreports.engine.JRException;
import net.sf.jasperreports.engine.JasperCompileManager;

/**
 * Main entry point for the JasperReports compile sandbox.
 *
 * Protocol:
 *   stdin  → JSON: {"action":"compile","filePath":"/tmp/uploads/abc.jrxml","timeout":30000}
 *   stdout ← JSON: CompileResult (success, errors, warnings, metrics)
 *   stderr ← Diagnostic/error messages (not parsed by Node.js bridge)
 *
 * Security:
 *   - SecurityManager installed before compile (deny net, deny fs write outside /tmp)
 *   - No JDBC drivers on classpath
 *   - Process killed by Node.js bridge after timeout
 *
 * Java 6 compatible — NO Java 8+ syntax (no lambda, no stream, no diamond inference).
 */
public class CompileSandbox {

    public static void main(String[] args) {
        CompileResult result = new CompileResult();
        long startTime = System.currentTimeMillis();

        try {
            // Read JSON from stdin
            String inputJson = readStdin();
            if (inputJson == null || inputJson.trim().length() == 0) {
                result.setSuccess(false);
                result.addError("INPUT_ERROR", 0, 0, "No input received on stdin", "");
                writeResult(result, startTime);
                return;
            }

            // Parse input (minimal JSON parsing — no external lib)
            String action = extractJsonString(inputJson, "action");
            String filePath = extractJsonString(inputJson, "filePath");

            if (!"compile".equals(action)) {
                result.setSuccess(false);
                result.addError("INPUT_ERROR", 0, 0, "Unknown action: " + action, "");
                writeResult(result, startTime);
                return;
            }

            if (filePath == null || filePath.trim().length() == 0) {
                result.setSuccess(false);
                result.addError("INPUT_ERROR", 0, 0, "filePath is required", "");
                writeResult(result, startTime);
                return;
            }

            // Java-side version double-check (redundant guard)
            String versionError = VersionValidator.validate(filePath);
            if (versionError != null) {
                result.setSuccess(false);
                result.addError("VERSION_REJECTED", 0, 0, versionError, "");
                writeResult(result, startTime);
                return;
            }

            // Install SecurityManager before compile
            installSecurityManager();

            // Dry compile — no data source, no fill
            long memBefore = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

            try {
                JasperCompileManager.compileReportToFile(filePath);
                result.setSuccess(true);
            } catch (JRException e) {
                result.setSuccess(false);
                parseCompileException(e, result);
            }

            long memAfter = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
            long memUsedMB = (memAfter - memBefore) / (1024 * 1024);
            if (memUsedMB < 0) memUsedMB = 0;
            result.setEstimatedMemoryMB(memUsedMB);

        } catch (SecurityException e) {
            result.setSuccess(false);
            result.addError("SECURITY_VIOLATION", 0, 0, "Security policy violation: " + e.getMessage(), "");
        } catch (Exception e) {
            result.setSuccess(false);
            result.addError("UNEXPECTED_ERROR", 0, 0, e.getClass().getName() + ": " + e.getMessage(), "");
        }

        writeResult(result, startTime);
    }

    private static void installSecurityManager() {
        try {
            System.setSecurityManager(new SecurityPolicy());
        } catch (Exception e) {
            System.err.println("WARNING: Could not install SecurityManager: " + e.getMessage());
        }
    }

    private static void writeResult(CompileResult result, long startTime) {
        long elapsed = System.currentTimeMillis() - startTime;
        result.setCompileTimeMs(elapsed);
        System.out.println(result.toJson());
        System.out.flush();
    }

    private static String readStdin() {
        BufferedReader reader = null;
        try {
            reader = new BufferedReader(new InputStreamReader(System.in, "UTF-8"));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        } catch (IOException e) {
            return null;
        }
        // Don't close stdin reader
    }

    /**
     * Parse JRException to extract meaningful error info.
     * JasperReports 3.7.1 JRException messages contain line/expression info as text.
     */
    private static void parseCompileException(JRException e, CompileResult result) {
        String msg = e.getMessage();
        if (msg == null) msg = "Unknown compile error";

        // Try to extract line number from message pattern like "line 42"
        int line = 0;
        int lineIdx = msg.indexOf("line ");
        if (lineIdx >= 0) {
            StringBuilder numStr = new StringBuilder();
            for (int i = lineIdx + 5; i < msg.length(); i++) {
                char c = msg.charAt(i);
                if (c >= '0' && c <= '9') {
                    numStr.append(c);
                } else {
                    break;
                }
            }
            if (numStr.length() > 0) {
                try {
                    line = Integer.parseInt(numStr.toString());
                } catch (NumberFormatException ignored) {
                    // keep line = 0
                }
            }
        }

        // Classify error type
        String type = "COMPILE_ERROR";
        if (msg.contains("cannot resolve")) {
            type = "UNRESOLVED_SYMBOL";
        } else if (msg.contains("Field not found")) {
            type = "UNRESOLVED_FIELD";
        } else if (msg.contains("Variable not found")) {
            type = "UNRESOLVED_VARIABLE";
        } else if (msg.contains("Syntax error")) {
            type = "SYNTAX_ERROR";
        }

        // Extract expression if available
        String expression = "";
        Throwable cause = e.getCause();
        if (cause != null && cause.getMessage() != null) {
            expression = cause.getMessage();
            if (expression.length() > 200) {
                expression = expression.substring(0, 200) + "...";
            }
        }

        result.addError(type, line, 0, msg, expression);
    }

    /**
     * Minimal JSON string extraction — no external library.
     * Extracts value for a given key from a flat JSON object.
     */
    private static String extractJsonString(String json, String key) {
        String search = "\"" + key + "\"";
        int keyIdx = json.indexOf(search);
        if (keyIdx < 0) return null;

        int colonIdx = json.indexOf(':', keyIdx + search.length());
        if (colonIdx < 0) return null;

        // Find opening quote
        int openQuote = json.indexOf('"', colonIdx + 1);
        if (openQuote < 0) return null;

        // Find closing quote (handle escaped quotes)
        int closeQuote = openQuote + 1;
        while (closeQuote < json.length()) {
            char c = json.charAt(closeQuote);
            if (c == '\\') {
                closeQuote += 2; // skip escaped char
                continue;
            }
            if (c == '"') break;
            closeQuote++;
        }
        if (closeQuote >= json.length()) return null;

        return json.substring(openQuote + 1, closeQuote);
    }
}
