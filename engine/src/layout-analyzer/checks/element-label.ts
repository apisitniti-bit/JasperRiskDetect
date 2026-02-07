import type { JrxmlElement } from "../parsers/jrxml-parser";

export function getElementLabel(el: JrxmlElement): string {
  // Priority: expression/textContent first (shows $P/$F/$V), key as fallback
  if (el.type === "textField" && el.expression) {
    return `textField: ${clean(el.expression)}`;
  }
  if (el.type === "staticText" && el.textContent) {
    return `staticText: "${clean(el.textContent)}"`;
  }
  if (el.expression) return `${el.type}: ${clean(el.expression)}`;
  if (el.textContent) return `${el.type}: "${clean(el.textContent)}"`;
  if (el.imageExpression) return `image: ${clean(el.imageExpression)}`;
  if (el.subreportExpression) return `subreport: ${clean(el.subreportExpression)}`;
  if (el.key) return `${el.type}: ${el.key}`;
  return el.type;
}

function clean(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}
