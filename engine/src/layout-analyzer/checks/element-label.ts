import type { JrxmlElement } from "../parsers/jrxml-parser";

export function getElementLabel(el: JrxmlElement): string {
  // Priority: expression/textContent first (shows $P/$F/$V), key as fallback
  if (el.type === "textField" && el.expression) {
    return `textField: ${truncate(el.expression, 60)}`;
  }
  if (el.type === "staticText" && el.textContent) {
    return `staticText: "${truncate(el.textContent, 50)}"`;
  }
  if (el.expression) return `${el.type}: ${truncate(el.expression, 60)}`;
  if (el.textContent) return `${el.type}: "${truncate(el.textContent, 50)}"`;
  if (el.imageExpression) return `image: ${truncate(el.imageExpression, 60)}`;
  if (el.subreportExpression) return `subreport: ${truncate(el.subreportExpression, 60)}`;
  if (el.key) return `${el.type}: ${el.key}`;
  return el.type;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[\r\n]+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1) + "…";
}
