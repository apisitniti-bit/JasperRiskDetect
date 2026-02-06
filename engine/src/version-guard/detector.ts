import type { VersionGuardResult } from "../rule-engine/types";
import { ALL_SIGNAL_CHECKS } from "./signals";
import type { ParsedJrxml, JrxmlRootAttributes } from "./signals";

const JASPER_REPORT_TAG_PATTERN =
  /<jasperReport\b([^>]*)>/;

const ATTRIBUTE_PATTERN =
  /(\w[\w\-.:]*)\s*=\s*"([^"]*)"/g;

function parseRootAttributes(rawXml: string): JrxmlRootAttributes {
  const tagMatch = JASPER_REPORT_TAG_PATTERN.exec(rawXml);
  const attrs: JrxmlRootAttributes = {};

  if (tagMatch === null) {
    return attrs;
  }

  const attrString = tagMatch[1];
  let m = ATTRIBUTE_PATTERN.exec(attrString);
  while (m !== null) {
    attrs[m[1]] = m[2];
    m = ATTRIBUTE_PATTERN.exec(attrString);
  }

  return attrs;
}

function isJrxmlFile(rawXml: string): boolean {
  return JASPER_REPORT_TAG_PATTERN.test(rawXml);
}

export function detectVersion(rawXml: string): VersionGuardResult {
  if (!isJrxmlFile(rawXml)) {
    return {
      compatible: false,
      signals: [],
      rejection_reasons: [
        "ข้อผิดพลาด: ไม่พบ <jasperReport> element — ไฟล์นี้ไม่ใช่ JRXML ที่ถูกต้อง",
      ],
      warnings: [],
    };
  }

  const rootAttributes = parseRootAttributes(rawXml);
  const parsed: ParsedJrxml = { rootAttributes, rawXml };

  const signals = ALL_SIGNAL_CHECKS.map(function (check) {
    return check(parsed);
  });

  const rejectionReasons: string[] = [];
  const warnings: string[] = [];

  for (const signal of signals) {
    if (signal.action === "reject" && signal.detected) {
      rejectionReasons.push(
        "ข้อผิดพลาด: ไฟล์ JRXML นี้ถูกสร้างด้วย JasperReports เวอร์ชันที่สูงกว่า 3.7.1\n" +
          "(" +
          signal.thai_message +
          ")\n" +
          "กรุณาใช้ไฟล์ที่สร้างด้วย iReport 3.7.1 เท่านั้น"
      );
    }

    if (signal.action === "warn" && signal.detected) {
      warnings.push(
        "คำเตือน: " + signal.thai_message
      );
    }
  }

  return {
    compatible: rejectionReasons.length === 0,
    signals,
    rejection_reasons: rejectionReasons,
    warnings,
  };
}

export { parseRootAttributes, isJrxmlFile };
