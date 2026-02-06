import type { VersionSignal } from "../rule-engine/types";

export interface JrxmlRootAttributes {
  [key: string]: string | undefined;
}

export interface ParsedJrxml {
  rootAttributes: JrxmlRootAttributes;
  rawXml: string;
}

// --- Signal 1: uuid attribute on <jasperReport> → ≥4.1.1 ---

export function checkUuidAttribute(parsed: ParsedJrxml): VersionSignal {
  const hasUuid =
    parsed.rootAttributes["uuid"] !== undefined &&
    parsed.rootAttributes["uuid"] !== "";

  return {
    signal_id: "VGUARD-001",
    detected: hasUuid,
    action: hasUuid ? "reject" : "pass",
    min_version: "4.1.1",
    detail: hasUuid
      ? "attribute 'uuid' found on <jasperReport>"
      : "no uuid attribute",
    thai_message: hasUuid
      ? "ตรวจพบ attribute 'uuid' บน <jasperReport> ซึ่งมีเฉพาะใน JasperReports 4.1.1 ขึ้นไป"
      : "",
  };
}

// --- Signal 2: <propertyExpression> element → ≥4.0.0 ---
// Note: columnWidth on <jasperReport> exists in ALL JRXML versions (not a 4.0+ indicator).
// <propertyExpression> was genuinely introduced in JasperReports 4.0.0.

export function checkPropertyExpression(parsed: ParsedJrxml): VersionSignal {
  const pattern = /<propertyExpression[\s>\/]/i;
  const hasPropertyExpression = pattern.test(parsed.rawXml);

  return {
    signal_id: "VGUARD-002",
    detected: hasPropertyExpression,
    action: hasPropertyExpression ? "reject" : "pass",
    min_version: "4.0.0",
    detail: hasPropertyExpression
      ? "<propertyExpression> element found"
      : "no <propertyExpression> element",
    thai_message: hasPropertyExpression
      ? "ตรวจพบ <propertyExpression> ซึ่งมีเฉพาะใน JasperReports 4.0.0 ขึ้นไป"
      : "",
  };
}

// --- Signal 3: <genericElement> tag → ≥3.5.0 (warn only) ---

export function checkGenericElement(parsed: ParsedJrxml): VersionSignal {
  const pattern = /<genericElement[\s>\/]/i;
  const hasGenericElement = pattern.test(parsed.rawXml);

  return {
    signal_id: "VGUARD-003",
    detected: hasGenericElement,
    action: hasGenericElement ? "warn" : "pass",
    min_version: "3.5.0",
    detail: hasGenericElement
      ? "<genericElement> tag found"
      : "no <genericElement> tag",
    thai_message: hasGenericElement
      ? "ตรวจพบ <genericElement> ซึ่งรองรับตั้งแต่ JasperReports 3.5.0 — อาจไม่เข้ากันได้กับ 3.7.1 บางกรณี"
      : "",
  };
}

// --- Signal 4: <style> with markup="styled" → ≥4.0.0 ---

