"use client";

import { BookOpen, ArrowRight, Wrench, Zap } from "lucide-react";
import type { Finding } from "../lib/types";

interface ThaiExplainPanelProps {
  finding: Finding | null;
}

export default function ThaiExplainPanel({ finding }: ThaiExplainPanelProps) {
  if (!finding) {
    return (
      <div className="flex h-full flex-col">
        <div className="panel-header">
          <BookOpen className="h-3.5 w-3.5" />
          <span>คำอธิบายภาษาไทย</span>
        </div>
        <div className="panel-body flex items-center justify-center">
          <span className="text-xs text-ide-text-muted">
            เลือกปัญหาจากรายการด้านซ้ายเพื่อดูคำอธิบาย
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <BookOpen className="h-3.5 w-3.5" />
        <span>คำอธิบาย — {finding.rule_id}</span>
      </div>

      <div className="panel-body space-y-3 p-3">
        <Section
          icon={<Zap className="h-3.5 w-3.5 text-ide-warning" />}
          label="ปัญหา"
          text={finding.thai.title}
        />
        <Section
          icon={<ArrowRight className="h-3.5 w-3.5 text-ide-info" />}
          label="สาเหตุ"
          text={finding.thai.cause}
        />
        <Section
          icon={<ArrowRight className="h-3.5 w-3.5 text-ide-error" />}
          label="ผลกระทบ"
          text={finding.thai.impact}
        />
        <Section
          icon={<Wrench className="h-3.5 w-3.5 text-ide-success" />}
          label="วิธีแก้ไข"
          text={finding.thai.fix}
        />

        {finding.line && (
          <div className="rounded bg-ide-bg px-3 py-2 text-xs">
            <span className="text-ide-text-muted">ตำแหน่ง: </span>
            <span className="font-mono text-ide-text">
              บรรทัด {finding.line}
              {finding.column ? `, คอลัมน์ ${finding.column}` : ""}
            </span>
          </div>
        )}

        {finding.element && (
          <div className="rounded bg-ide-bg px-3 py-2 text-xs">
            <span className="text-ide-text-muted">Element: </span>
            <code className="font-mono text-ide-accent">{finding.element}</code>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded bg-ide-bg p-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ide-text-muted">
          {label}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-ide-text">{text}</p>
    </div>
  );
}
