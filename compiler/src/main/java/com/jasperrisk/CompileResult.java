package com.jasperrisk;

import java.util.ArrayList;
import java.util.List;

/**
 * POJO representing compile diagnostics output.
 * Serialized to JSON via manual StringBuilder (no external JSON lib dependency).
 * Java 6 compatible — NO Java 8+ syntax.
 */
public class CompileResult {

    private boolean success;
    private List errors;
    private List warnings;
    private long compileTimeMs;
    private long estimatedMemoryMB;

    public CompileResult() {
        this.success = true;
        this.errors = new ArrayList();
        this.warnings = new ArrayList();
        this.compileTimeMs = 0;
        this.estimatedMemoryMB = 0;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public List getErrors() {
        return errors;
    }

    public List getWarnings() {
        return warnings;
    }

    public long getCompileTimeMs() {
        return compileTimeMs;
    }

    public void setCompileTimeMs(long compileTimeMs) {
        this.compileTimeMs = compileTimeMs;
    }

    public long getEstimatedMemoryMB() {
        return estimatedMemoryMB;
    }

    public void setEstimatedMemoryMB(long estimatedMemoryMB) {
        this.estimatedMemoryMB = estimatedMemoryMB;
    }

    public void addError(String type, int line, int column, String message, String expression) {
        errors.add(new CompileError(type, line, column, message, expression));
    }

    public void addWarning(String type, String message) {
        warnings.add(new CompileWarning(type, message));
    }

    /**
     * Serialize to JSON string without external library.
     */
    public String toJson() {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"success\":").append(success).append(",");

        // errors
        sb.append("\"errors\":[");
        for (int i = 0; i < errors.size(); i++) {
            if (i > 0) sb.append(",");
            CompileError err = (CompileError) errors.get(i);
            sb.append("{");
            sb.append("\"type\":\"").append(escapeJson(err.type)).append("\",");
            sb.append("\"line\":").append(err.line).append(",");
            sb.append("\"column\":").append(err.column).append(",");
            sb.append("\"message\":\"").append(escapeJson(err.message)).append("\",");
            sb.append("\"expression\":\"").append(escapeJson(err.expression)).append("\"");
            sb.append("}");
        }
        sb.append("],");

        // warnings
        sb.append("\"warnings\":[");
        for (int i = 0; i < warnings.size(); i++) {
            if (i > 0) sb.append(",");
            CompileWarning warn = (CompileWarning) warnings.get(i);
            sb.append("{");
            sb.append("\"type\":\"").append(escapeJson(warn.type)).append("\",");
            sb.append("\"message\":\"").append(escapeJson(warn.message)).append("\"");
            sb.append("}");
        }
        sb.append("],");

        // metrics
        sb.append("\"metrics\":{");
        sb.append("\"compileTimeMs\":").append(compileTimeMs).append(",");
        sb.append("\"estimatedMemoryMB\":").append(estimatedMemoryMB);
        sb.append("}");

        sb.append("}");
        return sb.toString();
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"':  sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n");  break;
                case '\r': sb.append("\\r");  break;
                case '\t': sb.append("\\t");  break;
                default:   sb.append(c);
            }
        }
        return sb.toString();
    }

    // --- Inner classes ---

    static class CompileError {
        String type;
        int line;
        int column;
        String message;
        String expression;

        CompileError(String type, int line, int column, String message, String expression) {
            this.type = type;
            this.line = line;
            this.column = column;
            this.message = message;
            this.expression = expression;
        }
    }

    static class CompileWarning {
        String type;
        String message;

        CompileWarning(String type, String message) {
            this.type = type;
            this.message = message;
        }
    }
}
