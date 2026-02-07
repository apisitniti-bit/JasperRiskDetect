"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Layout, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { parseJrxmlForDesigner } from "../lib/jrxml-designer-parser";
import type { DesignerBand, DesignerElement } from "../lib/jrxml-designer-parser";
import type { Finding, Severity } from "../lib/types";

/* ── Constants ───────────────────────────────────────────── */

interface DesignerPreviewPanelProps {
  jrxmlContent: string | null;
  findings: Finding[];
  selectedFinding: Finding | null;
}

const DESIGNER_FONT = "'TH Sarabun New', 'Sarabun', sans-serif";

const BAND_LABEL_COLORS: Record<string, string> = {
  title: "#6688bb",
  pageHeader: "#558855",
  columnHeader: "#4466aa",
  detail: "#bb6633",
  columnFooter: "#4466aa",
  pageFooter: "#558855",
  summary: "#aa8833",
  lastPageFooter: "#558855",
  background: "#888",
  noData: "#888",
};

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#e00000",
  high: "#ff8c00",
  medium: "#cca700",
  low: "#3794ff",
  info: "#858585",
};

const BAND_LABEL_MAP: Record<string, string> = {
  title: "Title",
  pageHeader: "Page Header",
  columnHeader: "Column Header",
  detail: "Detail",
  columnFooter: "Column Footer",
  pageFooter: "Page Footer",
  summary: "Summary",
  lastPageFooter: "Last Page Footer",
  background: "Background",
  noData: "No Data",
};

/* ── Helpers ─────────────────────────────────────────────── */

const EXPR_PARAM_RE = /\$[PFV]\{([^}]+)\}/g;

function getBandLabelColor(bandKey: string): string {
  return BAND_LABEL_COLORS[bandKey] ?? "#888";
}

function getBandDisplayName(band: DesignerBand): string {
  const base = BAND_LABEL_MAP[band.bandKey] ?? band.type;
  if (band.bandKey === "detail" && band.type.includes(" ")) {
    return band.type.replace("detail", "Detail");
  }
  return base;
}

function isElementMatchFinding(el: DesignerElement, finding: Finding): boolean {
  if (!finding.element_name) return false;
  const name = finding.element_name;

  // 1. Position match — most precise, works for ALL element types
  const pos = finding.details?.element_position as
    | { x: number; y: number; width: number; height: number }
    | undefined;
  if (pos && el.x === pos.x && el.y === pos.y && el.width === pos.width && el.height === pos.height) {
    return true;
  }

  // For line/rectangle/image/componentElement — ONLY position match (no text-based fallback)
  if (el.type === "line" || el.type === "rectangle" || el.type === "image" || el.type === "componentElement") {
    return false;
  }

  // 2. Expression match for textField
  if (el.expression) {
    EXPR_PARAM_RE.lastIndex = 0;
    const exprParams = el.expression.match(EXPR_PARAM_RE) ?? [];
    for (const param of exprParams) {
      if (name.includes(param)) return true;
    }
    if (name.includes(el.expression)) return true;
    if (el.expression.length > 20 && el.expression.startsWith(name.replace(/\.\.\.$/, ""))) return true;
    if (name.length >= 20 && el.expression.startsWith(name.substring(0, Math.min(name.length, 60)))) return true;
  }

  // 3. Label match for staticText only
  if (el.label && el.type === "staticText") {
    if (name.includes(el.label) && el.label.length > 3) return true;
    if (el.label.length > 20 && el.label.startsWith(name.replace(/\.\.\.$/, ""))) return true;
  }

  return false;
}

function isBandMatchFinding(band: DesignerBand, finding: Finding): boolean {
  // If finding has no band info, allow matching in ANY band (return true)
  if (!finding.element) return true;
  return band.bandKey.toLowerCase() === finding.element.toLowerCase();
}

function isBandLevelFinding(finding: Finding): boolean {
  // Band-level finding: has element (band type) but no specific element_name
  // or element_name is generic
  if (!finding.element_name) return true;
  if (finding.element_name === finding.element) return true;
  return false;
}

/* ── Main Component ──────────────────────────────────────── */

