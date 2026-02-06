export interface FixProposal {
  strategy: string;
  rule_id: string;
  description: string;
  thai_description: string;
  safe: boolean;
  changes: FixChange[];
}

export interface FixChange {
  line_start: number;
  line_end: number;
  original: string;
  replacement: string;
}

export interface FixResult {
  proposals: FixProposal[];
  original_xml: string;
  fixed_xml: string | null;
  diff: string;
  applied: false;
}

export type FixStrategy = (
  xml: string,
  lines: string[],
  context: FixContext
) => FixChange[];

export interface FixContext {
  rule_id: string;
  band_type?: string;
  details?: Record<string, unknown>;
}