export function checkStyledMarkup(parsed: ParsedJrxml): VersionSignal {
  const pattern = /<style\b[^>]*\bmarkup\s*=\s*["']styled["'][^>]*>/i;
  const hasStyledMarkup = pattern.test(parsed.rawXml);

  return {
    signal_id: "VGUARD-004",
    detected: hasStyledMarkup,
    action: hasStyledMarkup ? "reject" : "pass",
    min_version: "4.0.0",
    detail: hasStyledMarkup
      ? '<style> element with markup="styled" found'
      : "no styled markup",
    thai_message: hasStyledMarkup
      ? 'ตรวจพบ <style> ที่มี markup="styled" ซึ่งมีเฉพาะใน JasperReports 4.0.0 ขึ้นไป'
      : "",
  };
}

// --- Signal 5: whenNoDataType="NoDataSection" → ≥3.7.5 ---

export function checkNoDataSection(parsed: ParsedJrxml): VersionSignal {
  const attrValue = parsed.rootAttributes["whenNoDataType"];
  const hasNoDataSection = attrValue === "NoDataSection";

  return {
    signal_id: "VGUARD-005",
    detected: hasNoDataSection,
    action: hasNoDataSection ? "reject" : "pass",
    min_version: "3.7.5",
    detail: hasNoDataSection
      ? 'whenNoDataType="NoDataSection" found on <jasperReport>'
      : "no NoDataSection value",
    thai_message: hasNoDataSection
      ? 'ตรวจพบ whenNoDataType="NoDataSection" ซึ่งมีเฉพาะใน JasperReports 3.7.5 ขึ้นไป'
      : "",
  };
}

// --- Signal 6: Java 8+ syntax in CDATA expressions ---

const JAVA8_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /\(\s*\w+\s*\)\s*->/,
    description: "lambda expression with typed parameter",
  },
  {
    pattern: /\(\s*\)\s*->/,
    description: "lambda expression with empty params",
  },
  {
    pattern: /\w+\s*->\s*[{(]/,
    description: "lambda expression with single parameter",
  },
  {
    pattern: /\.\s*stream\s*\(\s*\)/,
    description: "Stream API .stream() call",
  },
  {
    pattern: /\.\s*forEach\s*\(\s*\w+\s*->/,
    description: ".forEach with lambda",
  },
  {
    pattern: /\.\s*map\s*\(\s*\w+\s*->/,
    description: ".map with lambda",
  },
  {
    pattern: /\.\s*filter\s*\(\s*\w+\s*->/,
    description: ".filter with lambda",
  },
  {
    pattern: /\.\s*collect\s*\(/,
    description: "Stream .collect() call",
  },
  {
    pattern: /Optional\s*\.\s*of\s*\(/,
    description: "Optional.of() (Java 8+)",
  },
  {
    pattern: /::/,
    description: "method reference operator (::)",
  },
];

export function checkJava8Syntax(parsed: ParsedJrxml): VersionSignal {
  const cdataPattern = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  const detectedPatterns: string[] = [];

  let match = cdataPattern.exec(parsed.rawXml);
  while (match !== null) {
    const cdataContent = match[1];
    for (const jp of JAVA8_PATTERNS) {
      if (jp.pattern.test(cdataContent)) {
        if (detectedPatterns.indexOf(jp.description) === -1) {
          detectedPatterns.push(jp.description);
        }
      }
    }
    match = cdataPattern.exec(parsed.rawXml);
  }

  const hasJava8 = detectedPatterns.length > 0;

  return {
    signal_id: "VGUARD-006",
    detected: hasJava8,
    action: hasJava8 ? "reject" : "pass",
    min_version: "Java 8+",
    detail: hasJava8
      ? "Java 8+ syntax detected: " + detectedPatterns.join(", ")
      : "no Java 8+ syntax in expressions",
    thai_message: hasJava8
      ? "ตรวจพบ syntax ของ Java 8 ขึ้นไปใน expression: " +
        detectedPatterns.join(", ") +
        " — iReport 3.7.1 รองรับเฉพาะ Java 6/7"
      : "",
  };
}

// --- Signal 7: xmlns namespace validation (pass-through) ---

export function checkNamespace(parsed: ParsedJrxml): VersionSignal {
  const xmlns = parsed.rootAttributes["xmlns"] || "";
  const expectedNs =
    "http://jasperreports.sourceforge.net/jasperreports";
  const isValid = xmlns === expectedNs;

  return {
    signal_id: "VGUARD-007",
    detected: !isValid,
    action: isValid ? "pass" : "warn",
    min_version: "N/A",
    detail: isValid
      ? "xmlns matches JasperReports namespace"
      : "xmlns mismatch or missing: '" + xmlns + "'",
    thai_message: !isValid
      ? "namespace ของ JRXML ไม่ตรงกับ JasperReports มาตรฐาน — อาจไม่ใช่ไฟล์ JasperReports ที่ถูกต้อง"
      : "",
  };
}

// --- All signals in execution order ---

export type SignalCheckFn = (parsed: ParsedJrxml) => VersionSignal;

export const ALL_SIGNAL_CHECKS: SignalCheckFn[] = [
  checkUuidAttribute,
  checkPropertyExpression,
  checkGenericElement,
  checkStyledMarkup,
  checkNoDataSection,
  checkJava8Syntax,
  checkNamespace,
];
