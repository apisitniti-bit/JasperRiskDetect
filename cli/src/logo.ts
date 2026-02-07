export const LOGO_ASCII = `
      ╔═══════════╗
     ╔╝           ╚╗
    ╔╝   ┌─────┐   ╚╗
    ║    │ JRD │    ║   JasperRiskDetect
    ║    └─────┘    ║   Static Analysis for iReport 3.7.1
    ║  ┌───────────┐║
    ╚╗ │ iR 3.7.1 │╔╝
     ╚╗└───────────┘╔╝
      ╚═══════════╝
`;

export const LOGO_COMPACT = `[JRD] JasperRiskDetect — iReport 3.7.1`;

export function printLogo(full = true): void {
  process.stdout.write((full ? LOGO_ASCII : LOGO_COMPACT) + "\n");
}