export default function DesignerPreviewPanel({
  jrxmlContent,
  findings,
  selectedFinding,
}: DesignerPreviewPanelProps) {
  const [zoom, setZoom] = useState(200);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ast = useMemo(
    () => (jrxmlContent ? parseJrxmlForDesigner(jrxmlContent) : null),
    [jrxmlContent]
  );

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 25, 250)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 25, 25)), []);
  const handleZoomReset = useCallback(() => setZoom(100), []);

  // Auto-scroll to highlighted element when finding changes
  useEffect(() => {
    if (!selectedFinding || !scrollRef.current) return;
    const timer = setTimeout(() => {
      const highlighted = scrollRef.current?.querySelector("[data-highlighted='true']");
      if (highlighted) {
        highlighted.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedFinding]);

  if (!ast) {
    return (
      <div className="flex h-full flex-col">
        <div className="panel-header">
          <Layout className="h-3.5 w-3.5" />
          <span>Designer Preview</span>
        </div>
        <div className="panel-body flex items-center justify-center">
          <span className="text-sm text-ide-text-muted">
            อัปโหลดไฟล์ .jrxml เพื่อดูตัวอย่าง Designer
          </span>
        </div>
      </div>
    );
  }

  const scale = zoom / 100;
  const contentWidth = ast.page.width - ast.page.leftMargin - ast.page.rightMargin;
  const bandLabelWidth = 110;
  const totalWidth = contentWidth + bandLabelWidth + 4;

  return (
    <div className="flex h-full flex-col">
      {/* Header with zoom controls */}
      <div className="panel-header">
        <Layout className="h-3.5 w-3.5" />
        <span>Designer Preview</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-2 text-[10px] text-ide-text-muted">
            {ast.page.width}×{ast.page.height}
          </span>
          <button
            onClick={handleZoomOut}
            className="rounded p-0.5 text-ide-text-muted hover:bg-white/10 hover:text-ide-text"
            title="ซูมออก"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setZoom(50)}
            className={`rounded px-1 py-0.5 text-[9px] ${zoom === 50 ? "bg-ide-accent/30 text-ide-accent" : "text-ide-text-muted hover:bg-white/10"}`}
          >
            50%
          </button>
          <button
            onClick={() => setZoom(75)}
            className={`rounded px-1 py-0.5 text-[9px] ${zoom === 75 ? "bg-ide-accent/30 text-ide-accent" : "text-ide-text-muted hover:bg-white/10"}`}
          >
            75%
          </button>
          <button
            onClick={handleZoomReset}
            className={`rounded px-1 py-0.5 text-[9px] ${zoom === 100 ? "bg-ide-accent/30 text-ide-accent" : "text-ide-text-muted hover:bg-white/10"}`}
          >
            100%
          </button>
          <button
            onClick={() => setZoom(150)}
            className={`rounded px-1 py-0.5 text-[9px] ${zoom === 150 ? "bg-ide-accent/30 text-ide-accent" : "text-ide-text-muted hover:bg-white/10"}`}
          >
            150%
          </button>
          <button
            onClick={() => setZoom(200)}
            className={`rounded px-1 py-0.5 text-[9px] ${zoom === 200 ? "bg-ide-accent/30 text-ide-accent" : "text-ide-text-muted hover:bg-white/10"}`}
          >
            200%
          </button>
          <button
            onClick={handleZoomIn}
            className="rounded p-0.5 text-ide-text-muted hover:bg-white/10 hover:text-ide-text"
            title="ซูมเข้า"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleZoomReset}
            className="rounded p-0.5 text-ide-text-muted hover:bg-white/10 hover:text-ide-text"
            title="รีเซ็ต"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Designer canvas — iReport 3.7.1 style */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto"
        style={{ backgroundColor: "#d4d0c8", padding: 12 }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: totalWidth,
          }}
        >
          {/* Ruler + page layout */}
          <div style={{ display: "flex", gap: 0 }}>
            {/* Band labels column (like iReport left gutter) */}
            <div
              style={{
                width: bandLabelWidth,
                flexShrink: 0,
                backgroundColor: "#d4d0c8",
              }}
            >
              {ast.bands.map((band, i) => {
                const isBandSelected = selectedFinding
                  ? isBandMatchFinding(band, selectedFinding)
                  : false;

                return (
                  <div
                    key={`label-${i}`}
                    style={{
                      height: band.height + 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingRight: 8,
                      borderBottom: "1px solid #b0a898",
                      backgroundColor: isBandSelected ? "#e8d8d0" : "transparent",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Segoe UI', 'Tahoma', sans-serif",
                        fontSize: 10,
                        fontWeight: 600,
                        color: getBandLabelColor(band.bandKey),
                        textAlign: "right",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getBandDisplayName(band)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Page (white area) */}
            <div
              style={{
                width: contentWidth + 2,
                backgroundColor: "#ffffff",
                border: "1px solid #808080",
                boxShadow: "2px 2px 4px rgba(0,0,0,0.25)",
              }}
            >
              {ast.bands.map((band, bandIdx) => {
                const isBandSelected = selectedFinding
                  ? isBandMatchFinding(band, selectedFinding)
                  : false;

                // For band-level findings (has band but no specific element), highlight all elements in that band
                const isBandLevelHighlight = selectedFinding
                  ? isBandSelected && !!selectedFinding.element && isBandLevelFinding(selectedFinding)
                  : false;

                return (
                  <div
                    key={`band-${bandIdx}`}
                    style={{
                      position: "relative",
                      height: band.height,
                      borderBottom: "1px solid #c0c0c0",
                      backgroundColor: isBandLevelHighlight
                        ? `${SEVERITY_COLORS[selectedFinding?.severity ?? "critical"]}10`
                        : "transparent",
                    }}
                  >
                    {band.elements.map((el, elIdx) => {
                      const isHighlighted = selectedFinding
                        ? isBandSelected &&
                          (isElementMatchFinding(el, selectedFinding) || isBandLevelHighlight)
                        : false;

                      return (
                        <DesignerElementBox
                          key={elIdx}
                          element={el}
                          isHighlighted={isHighlighted}
                          hasError={false}
                          severity={isHighlighted ? selectedFinding?.severity : undefined}
                        />
                      );
                    })}

                    {/* Band-level highlight border */}
                    {isBandLevelHighlight && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          border: `2px solid ${SEVERITY_COLORS[selectedFinding?.severity ?? "critical"]}`,
                          pointerEvents: "none",
                          zIndex: 10,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Element Renderer ────────────────────────────────────── */

function DesignerElementBox({
  element,
  isHighlighted,
  hasError,
  severity,
}: {
  element: DesignerElement;
  isHighlighted: boolean;
  hasError: boolean;
  severity?: Severity;
}) {
  const isLine = element.type === "line";
  const isRect = element.type === "rectangle";
  const isImage = element.type === "image";

  // Font: use JRXML font size as-is (in pt → px conversion: 1pt ≈ 1.333px)
  const fontSizePt = element.fontSize ?? (element.type === "staticText" ? 10 : 8);
  const fontSizePx = fontSizePt * 1.0; // keep 1:1 for designer accuracy at 100% zoom

  const highlightColor = severity ? SEVERITY_COLORS[severity] : "#e00000";

  if (isLine) {
    const isHoriz = element.width >= element.height;
    return (
      <div
        data-highlighted={isHighlighted}
        style={{
          position: "absolute",
          left: element.x,
          top: element.y + (isHoriz ? Math.floor(element.height / 2) : 0),
          width: isHoriz ? element.width : 1,
          height: isHoriz ? 1 : element.height,
          backgroundColor: isHighlighted ? highlightColor : "#000",
          zIndex: isHighlighted ? 5 : 1,
          boxShadow: isHighlighted ? `0 0 4px ${highlightColor}` : undefined,
        }}
        title={`line (${element.x},${element.y} ${element.width}×${element.height})`}
      />
    );
  }

  // Border logic
  const hasBorder = element.hasBox || isRect;
  let borderStyle: string;
  let boxShadow: string | undefined;

  if (isHighlighted) {
    borderStyle = `2.5px solid ${highlightColor}`;
    boxShadow = `0 0 0 1px ${highlightColor}, 0 0 8px ${highlightColor}60`;
  } else if (hasError && severity) {
    borderStyle = `2px solid ${SEVERITY_COLORS[severity]}`;
    boxShadow = `0 0 4px ${SEVERITY_COLORS[severity]}50`;
  } else if (hasBorder) {
    borderStyle = "0.5px solid #000";
  } else {
    borderStyle = "0.5px solid #c0c0c0";
  }

  const bgColor = isHighlighted
    ? `${highlightColor}12`
    : hasError && severity
    ? `${SEVERITY_COLORS[severity]}08`
    : isImage
    ? "#f5f5f5"
    : "transparent";

  if (isRect || isImage) {
    return (
      <div
        data-highlighted={isHighlighted}
        style={{
          position: "absolute",
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          border: borderStyle,
          backgroundColor: bgColor,
          boxShadow,
          zIndex: isHighlighted ? 5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
        title={`${element.type} (${element.x},${element.y} ${element.width}×${element.height})`}
      >
        {isImage && (
          <span style={{ fontSize: 9, color: "#999", fontFamily: DESIGNER_FONT }}>
            [image]
          </span>
        )}
      </div>
    );
  }

  // Text alignment
  let textAlign: "left" | "center" | "right" = "left";
  if (element.hAlign === "Center") textAlign = "center";
  else if (element.hAlign === "Right") textAlign = "right";

  return (
    <div
      data-highlighted={isHighlighted}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        border: borderStyle,
        backgroundColor: bgColor,
        overflow: "hidden",
        display: "flex",
        alignItems: "flex-start",
        padding: "1px 2px",
        boxShadow,
        zIndex: isHighlighted ? 5 : 1,
      }}
      title={`${element.type}: ${element.label}\n(${element.x},${element.y} ${element.width}×${element.height})${element.fontName ? `\nFont: ${element.fontName} ${fontSizePt}pt` : ""}`}
    >
      <span
        style={{
          fontFamily: DESIGNER_FONT,
          fontSize: fontSizePx,
          fontWeight: element.isBold ? 700 : 400,
          fontStyle: element.isItalic ? "italic" : "normal",
          color: element.type === "textField" ? "#000" : "#000",
          lineHeight: 1.2,
          overflow: "visible",
          whiteSpace: "normal",
          wordBreak: "break-all",
          width: "100%",
          textAlign,
        }}
      >
        {element.label}
      </span>
    </div>
  );
}
