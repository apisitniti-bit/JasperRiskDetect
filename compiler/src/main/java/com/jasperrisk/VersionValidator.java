package com.jasperrisk;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;

/**
 * Java-side version double-check (redundant guard after Node.js version-guard).
 * Reads the first portion of JRXML to detect 4.x+ markers before compile.
 * Java 6 compatible — NO Java 8+ syntax.
 */
public class VersionValidator {

    private static final int MAX_HEADER_CHARS = 4096;

    /**
     * Validate that the JRXML file is compatible with JasperReports 3.7.1.
     * Returns null if valid, or an error message string if rejected.
     */
    public static String validate(String filePath) {
        String header = readHeader(filePath, MAX_HEADER_CHARS);
        if (header == null) {
            return "Cannot read file: " + filePath;
        }

        // Check for uuid attribute on <jasperReport> — JasperReports >= 4.1.1
        if (header.contains("uuid=\"") || header.contains("uuid='")) {
            return "JRXML contains 'uuid' attribute (JasperReports >= 4.1.1)";
        }

        // Check for <propertyExpression> — JasperReports >= 4.0.0
        if (header.contains("<propertyExpression")) {
            return "JRXML contains <propertyExpression> element (JasperReports >= 4.0.0)";
        }

        // Check for whenNoDataType="NoDataSection" — JasperReports >= 3.7.5
        if (header.contains("whenNoDataType=\"NoDataSection\"")) {
            return "JRXML contains whenNoDataType=\"NoDataSection\" (JasperReports >= 3.7.5)";
        }

        return null; // valid
    }

    private static String readHeader(String filePath, int maxChars) {
        BufferedReader reader = null;
        try {
            reader = new BufferedReader(new FileReader(filePath));
            char[] buf = new char[maxChars];
            int read = reader.read(buf, 0, maxChars);
            if (read <= 0) return "";
            return new String(buf, 0, read);
        } catch (IOException e) {
            return null;
        } finally {
            if (reader != null) {
                try {
                    reader.close();
                } catch (IOException ignored) {
                    // ignore close error
                }
            }
        }
    }
}
