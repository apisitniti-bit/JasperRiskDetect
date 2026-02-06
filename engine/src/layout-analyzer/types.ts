import type { JrxmlAst } from "./parsers/jrxml-parser";

export interface LayoutFinding {
  check_id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  message: string;
  thai_message: string;
  band_type?: string;
  element_name?: string;
  element_index?: number;
  line?: number;
  details: Record<string, unknown>;
}

export type LayoutCheck = (ast: JrxmlAst) => LayoutFinding[];
