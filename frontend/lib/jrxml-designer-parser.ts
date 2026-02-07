/**
 * Client-side lightweight JRXML parser for the Designer Preview.
 * Extracts bands + elements with position/size for visual rendering.
 */

export interface DesignerElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  key?: string;
  expression?: string;
  fontName?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  hasBox?: boolean;
  hAlign?: string;
}

export interface DesignerBand {
  type: string;
  bandKey: string;
  height: number;
  elements: DesignerElement[];
}

export interface DesignerPage {
  width: number;
  height: number;
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
}

export interface DesignerAST {
  page: DesignerPage;
  bands: DesignerBand[];
}

const BAND_TAGS = [
  "title",
  "pageHeader",
  "columnHeader",
  "detail",
  "columnFooter",
  "pageFooter",
  "summary",
  "lastPageFooter",
  "background",
  "noData",
];

const ELEMENT_TAGS = ["staticText", "textField", "image", "subreport", "line", "rectangle", "ellipse", "frame", "componentElement"];

function getAttr(el: Element, name: string, fallback = 0): number {
  const v = el.getAttribute(name);
  return v ? parseInt(v, 10) || fallback : fallback;
}

function getStrAttr(el: Element, name: string): string | undefined {
  return el.getAttribute(name) || undefined;
}

function getElementLabel(el: Element, type: string): string {
  if (type === "staticText") {
    const textEl = el.querySelector("text");
    if (textEl?.textContent) {
      return textEl.textContent.trim();
    }
  }
  if (type === "textField") {
    const expr = el.querySelector("textFieldExpression");
    if (expr?.textContent) {
      return expr.textContent.trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    }
  }
  if (type === "image") return "[image]";
  if (type === "subreport") return "[subreport]";
  if (type === "componentElement") return "[component]";
  if (type === "line") return "";
  if (type === "rectangle") return "";
  return type;
}

function getExpression(el: Element, type: string): string | undefined {
  if (type === "textField") {
    const expr = el.querySelector("textFieldExpression");
    if (expr?.textContent) {
      return expr.textContent.trim().replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    }
  }
  return undefined;
}

function hasBoxBorder(el: Element): boolean {
  const box = el.querySelector("box");
  if (!box) return false;
  const pen = box.querySelector("pen, topPen, bottomPen, leftPen, rightPen");
  return !!pen;
}

function parseElements(bandEl: Element): DesignerElement[] {
  const results: DesignerElement[] = [];
  for (const tag of ELEMENT_TAGS) {
    const els = bandEl.getElementsByTagName(tag);
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const rp = el.querySelector("reportElement");
      if (!rp) continue;

      let fontName: string | undefined;
      let fontSize: number | undefined;
      let isBold = false;
      let isItalic = false;
      const font = el.querySelector("font");
      if (font) {
        fontName = getStrAttr(font, "fontName");
        const fs = font.getAttribute("size");
        if (fs) fontSize = parseInt(fs, 10) || undefined;
        isBold = font.getAttribute("isBold") === "true";
        isItalic = font.getAttribute("isItalic") === "true";
      }

      let hAlign: string | undefined;
      const textEl = el.querySelector("textElement");
      if (textEl) {
        hAlign = getStrAttr(textEl, "textAlignment");
      }

      results.push({
        type: tag,
        x: getAttr(rp, "x"),
        y: getAttr(rp, "y"),
        width: getAttr(rp, "width", 100),
        height: getAttr(rp, "height", 20),
        label: getElementLabel(el, tag),
        key: getStrAttr(rp, "key"),
        expression: getExpression(el, tag),
        fontName,
        fontSize,
        isBold,
        isItalic,
        hasBox: hasBoxBorder(el),
        hAlign,
      });
    }
  }
  return results;
}

export function parseJrxmlForDesigner(xml: string): DesignerAST | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");

    const jasper = doc.querySelector("jasperReport");
    if (!jasper) return null;

    const page: DesignerPage = {
      width: getAttr(jasper, "pageWidth", 595),
      height: getAttr(jasper, "pageHeight", 842),
      leftMargin: getAttr(jasper, "leftMargin", 20),
      rightMargin: getAttr(jasper, "rightMargin", 20),
      topMargin: getAttr(jasper, "topMargin", 20),
      bottomMargin: getAttr(jasper, "bottomMargin", 20),
    };

    const bands: DesignerBand[] = [];

    for (const tag of BAND_TAGS) {
      const containers = jasper.getElementsByTagName(tag);
      for (let i = 0; i < containers.length; i++) {
        const container = containers[i];
        const bandEl = container.querySelector("band") || container;
        const height = getAttr(bandEl, "height", 0);
        if (height === 0 && !bandEl.querySelector("reportElement")) continue;
        const bandType = tag === "detail" ? `detail ${i + 1}` : tag;
        bands.push({
          type: bandType,
          bandKey: tag,
          height: Math.max(height, 1),
          elements: parseElements(bandEl),
        });
      }
    }

    return { page, bands };
  } catch {
    return null;
  }
}
