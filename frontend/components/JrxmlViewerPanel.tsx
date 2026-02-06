"use client";

import dynamic from "next/dynamic";
import { Code2 } from "lucide-react";
import { ViewerSkeleton } from "./skeletons";
import type { Finding } from "../lib/types";

const JrxmlCodeViewer = dynamic(
  () => import("./JrxmlCodeViewer"),
  { ssr: false, loading: () => <ViewerSkeleton /> }
);

interface JrxmlViewerPanelProps {
  content: string | null;
  findings: Finding[];
  selectedFinding: Finding | null;
}

export default function JrxmlViewerPanel({
  content,
  findings,
  selectedFinding,
}: JrxmlViewerPanelProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="panel-header">
        <Code2 className="h-3.5 w-3.5" />
        <span>JRXML Viewer</span>
        {content && (
          <span className="ml-auto text-[10px] text-ide-text-muted">
            {content.split("\n").length} บรรทัด
          </span>
        )}
      </div>

      <div className="panel-body">
        {content ? (
          <JrxmlCodeViewer
            content={content}
            findings={findings}
            selectedFinding={selectedFinding}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-ide-text-muted">
            <Code2 className="h-10 w-10 opacity-20" />
            <span className="text-xs">อัปโหลดไฟล์ .jrxml เพื่อดูโค้ด</span>
          </div>
        )}
      </div>
    </div>
  );
}
