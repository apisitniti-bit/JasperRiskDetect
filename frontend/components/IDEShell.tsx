"use client";

import { useState, useCallback } from "react";
import TopBar from "./TopBar";
import ErrorListPanel from "./ErrorListPanel";
import JrxmlViewerPanel from "./JrxmlViewerPanel";
import RiskScorePanel from "./RiskScorePanel";
import ThaiExplainPanel from "./ThaiExplainPanel";
import FileUploadModal from "./FileUploadModal";
import { useAnalysis } from "../hooks/use-analysis";
import { useUpload } from "../hooks/use-upload";
import type { Finding } from "../lib/types";

export default function IDEShell() {
  const [showUpload, setShowUpload] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);

  const { upload, uploading, uploadError, uploadResult, reset: resetUpload } = useUpload();
  const { analysis, isLoading } = useAnalysis(uploadResult?.file_id ?? null);

  const handleUploadClick = useCallback(() => {
    setShowUpload(true);
  }, []);

  const handleCloseUpload = useCallback(() => {
    setShowUpload(false);
  }, []);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setSelectedFinding(null);
      const result = await upload(file);
      if (result) {
        setShowUpload(false);
      }
    },
    [upload]
  );

  // Per SKILL.md: rerender-functional-setstate
  const handleSelectFinding = useCallback((finding: Finding) => {
    setSelectedFinding((curr) => (curr === finding ? null : finding));
  }, []);

  const findings = analysis?.findings ?? [];
  const layoutScore = analysis?.layout_score ?? 0;
  const compileScore = analysis?.compile_score ?? 0;
  const riskLevel = analysis?.risk_level ?? "LOW";
  const jrxmlContent = analysis?.jrxml_content ?? null;
  const fileName = uploadResult?.file_name ?? null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      {/* Top Bar */}
      <TopBar
        fileName={fileName}
        onUploadClick={handleUploadClick}
        isAnalyzing={isLoading}
      />

      {/* Main IDE Layout: Left | Center | Right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Error List */}
        <div className="flex w-72 shrink-0 flex-col border-r border-ide-border">
          <ErrorListPanel
            findings={findings}
            selectedFinding={selectedFinding}
            onSelectFinding={handleSelectFinding}
          />
        </div>

        {/* Center: JRXML Viewer (top) + Thai Explain (bottom) */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* JRXML Viewer */}
          <div className="flex-1 overflow-hidden border-b border-ide-border">
            <JrxmlViewerPanel
              content={jrxmlContent}
              findings={findings}
              selectedFinding={selectedFinding}
            />
          </div>

          {/* Bottom Panel: Thai Explain */}
          <div className="h-52 shrink-0 overflow-hidden">
            <ThaiExplainPanel finding={selectedFinding} />
          </div>
        </div>

        {/* Right Panel: Risk Score */}
        <div className="w-56 shrink-0 border-l border-ide-border">
          <RiskScorePanel
            layoutScore={layoutScore}
            compileScore={compileScore}
            riskLevel={riskLevel}
          />
        </div>
      </div>

      {/* Upload Modal */}
      <FileUploadModal
        open={showUpload}
        onClose={handleCloseUpload}
        onFileSelected={handleFileSelected}
        uploading={uploading}
        error={uploadError}
      />
    </div>
  );
}
