"use client";

import { useState } from "react";
import { BookOpen, ArrowRight, Wrench, Zap, ChevronRight, List } from "lucide-react";
import type { Finding } from "../lib/types";
import ErrorPreviewCard from "./ErrorPreviewCard";

interface ThaiExplainPanelProps {
  finding: Finding | null;
  jrxmlContent?: string | null;
}

export default function ThaiExplainPanel({ finding, jrxmlContent }: ThaiExplainPanelProps) {
  if (!finding) {
    return (
      <div className="flex h-full flex-col">
        <div className="panel-header">
          <BookOpen className="h-3.5 w-3.5" />
          <span>คำอธิบายภาษาไทย</span>
        </div>
        <div className="panel-body flex items-center justify-center">
          <span className="text-sm text-ide-text-muted">
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
          <div className="rounded bg-ide-bg px-3 py-2 text-sm">
            <span className="text-ide-text-muted">ตำแหน่ง: </span>
            <span className="font-mono text-ide-text">
              บรรทัด {finding.line}
              {finding.column ? `, คอลัมน์ ${finding.column}` : ""}
            </span>
          </div>
        )}

        {finding.element && (
          <div className="rounded bg-ide-bg px-3 py-2 text-sm">
            <span className="text-ide-text-muted">Band: </span>
            <code className="font-mono text-ide-accent">{finding.element}</code>
          </div>
        )}

        {finding.element_name && (
          <div className="rounded bg-ide-bg px-3 py-2 text-sm">
            <span className="text-ide-text-muted">Expression / Text: </span>
            <code className="break-all font-mono text-sky-300">{finding.element_name}</code>
          </div>
        )}

        {/* Full element listing from details */}
        <ElementListing elements={getElementsFromDetails(finding)} />

        {/* staticText risk ranking (Phase 2) */}
        <StaticTextRanking ranking={getStaticTextRanking(finding)} />

        {/* Error Visual Preview & Screenshot */}
        {jrxmlContent && finding.line && (
          <ErrorPreviewCard finding={finding} jrxmlContent={jrxmlContent} />
        )}
      </div>
    </div>
  );
}

function getElementsFromDetails(finding: Finding): string[] {
  if (!finding.details) return [];
  const els = finding.details["elements"];
  if (Array.isArray(els)) return els.map(String);
  return [];
}

function getStaticTextRanking(finding: Finding): { rank: number; label: string; reason: string }[] {
  if (!finding.details) return [];
  const ranking = finding.details["static_text_ranking"];
  if (!Array.isArray(ranking)) return [];
  return ranking as { rank: number; label: string; reason: string }[];
}

function StaticTextRanking({ ranking }: { ranking: { rank: number; label: string; reason: string }[] }) {
  const [open, setOpen] = useState(false);

  if (ranking.length === 0) return null;

  return (
    <div className="rounded bg-ide-bg px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300"
      >
        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
        <span>ควรแก้ก่อน — staticText ({ranking.length})</span>
      </button>
      {open && (
        <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto pl-4">
          {ranking.map((item) => (
            <li key={item.rank}>
              <div className="text-xs font-semibold text-ide-text">
                อันดับ {item.rank}: <code className="font-mono text-sky-300">{item.label}</code>
              </div>
              <div className="text-xs text-ide-text-muted">{item.reason}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ElementListing({ elements }: { elements: string[] }) {
  const [open, setOpen] = useState(false);

  if (elements.length === 0) return null;

  return (
    <div className="rounded bg-ide-bg px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center gap-1.5 text-sm font-semibold text-ide-text-muted hover:text-ide-text"
      >
        <ChevronRight className={`h-3 w-3 shrink-0 transition-transform duration-150 ${open ? "rotate-90" : ""}`} />
        <List className="h-3 w-3" />
        <span>Text Fields ในแถบนี้ ({elements.length})</span>
      </button>
      {open && (
        <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto pl-5">
          {elements.map((el, i) => (
            <li key={i} className="text-xs">
              <code className="font-mono text-sky-300">{el}</code>
            </li>
          ))}
        </ul>
      )}
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
        <span className="text-xs font-semibold uppercase tracking-wider text-ide-text-muted">
          {label}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-ide-text">{text}</p>
    </div>
  );
}
