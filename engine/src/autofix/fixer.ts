import type { FixStrategy, FixProposal, FixResult, FixChange, FixContext } from "./types";
import type { Finding, Rule } from "../rule-engine/types";
import { generateUnifiedDiff, applyChanges } from "./diff-generator";
import { fixBandHeight } from "./strategies/band-height";
import { fixStretchOverflow } from "./strategies/stretch-overflow";
import { fixElementPosition } from "./strategies/element-position";

const STRATEGY_REGISTRY: Record<string, FixStrategy> = {
  "band-height": fixBandHeight,
  "stretch-overflow": fixStretchOverflow,
  "element-position": fixElementPosition,
};

const STRATEGY_DESCRIPTIONS: Record<string, { en: string; th: string }> = {
  "band-height": {
    en: "Reduce band height to fit within usable page height",
    th: "ลดความสูงของ Band ให้พอดีกับพื้นที่ใช้งานของหน้ากระดาษ",
  },
  "stretch-overflow": {
    en: "Add isStretchWithOverflow=\"true\" to textField elements",
    th: "เพิ่ม isStretchWithOverflow=\"true\" ให้กับ textField ที่ขาด",
  },
  "element-position": {
    en: "Clamp element height to fit within band boundary",
    th: "ปรับขนาด element ให้อยู่ภายในขอบเขตของ Band",
  },
};

export function getAvailableStrategies(): string[] {
  return Object.keys(STRATEGY_REGISTRY);
}

export function generateFixes(
  rawXml: string,
  findings: Finding[],
  rules: Rule[],
  filename: string
): FixResult {
  const lines = rawXml.split("\n");
  const proposals: FixProposal[] = [];
  const allChanges: FixChange[] = [];

  // Build rule map for quick lookup
  const ruleMap = new Map<string, Rule>();
  for (const rule of rules) {
    ruleMap.set(rule.rule_id, rule);
  }

  for (const finding of findings) {
    const rule = ruleMap.get(finding.rule_id);
    if (!rule) continue;
    if (!rule.autofix) continue;
    if (!rule.autofix.available) continue;
    if (!rule.autofix.safe) continue;

    const strategyName = rule.autofix.strategy;
    const strategyFn = STRATEGY_REGISTRY[strategyName];
    if (!strategyFn) continue;

    const context: FixContext = {
      rule_id: finding.rule_id,
      band_type: (finding as unknown as Record<string, unknown>)["band_type"] as string | undefined,
      details: (finding as unknown as Record<string, unknown>)["details"] as Record<string, unknown> | undefined,
    };

    const changes = strategyFn(rawXml, lines, context);
    if (changes.length === 0) continue;

    const desc = STRATEGY_DESCRIPTIONS[strategyName] || { en: strategyName, th: strategyName };

    proposals.push({
      strategy: strategyName,
      rule_id: finding.rule_id,
      description: desc.en,
      thai_description: desc.th,
      safe: true,
      changes: changes,
    });

    for (const c of changes) {
      allChanges.push(c);
    }
  }

  // Deduplicate changes by line_start (keep first)
  const seenLines = new Set<number>();
  const uniqueChanges: FixChange[] = [];
  for (const c of allChanges) {
    if (!seenLines.has(c.line_start)) {
      seenLines.add(c.line_start);
      uniqueChanges.push(c);
    }
  }

  // Generate diff (never auto-apply)
  const diff = generateUnifiedDiff(lines, uniqueChanges, filename);

  // Generate fixed XML preview (for diff display only — not saved)
  let fixedXml: string | null = null;
  if (uniqueChanges.length > 0) {
    const fixedLines = applyChanges(lines, uniqueChanges);
    fixedXml = fixedLines.join("\n");
  }

  return {
    proposals: proposals,
    original_xml: rawXml,
    fixed_xml: fixedXml,
    diff: diff,
    applied: false,
  };
}
