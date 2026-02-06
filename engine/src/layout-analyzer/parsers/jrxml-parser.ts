import { XMLParser } from "fast-xml-parser";

// --- AST Types ---

export interface JrxmlPage {
  width: number;
  height: number;
  topMargin: number;
  bottomMargin: number;
  leftMargin: number;
  rightMargin: number;
  columnWidth: number;
}

export interface JrxmlElement {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  expression?: string;
  isStretchWithOverflow?: boolean;
  isPrintWhenDetailOverflows?: boolean;
  imageExpression?: string;
  subreportExpression?: string;
}

export interface JrxmlBand {
  type: string;
  height: number;
  elements: JrxmlElement[];
  splitType?: string;
}

export interface JrxmlField {
  name: string;
  className: string;
}

export interface JrxmlVariable {
  name: string;
  className: string;
  expression?: string;
  resetType?: string;
  calculation?: string;
}

export interface JrxmlGroup {
  name: string;
  expression?: string;
  headerBands: JrxmlBand[];
  footerBands: JrxmlBand[];
}

export interface JrxmlStyle {
  name: string;
  markup?: string;
  fontSize?: number;
}

export interface JrxmlSubreport {
  expression: string;
  bandType: string;
  depth: number;
}

export interface JrxmlAst {
  page: JrxmlPage;
  bands: JrxmlBand[];
  fields: JrxmlField[];
  variables: JrxmlVariable[];
  groups: JrxmlGroup[];
  styles: JrxmlStyle[];
  subreports: JrxmlSubreport[];
  totalElementCount: number;
  rawExpressions: string[];
}

// --- Parser ---

const BAND_TAG_MAP: Record<string, string> = {
  title: "title",
  pageHeader: "pageHeader",
  columnHeader: "columnHeader",
  detail: "detail",
  columnFooter: "columnFooter",
  pageFooter: "pageFooter",
  lastPageFooter: "lastPageFooter",
  summary: "summary",
  noData: "noData",
  background: "background",
};

const ELEMENT_TAGS = [
  "staticText",
  "textField",
  "image",
  "subreport",
  "line",
  "rectangle",
  "ellipse",
  "frame",
  "componentElement",
  "genericElement",
  "chart",
  "crosstab",
  "break",
];

function toArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function getAttr(obj: Record<string, unknown>, key: string, fallback: number): number {
  const val = obj["@_" + key];
  if (val === undefined || val === null) return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

function getStrAttr(obj: Record<string, unknown>, key: string, fallback: string): string {
  const val = obj["@_" + key];
  if (val === undefined || val === null) return fallback;
  return String(val);
}

function extractExpression(obj: unknown): string {
  if (obj === undefined || obj === null) return "";
  if (typeof obj === "string") return obj;
  if (typeof obj === "object" && obj !== null) {
    const o = obj as Record<string, unknown>;
    if ("#text" in o) return String(o["#text"]);
    if ("__cdata" in o) return String(o["__cdata"]);
  }
  return String(obj);
}

function parseElements(bandObj: Record<string, unknown>): JrxmlElement[] {
  const elements: JrxmlElement[] = [];

  for (const tag of ELEMENT_TAGS) {
    const items = toArray(bandObj[tag] as Record<string, unknown> | Record<string, unknown>[]);
    for (const item of items) {
      const re = (item["reportElement"] || {}) as Record<string, unknown>;
      const el: JrxmlElement = {
        type: tag,
        x: getAttr(re, "x", 0),
        y: getAttr(re, "y", 0),
        width: getAttr(re, "width", 0),
        height: getAttr(re, "height", 0),
      };

      if (getStrAttr(re, "stretchType", "") !== "") {
        el.isStretchWithOverflow = true;
      }

      if (getStrAttr(re, "isPrintWhenDetailOverflows", "") === "true") {
        el.isPrintWhenDetailOverflows = true;
      }

      if (tag === "textField") {
        const expr = item["textFieldExpression"];
        if (expr !== undefined) {
          el.expression = extractExpression(expr);
        }
      }

      if (tag === "image") {
        const expr = item["imageExpression"];
        if (expr !== undefined) {
          el.imageExpression = extractExpression(expr);
        }
      }

      if (tag === "subreport") {
        const expr = item["subreportExpression"];
        if (expr !== undefined) {
          el.subreportExpression = extractExpression(expr);
        }
      }

      // Recurse into frame children
      if (tag === "frame") {
        const children = parseElements(item);
        elements.push(el, ...children);
        continue;
      }

      elements.push(el);
    }
  }

  return elements;
}

function parseBand(bandObj: unknown, bandType: string): JrxmlBand | null {
  if (bandObj === undefined || bandObj === null) return null;

  const obj = bandObj as Record<string, unknown>;

  // detail band wraps in <band> child
  if (bandType === "detail") {
    const innerBand = obj["band"];
    if (innerBand === undefined) return null;
    const inner = innerBand as Record<string, unknown>;
    return {
      type: bandType,
      height: getAttr(inner, "height", 0),
      elements: parseElements(inner),
      splitType: getStrAttr(inner, "splitType", ""),
    };
  }

  const band = obj["band"];
  if (band !== undefined && band !== null) {
    const b = band as Record<string, unknown>;
    return {
      type: bandType,
      height: getAttr(b, "height", 0),
      elements: parseElements(b),
      splitType: getStrAttr(b, "splitType", ""),
    };
  }

  // Some bands are the band itself
  return {
    type: bandType,
    height: getAttr(obj, "height", 0),
    elements: parseElements(obj),
    splitType: getStrAttr(obj, "splitType", ""),
  };
}

function collectExpressions(rawXml: string): string[] {
  const exprs: string[] = [];
  const cdataPattern = /<!\[CDATA\[([\s\S]*?)\]\]>/g;
  let match = cdataPattern.exec(rawXml);
  while (match !== null) {
    exprs.push(match[1]);
    match = cdataPattern.exec(rawXml);
  }
  return exprs;
}

export function parseJrxml(rawXml: string): JrxmlAst {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    textNodeName: "#text",
    parseAttributeValue: false,
    trimValues: true,
  });

  const parsed = parser.parse(rawXml);
  const root = parsed["jasperReport"] || {};

  // Page dimensions
  const page: JrxmlPage = {
    width: getAttr(root, "pageWidth", 595),
    height: getAttr(root, "pageHeight", 842),
    topMargin: getAttr(root, "topMargin", 20),
    bottomMargin: getAttr(root, "bottomMargin", 20),
    leftMargin: getAttr(root, "leftMargin", 20),
    rightMargin: getAttr(root, "rightMargin", 20),
    columnWidth: getAttr(root, "columnWidth", 555),
  };

  // Bands
  const bands: JrxmlBand[] = [];
  for (const [tag, bandType] of Object.entries(BAND_TAG_MAP)) {
    const bandData = root[tag];
    if (bandData === undefined) continue;

    // detail can be an array of detail bands
    if (tag === "detail") {
      const details = toArray(bandData);
      for (const d of details) {
        const b = parseBand(d, bandType);
        if (b !== null) bands.push(b);
      }
    } else {
      const b = parseBand(bandData, bandType);
      if (b !== null) bands.push(b);
    }
  }

  // Fields
  const fields: JrxmlField[] = toArray(root["field"]).map(function (f: Record<string, unknown>) {
    return {
      name: getStrAttr(f, "name", ""),
      className: getStrAttr(f, "class", "java.lang.String"),
    };
  });

  // Variables
  const variables: JrxmlVariable[] = toArray(root["variable"]).map(function (v: Record<string, unknown>) {
    return {
      name: getStrAttr(v, "name", ""),
      className: getStrAttr(v, "class", "java.lang.Object"),
      expression: v["variableExpression"] ? extractExpression(v["variableExpression"]) : undefined,
      resetType: getStrAttr(v, "resetType", ""),
      calculation: getStrAttr(v, "calculation", ""),
    };
  });

  // Groups
  const groups: JrxmlGroup[] = toArray(root["group"]).map(function (g: Record<string, unknown>) {
    const headerBands: JrxmlBand[] = [];
    const footerBands: JrxmlBand[] = [];

    const gh = g["groupHeader"];
    if (gh) {
      const b = parseBand(gh, "groupHeader");
      if (b !== null) headerBands.push(b);
    }
    const gf = g["groupFooter"];
    if (gf) {
      const b = parseBand(gf, "groupFooter");
      if (b !== null) footerBands.push(b);
    }

    return {
      name: getStrAttr(g, "name", ""),
      expression: g["groupExpression"] ? extractExpression(g["groupExpression"]) : undefined,
      headerBands,
      footerBands,
    };
  });

  // Styles
  const styles: JrxmlStyle[] = toArray(root["style"]).map(function (s: Record<string, unknown>) {
    return {
      name: getStrAttr(s, "name", ""),
      markup: getStrAttr(s, "markup", ""),
      fontSize: getAttr(s, "fontSize", 0),
    };
  });

  // Subreports
  const subreports: JrxmlSubreport[] = [];
  for (const band of bands) {
    for (const el of band.elements) {
      if (el.type === "subreport" && el.subreportExpression) {
        subreports.push({
          expression: el.subreportExpression,
          bandType: band.type,
          depth: 1,
        });
      }
    }
  }

  // Total element count
  let totalElementCount = 0;
  for (const band of bands) {
    totalElementCount += band.elements.length;
  }
  for (const group of groups) {
    for (const b of group.headerBands) totalElementCount += b.elements.length;
    for (const b of group.footerBands) totalElementCount += b.elements.length;
  }

  return {
    page,
    bands,
    fields,
    variables,
    groups,
    styles,
    subreports,
    totalElementCount,
    rawExpressions: collectExpressions(rawXml),
  };
}
