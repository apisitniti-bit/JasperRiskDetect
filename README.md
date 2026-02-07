# JasperRiskDetect

<div align="center">
  <img src="/frontend/public/logo/shield-report/logo-full.svg" alt="JasperRiskDetect Logo" width="200">
</div>

> ระบบวิเคราะห์ความเสี่ยง JasperReports สำหรับ iReport 3.7.1

---

## ภาพรวม

JasperRiskDetect เป็นเครื่องมือวิเคราะห์ความเสี่ยงแบบ static สำหรับไฟล์ `.jrxml` และ `.jasper`
ที่สร้างด้วย **iReport 3.7.1 เท่านั้น** ออกแบบมาเพื่อป้องกันปัญหา Java Heap Space
ก่อนนำรายงานไปใช้งานจริงในระบบโรงพยาบาลและหน่วยงานราชการ

## ข้อจำกัดสำคัญ

- รองรับ **JasperReports 3.7.1 เท่านั้น** — ปฏิเสธเวอร์ชัน 4.x ขึ้นไปโดยอัตโนมัติ
- Java 6 / Java 7 เท่านั้น — ไม่ใช้ syntax ของ Java 8+
- **ไม่เชื่อมต่อฐานข้อมูล** ในทุกขั้นตอน
- ใช้สำหรับ static analysis และ dry compile เท่านั้น

## โครงสร้างโปรเจกต์

```
JasperRiskDetect/
├── frontend/     # Next.js App Router (UI)
├── engine/       # Node.js Analysis Engine
├── compiler/     # Java Compile Sandbox (JasperReports 3.7.1)
├── cli/          # CLI สำหรับ CI/CD Pipeline
└── .agents/      # Agent skills และมาตรฐานการพัฒนา
```

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | Next.js (App Router), Tailwind CSS, SWR |
| Engine | Node.js, TypeScript, fast-xml-parser |
| Compiler | Java 6, JasperReports 3.7.1, SecurityManager |
| CLI | Node.js, TypeScript |
| Monorepo | Turborepo |

## การติดตั้ง

```bash
npm install
npm run build
```

## การใช้งาน CI

```bash
npx jasper-risk-detect analyze <ไฟล์.jrxml>
npx jasper-risk-detect analyze-dir <โฟลเดอร์> --recursive
```

### Exit Codes

| Code | ความหมาย |
|------|----------|
| 0 | ผ่าน: risk_score < threshold |
| 1 | ไม่ผ่าน: risk_score >= threshold (default: 80) |
| 2 | ข้อผิดพลาดในการวิเคราะห์ |
| 3 | Version guard ปฏิเสธไฟล์ (JRXML ≥4.x) |

## สิทธิ์การใช้งาน

MIT

---

> **ปรัชญา:** Jasper มีไว้สำหรับ rendering ไม่ใช่ business logic
> ป้องกัน Java Heap Space **ก่อน** runtime — ปฏิเสธอย่างชัดเจน ดีกว่ายอมรับแบบเงียบ ๆ
