import type { FileResult } from "../types";

const LEVEL_TH: Record<string, string> = {
  LOW: "ต่ำ",
  MEDIUM: "ปานกลาง",
  HIGH: "สูง",
  CRITICAL: "วิกฤต",
};

const SEVERITY_TH: Record<string, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "ปานกลาง",
  low: "ต่ำ",
  info: "ข้อมูล",
};

export function formatThai(files: FileResult[], threshold: number): string {
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════════════════════╗");
  lines.push("║  JasperRiskDetect — ผลการวิเคราะห์ความเสี่ยง            ║");
  lines.push("╚══════════════════════════════════════════════════════╝");
  lines.push("");

  for (const f of files) {
    lines.push("─── " + f.path + " ───");
    lines.push("");

    if (f.error) {
      lines.push("  ❌ ข้อผิดพลาด: " + f.error);
      lines.push("");
      continue;
    }

    if (!f.version_compatible) {
      lines.push("  ❌ เวอร์ชันไม่รองรับ: " + (f.version_rejection || "JRXML ≥ 4.x"));
      lines.push("");
      continue;
    }

    const levelLabel = LEVEL_TH[f.risk_level] || f.risk_level;
    const passLabel = f.final_score >= threshold ? "❌ ไม่ผ่าน" : "✅ ผ่าน";

    lines.push(`  คะแนนความเสี่ยง: ${f.final_score}/100 (${levelLabel}) ${passLabel}`);
    lines.push(`  ├─ Layout:  ${f.layout_score}`);
    lines.push(`  └─ Compile: ${f.compile_score}`);
    lines.push("");

    if (f.findings.length === 0) {
      lines.push("  ไม่พบปัญหา");
    } else {
      lines.push(`  พบปัญหา ${f.findings.length} รายการ:`);
      lines.push("");

      for (const finding of f.findings) {
        const sevLabel = SEVERITY_TH[finding.severity] || finding.severity;
        const lineInfo = finding.line ? ` (บรรทัด ${finding.line})` : "";
        lines.push(`  [${sevLabel}] ${finding.rule_id}${lineInfo}`);
        lines.push(`    ปัญหา:    ${finding.thai.title}`);
        lines.push(`    สาเหตุ:   ${finding.thai.cause}`);
        lines.push(`    ผลกระทบ:  ${finding.thai.impact}`);
        lines.push(`    วิธีแก้:  ${finding.thai.fix}`);
        lines.push("");
      }
    }

    lines.push("");
  }

  // Summary
  const passed = files.filter((f) => f.final_score < threshold && f.version_compatible && !f.error).length;
  const failed = files.length - passed;
  lines.push("────────────────────────────────────────────");
  lines.push(`สรุป: ไฟล์ทั้งหมด ${files.length} | ผ่าน ${passed} | ไม่ผ่าน ${failed} | เกณฑ์ ${threshold}`);

  return lines.join("\n");
}
