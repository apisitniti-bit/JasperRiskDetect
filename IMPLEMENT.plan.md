# JasperRiskDetect — IMPLEMENT.plan

> สถาปัตยกรรมและแผนการพัฒนาระบบวิเคราะห์ความเสี่ยง JasperReports
> เวอร์ชัน: 1.0.0 | วันที่: 2026-02-06

---

## ส่วนที่ 1: REVIEW PHASE

### 1.1 สรุปกฎสำคัญจาก vercel-react-best-practices SKILL.md

ไฟล์ SKILL.md (v1.0.0, Vercel Engineering) ระบุ 57 กฎ ใน 8 หมวด เรียงตาม Impact:

| ลำดับ | หมวด | Impact | กฎที่เกี่ยวข้องกับโปรเจกต์นี้โดยตรง |
|-------|-------|--------|--------------------------------------|
| 1 | Eliminating Waterfalls | CRITICAL | `async-parallel`, `async-suspense-boundaries`, `async-api-routes` |
| 2 | Bundle Size Optimization | CRITICAL | `bundle-dynamic-imports`, `bundle-barrel-imports`, `bundle-defer-third-party` |
| 3 | Server-Side Performance | HIGH | `server-parallel-fetching`, `server-serialization`, `server-cache-react` |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | `client-swr-dedup`, `client-passive-event-listeners` |
| 5 | Re-render Optimization | MEDIUM | `rerender-derived-state-no-effect`, `rerender-functional-setstate`, `rerender-lazy-state-init` |
| 6 | Rendering Performance | MEDIUM | `rendering-content-visibility`, `rendering-conditional-render`, `rendering-hoist-jsx` |
| 7 | JavaScript Performance | LOW-MEDIUM | `js-early-exit`, `js-combine-iterations`, `js-index-maps` |
| 8 | Advanced Patterns | LOW | `advanced-init-once` |

**กฎที่มีผลกระทบสูงสุดต่อโปรเจกต์นี้:**

1. **`bundle-dynamic-imports` (CRITICAL)** — JRXML Viewer เป็น heavy component (syntax highlight, line numbering) ต้อง dynamic import ด้วย `next/dynamic` + `ssr: false`
2. **`async-suspense-boundaries` (HIGH)** — ผลวิเคราะห์ (compile result, layout findings) ควรใช้ Suspense boundary เพื่อให้ IDE shell แสดงทันที ขณะ data stream เข้า
3. **`server-parallel-fetching` (CRITICAL)** — Layout analysis + Compile analysis เป็น independent operations ต้อง parallelize ด้วย `Promise.all()`
4. **`server-serialization` (HIGH)** — ส่ง analysis result จาก RSC → Client เฉพาะ field ที่ UI ต้องใช้ ไม่ส่ง raw JRXML tree ทั้งหมด
5. **`rendering-content-visibility` (HIGH)** — Error list panel อาจมี 100+ items ใช้ `content-visibility: auto` เพื่อลด initial render cost
6. **`client-swr-dedup` (MEDIUM-HIGH)** — ใช้ SWR สำหรับ polling analysis status (กรณี async compile)
7. **`rerender-derived-state-no-effect` (MEDIUM)** — Risk score เป็น derived state จาก findings ต้อง compute ระหว่าง render ไม่ใช่ใน useEffect
8. **`advanced-init-once` (LOW)** — WebSocket/EventSource connection สำหรับ compile progress ต้อง init ครั้งเดียว

---

### 1.2 ความขัดแย้งและความเสี่ยง (Conflicts & Risks)

| # | ปัญหา | SKILL.md กำหนด | Prompt กำหนด | ความขัดแย้ง | แนวทางแก้ไข (ใช้กฎที่เข้มกว่า) |
|---|--------|----------------|--------------|-------------|-------------------------------|
| C1 | **toSorted()** | `js-tosorted-immutable`: ใช้ `.toSorted()` แทน `.sort()` | Java 6/7 only (backend) + ไม่มีข้อกำหนด frontend JS version | **ไม่ขัดแย้ง** — `.toSorted()` ใช้ใน Next.js frontend (Node 20+, modern browser) ส่วน Java backend ไม่เกี่ยว | ใช้ `.toSorted()` ใน frontend ได้ปกติ |
| C2 | **Server Actions auth** | `server-auth-actions`: ต้อง authenticate ทุก Server Action | Prompt ไม่ระบุ authentication requirement | **ไม่ขัดแย้ง แต่ต้องตัดสินใจ** | โปรเจกต์นี้เป็น internal tool — ใช้ middleware-level auth guard + ตรวจซ้ำใน Server Action ตามกฎ SKILL.md (stricter) |
| C3 | **React.cache()** | `server-cache-react`: ใช้สำหรับ per-request dedup | Prompt ต้องการ analysis ที่ stateless ต่อไฟล์ | **ไม่ขัดแย้ง** | ใช้ `React.cache()` สำหรับ rule loading (อ่าน JSON rules หลายที่ในเดียว request) |
| C4 | **LRU Cache** | `server-cache-lru`: cache ข้าม requests | Prompt: แต่ละไฟล์ต้อง analyze ใหม่ | **ขัดแย้งบางส่วน** — ไม่ควร cache analysis result เพราะไฟล์อาจเปลี่ยน | **ใช้ LRU cache เฉพาะ rule set loading** (rules ไม่เปลี่ยนระหว่าง runtime) ไม่ cache analysis result |
| C5 | **Dynamic import SSR** | `bundle-dynamic-imports`: ใช้ `ssr: false` สำหรับ heavy components | Prompt ต้องการ JRXML Viewer ที่ highlight ข้อผิดพลาด | **ไม่ขัดแย้ง** | JRXML Viewer = client-only component, ใช้ `next/dynamic` + `ssr: false` |
| C6 | **Activity component** | `rendering-activity`: ใช้ `<Activity>` สำหรับ show/hide | Prompt: 5-panel layout ที่อาจมี collapse/expand | **ไม่ขัดแย้ง** แต่ `<Activity>` ยังเป็น experimental ใน React | ใช้ได้ถ้า React version รองรับ มิฉะนั้นใช้ CSS `display: none` + preserve state ด้วย key |
| C7 | **useEffectEvent** | `advanced-use-latest`: ใช้ `useEffectEvent` | ยังเป็น experimental API | **ความเสี่ยง** — อาจไม่ stable | ใช้ ref-based pattern แทนจนกว่า `useEffectEvent` จะ stable — ตามหลัก stricter constraint (stability > bleeding edge) |

---

### 1.3 ความคลุมเครือที่ต้องตัดสินใจ (Ambiguities)

| # | ประเด็น | การตัดสินใจ | เหตุผล |
|---|---------|-------------|--------|
| A1 | **Version detection ใน JRXML** — ไฟล์ iReport 3.7.1 ไม่มี version attribute ชัดเจน | ตรวจหลายสัญญาณ: (1) `uuid` attribute = 4.x+ ปฏิเสธ, (2) namespace URI ที่เปลี่ยนใน 4.x, (3) element ใหม่เช่น `<genericElement>` | Heuristic multi-signal ปลอดภัยกว่า single check |
| A2 | **Risk score scale** — ไม่ระบุว่า 0-100 หรือไม่ | กำหนดเป็น **0–100** ทั้ง layout และ compile, CI threshold ≥80 | สอดคล้องกับ prompt ที่ระบุ `risk_score >= 80` |
| A3 | **"Safe" auto-fix scope** — ไม่นิยาม "safe" | กำหนด safe = property-level changes เท่านั้น: `isStretchWithOverflow`, `textAdjust`, band height, element positioning. **ห้าม** แก้ SQL/expression/scriptlet/subreport | ป้องกัน breaking change ใน production report |
| A4 | **PDF export engine** — ไม่ระบุว่าใช้อะไร render PDF | ใช้ `@react-pdf/renderer` หรือ `pdfkit` ฝั่ง Node.js — **ไม่ใช่** JasperReports | Jasper ใช้เฉพาะ static analysis ตาม prompt constraint |
| A5 | **.jasper binary upload** — layout analysis ต้องการ XML | Deserialize ด้วย `JRLoader.loadObject()` (3.7.1 API) → extract metadata → layout analysis ได้ แต่ compile analysis = N/A | Document limitation ชัดเจน |
| A6 | **CI mode language** — Thai only vs CI engineers อาจต้องการ English | CLI default = Thai, รองรับ `--lang=en` flag | ยืดหยุ่นแต่ default ยังเป็น Thai ตาม prompt |
| A7 | **Authentication** — Prompt ไม่ระบุ | Implement optional middleware auth (env-based toggle) + Server Action auth ตาม SKILL.md rule `server-auth-actions` | ตาม stricter constraint จาก SKILL.md |

---

## ส่วนที่ 2: IMPLEMENT.plan

### 2.1 Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │             Next.js App Router (Dark IDE Theme)            │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  TopBar: Upload │ Analyze │ Auto-Fix │ Export        │  │  │
│  │  ├──────────┬───────────────────┬───────────────────────┤  │  │
│  │  │  Left    │     Center        │     Right             │  │  │
│  │  │  Error   │  JRXML Viewer     │  Risk Score           │  │  │
│  │  │  List    │  (dynamic import) │  Summary              │  │  │
│  │  │  Panel   │  read-only +      │  (layout + compile    │  │  │
│  │  │  severity│  line highlight   │   + final)            │  │  │
│  │  │  colored │                   │                       │  │  │
│  │  ├──────────┴───────────────────┴───────────────────────┤  │  │
│  │  │  Bottom: Thai Error Explanation + Fix Checklist      │  │  │
│  │  └──────────────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────────┘
                              │ HTTP (fetch / Server Actions)
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                   Next.js API / Server Actions                    │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Upload      │  │ Version      │  │ Rule Engine           │    │
│  │ Handler     │──│ Guard        │──│ (JSON rules loader)   │    │
│  │ (multipart) │  │ (reject 4.x+)│  │ layout + compile     │    │
│  └─────────────┘  └──────┬───────┘  └──────────┬───────────┘    │
│                          │                      │                 │
│                   ┌──────▼──────────────────────▼───────────┐    │
│                   │      Analysis Orchestrator               │    │
│                   │  ┌──────────────┐  ┌──────────────────┐ │    │
│                   │  │ Layout       │  │ Compile          │ │    │
│                   │  │ Analyzer     │  │ Bridge           │ │    │
│                   │  │ (Node.js     │  │ (spawn Java      │ │    │
│                   │  │  XML parse)  │  │  subprocess)     │ │    │
│                   │  └──────────────┘  └────────┬─────────┘ │    │
│                   └─────────────────────────────┼───────────┘    │
│                                                 │                 │
│  ┌───────────────┐  ┌────────────────┐          │                │
│  │ Risk Scorer   │  │ Report Builder │          │                │
│  │ max(L,C)      │  │ (JSON + PDF)   │          │                │
│  └───────────────┘  └────────────────┘          │                │
│                                                  │                │
│  ┌───────────────┐  ┌────────────────┐          │                │
│  │ AutoFix       │  │ Diff Generator │          │                │
│  │ Engine        │──│ (unified diff) │          │                │
│  └───────────────┘  └────────────────┘          │                │
└──────────────────────────────────────────────────┼────────────────┘
                                                   │ subprocess
                                                   │ (stdin/stdout JSON)
                                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│              Java Compile Sandbox (Isolated Process)              │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  JasperReports 3.7.1 JARs (jasperreports-3.7.1.jar + deps)│ │
│  │  SecurityManager: no network, no fs write outside /tmp      │ │
│  │  Timeout: 30 seconds                                        │ │
│  │  Java source level: 1.6 / target: 1.6                      │ │
│  │  Input: JRXML file path (via stdin JSON)                    │ │
│  │  Output: Compile diagnostics JSON (via stdout)              │ │
│  │  NO database driver loaded                                  │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### 2.2 Folder Structure (App Router Compliant)

```
JasperRiskDetect/
├── .agents/
│   └── skills/
│       └── vercel-react-best-practices/    # Agent skill (read-only)
│
├── frontend/                                # Next.js Application
│   ├── next.config.ts                       # optimizePackageImports config
│   ├── tailwind.config.ts                   # Dark theme + custom tokens
│   ├── tsconfig.json
│   ├── package.json
│   │
│   ├── public/
│   │   └── locales/
│   │       └── th/                          # Thai i18n strings
│   │           └── messages.json
│   │
│   ├── app/
│   │   ├── layout.tsx                       # Root layout: dark theme shell
│   │   ├── page.tsx                         # Main IDE view (RSC)
│   │   ├── globals.css                      # Tailwind base + IDE tokens
│   │   ├── error.tsx                        # Error boundary
│   │   ├── loading.tsx                      # Root loading skeleton
│   │   │
│   │   └── api/
│   │       ├── upload/
│   │       │   └── route.ts                 # POST: file upload + version guard
│   │       ├── analyze/
│   │       │   └── route.ts                 # POST: trigger full analysis pipeline
│   │       ├── autofix/
│   │       │   └── route.ts                 # POST: generate fix diff
│   │       └── export/
│   │           └── route.ts                 # POST: JSON/PDF report generation
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── IDEShell.tsx                 # 5-panel resizable layout (client)
│   │   │   └── TopBar.tsx                   # Action buttons (client)
│   │   │
│   │   ├── panels/
│   │   │   ├── ErrorListPanel.tsx           # Left: severity-colored list (client)
│   │   │   ├── JrxmlViewerPanel.tsx         # Center: dynamic import wrapper
│   │   │   ├── RiskScorePanel.tsx           # Right: score donut/gauge (client)
│   │   │   └── ThaiExplainPanel.tsx         # Bottom: explanation + checklist (client)
│   │   │
│   │   ├── viewers/
│   │   │   └── JrxmlCodeViewer.tsx          # Heavy component (dynamic import, ssr:false)
│   │   │
│   │   ├── upload/
│   │   │   └── FileUploader.tsx             # Drag-and-drop upload (client)
│   │   │
│   │   ├── autofix/
│   │   │   ├── DiffViewer.tsx               # Unified diff display (dynamic import)
│   │   │   └── FixConfirmDialog.tsx         # Confirmation modal (client)
│   │   │
│   │   └── export/
│   │       └── ExportMenu.tsx               # JSON/PDF export dropdown (client)
│   │
│   ├── lib/
│   │   ├── api-client.ts                    # Typed fetch wrappers
│   │   ├── swr-config.ts                    # SWR global config + fetcher
│   │   ├── types.ts                         # Shared TypeScript types
│   │   ├── risk-calculator.ts               # Client-side score derivation
│   │   └── thai-messages.ts                 # Thai message lookup utility
│   │
│   └── hooks/
│       ├── useAnalysis.ts                   # SWR-based analysis state
│       ├── useFileUpload.ts                 # Upload state + progress
│       └── useAutoFix.ts                    # AutoFix state + diff
│
├── engine/                                  # Node.js Analysis Engine
│   ├── package.json
│   ├── tsconfig.json
│   │
│   ├── src/
│   │   ├── index.ts                         # Engine entry point (library export)
│   │   │
│   │   ├── version-guard/
│   │   │   ├── detector.ts                  # Multi-signal version detection
│   │   │   └── signals.ts                   # Individual signal checks
│   │   │
│   │   ├── layout-analyzer/
│   │   │   ├── analyzer.ts                  # Main layout analysis orchestrator
│   │   │   ├── parsers/
│   │   │   │   ├── jrxml-parser.ts          # XML → structured AST
│   │   │   │   └── jasper-loader.ts         # .jasper binary → metadata
│   │   │   ├── checks/
│   │   │   │   ├── band-overflow.ts         # Band height vs page height
│   │   │   │   ├── element-overlap.ts       # Element collision detection
│   │   │   │   ├── memory-estimation.ts     # Estimated memory usage
│   │   │   │   ├── subreport-depth.ts       # Nested subreport detection
│   │   │   │   ├── image-size.ts            # Embedded image size check
│   │   │   │   └── pagination-risk.ts       # Page break calculation
│   │   │   └── index.ts
│   │   │
│   │   ├── compile-bridge/
│   │   │   ├── bridge.ts                    # Spawn Java subprocess + timeout
│   │   │   ├── protocol.ts                  # stdin/stdout JSON protocol types
│   │   │   └── result-parser.ts             # Parse Java output → findings
│   │   │
│   │   ├── rule-engine/
│   │   │   ├── engine.ts                    # Load rules, match findings
│   │   │   ├── schema-validator.ts          # Validate rule JSON structure
│   │   │   └── types.ts                     # Rule type definitions
│   │   │
│   │   ├── risk-scorer/
│   │   │   └── scorer.ts                    # Weighted score calculation
│   │   │
│   │   ├── autofix/
│   │   │   ├── fixer.ts                     # Apply safe fixes to JRXML
│   │   │   ├── strategies/
│   │   │   │   ├── stretch-overflow.ts      # Fix isStretchWithOverflow
│   │   │   │   ├── band-height.ts           # Adjust band heights
│   │   │   │   ├── element-position.ts      # Fix overlapping elements
│   │   │   │   └── text-adjust.ts           # Fix textAdjust property
│   │   │   └── diff-generator.ts            # Unified diff output
│   │   │
│   │   ├── report-builder/
│   │   │   ├── json-report.ts               # CI-friendly JSON output
│   │   │   └── pdf-report.ts                # Audit PDF generation (pdfkit)
│   │   │
│   │   └── i18n/
│   │       ├── th.ts                        # Thai error messages
│   │       └── en.ts                        # English fallback (CI mode)
│   │
│   └── rules/
│       ├── layout.rules.3.7.1.json          # 25+ layout rules
│       ├── compile.rules.3.7.1.json         # 25+ compile rules
│       └── rule-schema.json                 # JSON Schema for rule validation
│
├── compiler/                                # Java Compile Sandbox
│   ├── pom.xml                              # Maven: JasperReports 3.7.1 ONLY
│   ├── lib/                                 # Bundled JARs (if no Maven)
│   │   ├── jasperreports-3.7.1.jar
│   │   ├── commons-beanutils-1.8.0.jar
│   │   ├── commons-collections-3.2.1.jar
│   │   ├── commons-digester-1.7.jar
│   │   ├── commons-logging-1.1.jar
│   │   ├── itext-2.1.7.jar
│   │   └── groovy-all-1.7.5.jar
│   │
│   ├── src/main/java/com/jasperrisk/
│   │   ├── CompileSandbox.java              # Main: read stdin JSON, compile, write stdout JSON
│   │   ├── SecurityPolicy.java              # SecurityManager: deny net, deny fs write
│   │   ├── CompileResult.java               # POJO: compile diagnostics
│   │   └── VersionValidator.java            # Java-side version double-check
│   │
│   └── jasper.policy                        # Java security policy file
│
├── cli/                                     # CLI for CI Integration
│   ├── package.json
│   ├── bin/
│   │   └── jasper-risk-detect.ts            # CLI entry point
│   └── src/
│       ├── commands/
│       │   ├── analyze.ts                   # analyze <file> command
│       │   └── batch.ts                     # analyze-dir <directory> command
│       └── formatters/
│           ├── json.ts                      # JSON stdout formatter
│           ├── table.ts                     # Terminal table formatter
│           └── thai.ts                      # Thai text formatter
│
├── README.md                                # Thai documentation
├── IMPLEMENT.plan.md                        # This file
├── .gitignore
├── .eslintrc.json
└── turbo.json                               # Turborepo config (monorepo)
```

---

### 2.3 Frontend Component Strategy (ตาม SKILL.md)

#### 2.3.1 Server Components vs Client Components

| Component | Type | เหตุผล | SKILL.md Rule |
|-----------|------|--------|---------------|
| `app/page.tsx` | **Server** | RSC root, compose parallel children | `server-parallel-fetching` |
| `app/layout.tsx` | **Server** | Static shell, minimal serialization | `server-serialization` |
| `IDEShell.tsx` | **Client** (`'use client'`) | Interactive resize, mouse events | — |
| `TopBar.tsx` | **Client** | Button handlers, upload state | `rerender-move-effect-to-event` |
| `ErrorListPanel.tsx` | **Client** | Scrollable list, selection state | `rendering-content-visibility` |
| `JrxmlViewerPanel.tsx` | **Client** | Wrapper for dynamic import | `bundle-dynamic-imports` |
| `JrxmlCodeViewer.tsx` | **Client** (dynamic, ssr:false) | Heavy syntax highlight lib | `bundle-dynamic-imports` |
| `RiskScorePanel.tsx` | **Client** | Animated gauge, derived state | `rerender-derived-state-no-effect` |
| `ThaiExplainPanel.tsx` | **Client** | Interactive checklist | — |
| `DiffViewer.tsx` | **Client** (dynamic, ssr:false) | Heavy diff rendering | `bundle-dynamic-imports` |

#### 2.3.2 Key Patterns to Apply

**Pattern 1: Dynamic Import for Heavy Components**
```
// Per SKILL.md rule: bundle-dynamic-imports
// JrxmlViewerPanel.tsx wraps with next/dynamic
const JrxmlCodeViewer = dynamic(
  () => import('../viewers/JrxmlCodeViewer'),
  { ssr: false, loading: () => <ViewerSkeleton /> }
)
```

**Pattern 2: Suspense Boundaries for Streaming**
```
// Per SKILL.md rule: async-suspense-boundaries
// page.tsx (Server Component)
<IDEShell>
  <Suspense fallback={<ErrorListSkeleton />}>
    <ErrorListPanel />
  </Suspense>
  <Suspense fallback={<ViewerSkeleton />}>
    <JrxmlViewerPanel />
  </Suspense>
  <Suspense fallback={<ScoreSkeleton />}>
    <RiskScorePanel />
  </Suspense>
</IDEShell>
```

**Pattern 3: Minimize RSC Serialization**
```
// Per SKILL.md rule: server-serialization
// Don't pass full analysis object to client
// Only pass: findings[], scores, file metadata
```

**Pattern 4: SWR for Analysis Polling**
```
// Per SKILL.md rule: client-swr-dedup
// useAnalysis hook uses SWR for:
// - Deduplication across panels
// - Auto-refresh on revalidation
// - Shared cache between ErrorListPanel and RiskScorePanel
```

**Pattern 5: Derived State (No Effect)**
```
// Per SKILL.md rule: rerender-derived-state-no-effect
// RiskScorePanel derives final score during render:
const finalScore = Math.max(layoutScore, compileScore)
// NOT: useEffect(() => setFinalScore(...), [layoutScore, compileScore])
```

**Pattern 6: content-visibility for Error List**
```
// Per SKILL.md rule: rendering-content-visibility
// ErrorListPanel items use:
.error-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 48px;
}
```

**Pattern 7: Functional setState**
```
// Per SKILL.md rule: rerender-functional-setstate
// All state updates based on previous state use functional form:
setFindings(curr => [...curr, ...newFindings])
```

**Pattern 8: Parallel API Route Processing**
```
// Per SKILL.md rule: async-parallel + async-api-routes
// analyze/route.ts:
const [layoutResult, compileResult] = await Promise.all([
  layoutAnalyzer.analyze(jrxmlContent),
  compileBridge.compile(filePath)
])
```

---

### 2.4 Backend / Engine Modules

#### 2.4.1 Version Guard

**ความรับผิดชอบ:** ตรวจสอบว่า JRXML เข้ากันได้กับ iReport 3.7.1

**Multi-Signal Detection Strategy:**

| Signal | ตรวจพบ | ความหมาย | Action |
|--------|---------|----------|--------|
| `uuid` attribute บน `<jasperReport>` | มี | JasperReports ≥4.1.1 | **ปฏิเสธ** + Thai error |
| `xmlns` = `http://jasperreports.sourceforge.net/jasperreports` | มี | ทุกเวอร์ชัน (compatible) | ผ่าน |
| `<genericElement>` tag | มี | ≥3.5.0 (ต้องตรวจเพิ่ม) | เตือน |
| `<propertyExpression>` element | มี | ≥4.0.0 | **ปฏิเสธ** |
| `<style>` มี `markup` attribute ค่า `styled` | มี | ≥4.0.0 | **ปฏิเสธ** |
| `whenNoDataType="NoDataSection"` | มี | ≥3.7.5 | **ปฏิเสธ** |
| Java expression ใน `<![CDATA[...]]>` ใช้ syntax ≥Java 8 | มี | ไม่รองรับ | **ปฏิเสธ** |

**Error message example:**
```
"ข้อผิดพลาด: ไฟล์ JRXML นี้ถูกสร้างด้วย JasperReports เวอร์ชันที่สูงกว่า 3.7.1
(ตรวจพบ attribute 'uuid' ซึ่งมีเฉพาะในเวอร์ชัน 4.1.1 ขึ้นไป)
กรุณาใช้ไฟล์ที่สร้างด้วย iReport 3.7.1 เท่านั้น"
```

#### 2.4.2 Layout Analyzer (Node.js)

**ความรับผิดชอบ:** วิเคราะห์ JRXML XML structure โดยไม่ต้อง compile

**Checks (แต่ละ check = 1+ rules):**

| Check Module | สิ่งที่ตรวจ | ความเสี่ยง |
|-------------|------------|-----------|
| `band-overflow` | Band height > page height - margins | Java Heap Space, page corruption |
| `element-overlap` | Elements ทับซ้อนกัน (x,y,w,h collision) | Rendering error, data loss |
| `memory-estimation` | จำนวน elements × estimated memory per type | OutOfMemoryError |
| `subreport-depth` | Nested subreport > 3 levels | Stack overflow, heap exhaustion |
| `image-size` | Embedded base64 image > 500KB | Heap spike per page |
| `pagination-risk` | Detail band height × expected rows > memory threshold | Multi-page heap overflow |
| `expression-complexity` | Nested ternary > 3 levels, string concatenation chains | Compile timeout |
| `field-count` | Total fields > 200 | Memory per row × pages |
| `variable-dependency` | Circular variable references | Infinite loop at compile |
| `group-nesting` | Groups > 5 levels | Memory multiplier |

#### 2.4.3 Compile Bridge (Node.js → Java)

**ความรับผิดชอบ:** เรียก Java subprocess สำหรับ dry compile

**Protocol:**
```json
// stdin → Java
{
  "action": "compile",
  "filePath": "/tmp/uploads/abc123.jrxml",
  "timeout": 30000
}

// stdout ← Java
{
  "success": false,
  "errors": [
    {
      "type": "COMPILE_ERROR",
      "line": 42,
      "column": 15,
      "message": "Cannot resolve symbol: $F{unknownField}",
      "expression": "$F{unknownField}.toString()"
    }
  ],
  "warnings": [...],
  "metrics": {
    "compileTimeMs": 1250,
    "estimatedMemoryMB": 45
  }
}
```

**Security:**
- Java `SecurityManager` with custom policy
- No `java.net.*` permissions
- No `java.io.FileOutputStream` outside `/tmp`
- Process timeout: 30 seconds (kill -9 on exceed)
- No JDBC drivers on classpath

#### 2.4.4 Rule Engine

**ความรับผิดชอบ:** จับคู่ findings กับ rules, ให้คะแนน, ให้คำอธิบายภาษาไทย

**Rule Schema (rule-schema.json):**
```json
{
  "rule_id": "LAYOUT-001",
  "severity": "critical|high|medium|low|info",
  "category": "layout|compile",
  "detection": {
    "type": "xpath|element_count|attribute_check|expression_pattern",
    "config": { ... }
  },
  "risk_weight": 15,
  "thai": {
    "title": "แถบ (Band) สูงเกินขนาดหน้ากระดาษ",
    "cause": "ความสูงของ Band มากกว่าความสูงของหน้ากระดาษลบ margin",
    "impact": "ทำให้เกิด Java Heap Space error เมื่อ render รายงาน",
    "fix": "ลดความสูงของ Band หรือย้าย element บางส่วนไปยัง Band อื่น"
  },
  "autofix": {
    "available": true,
    "strategy": "band-height",
    "safe": true
  }
}
```

**Rule matching flow:**
1. Load rules from JSON (cached with LRU — per SKILL.md `server-cache-lru` สำหรับ static data)
2. Validate rules against schema on startup
3. For each finding from layout/compile analyzer → match against rules by detection config
4. Enrich finding with Thai messages + risk weight
5. Return enriched findings array

#### 2.4.5 Risk Scorer

**ความรับผิดชอบ:** คำนวณคะแนนความเสี่ยง 0–100

**Algorithm:**
```
layout_score = min(100, sum(matched_layout_rules.map(r => r.risk_weight)))
compile_score = min(100, sum(matched_compile_rules.map(r => r.risk_weight)))
final_score = max(layout_score, compile_score)

risk_level:
  0–39   = LOW    (สีเขียว)
  40–59  = MEDIUM (สีเหลือง)
  60–79  = HIGH   (สีส้ม)
  80–100 = CRITICAL (สีแดง) → CI fails
```

**Weight distribution guideline (50+ rules):**
- critical severity: weight 15–25
- high severity: weight 8–14
- medium severity: weight 3–7
- low severity: weight 1–2
- info severity: weight 0

---

### 2.5 Data Flow

```
                     ┌─────────┐
                     │  User   │
                     └────┬────┘
                          │ 1. Upload .jrxml/.jasper
                          ▼
                   ┌──────────────┐
                   │ /api/upload  │
                   │              │
                   │ • Validate   │
                   │   file type  │
                   │ • Max 5MB    │
                   │ • Store /tmp │
                   └──────┬───────┘
                          │ 2. Return fileId + metadata
                          ▼
                   ┌──────────────┐
                   │ Version Guard│
                   │              │
                   │ • Multi-     │
                   │   signal     │
                   │   detection  │
                   │ • Reject 4.x+│◄── Thai error if rejected
                   └──────┬───────┘
                          │ 3. If passes → trigger analysis
                          ▼
                   ┌──────────────┐
                   │ /api/analyze │
                   └──────┬───────┘
                          │
              ┌───────────┼───────────┐
              │ Promise.all()         │
              ▼                       ▼
    ┌─────────────────┐    ┌──────────────────┐
    │ Layout Analyzer │    │ Compile Bridge   │
    │ (Node.js XML)   │    │ (Java subprocess)│
    │                 │    │                  │
    │ • Parse JRXML   │    │ • Spawn JVM      │
    │ • Run checks    │    │ • Send file path │
    │ • Match rules   │    │ • Receive JSON   │
    │ • Score layout  │    │ • Score compile  │
    └────────┬────────┘    └────────┬─────────┘
             │                      │
             └──────────┬───────────┘
                        │ 4. Merge findings
                        ▼
                 ┌──────────────┐
                 │ Risk Scorer  │
                 │              │
                 │ final_score  │
                 │ = max(L, C)  │
                 └──────┬───────┘
                        │ 5. Return AnalysisResult
                        ▼
              ┌─────────────────────┐
              │ Frontend (SWR)      │
              │                     │
              │ • ErrorListPanel    │◄── findings[]
              │ • JrxmlViewer      │◄── jrxml + line highlights
              │ • RiskScorePanel   │◄── scores (derived, no effect)
              │ • ThaiExplainPanel │◄── thai messages
              └─────────┬───────────┘
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
   ┌────────────┐ ┌──────────┐ ┌────────────┐
   │ Auto-Fix   │ │ Export   │ │ CI Mode    │
   │ /api/auto  │ │ /api/exp │ │ CLI stdout │
   │            │ │          │ │            │
   │ • Gen diff │ │ • JSON   │ │ • JSON out │
   │ • Confirm  │ │ • PDF    │ │ • exit 1   │
   │ • Apply    │ │          │ │   if ≥80   │
   └────────────┘ └──────────┘ └────────────┘
```

---

### 2.6 Risk Scoring Logic (Detail)

#### 2.6.1 Layout Score Calculation

```
Input: findings[] from Layout Analyzer (each matched to a rule)

For each finding:
  1. Look up rule by rule_id → get risk_weight
  2. Apply multiplier based on severity:
     - critical: ×1.0 (weight used as-is)
     - high:     ×1.0
     - medium:   ×1.0
     - low:      ×1.0
     - info:     ×0.0 (informational only)
  3. Apply count scaling (diminishing returns):
     - 1st occurrence: full weight
     - 2nd–5th occurrence of same rule: 50% weight each
     - 6th+ occurrence: 10% weight each

layout_score = min(100, floor(sum_of_weighted_findings))
```

#### 2.6.2 Compile Score Calculation

```
Input: errors[] + warnings[] from Java Compile Bridge

Mapping:
  - Compile error (cannot compile) → severity=critical, weight=25
  - Expression error → severity=high, weight=12
  - Unresolved field → severity=high, weight=10
  - Unresolved variable → severity=medium, weight=5
  - Deprecated syntax → severity=low, weight=2
  - Compile warning → severity=info, weight=0

compile_score = min(100, floor(sum))
```

#### 2.6.3 Final Score

```
final_score = max(layout_score, compile_score)

Rationale: ใช้ max() ไม่ใช่ average() เพราะ:
- ถ้า compile fail → รายงานจะไม่ทำงานแม้ layout สมบูรณ์
- ถ้า layout มีปัญหาร้ายแรง → จะ crash ที่ runtime แม้ compile ผ่าน
- max() = pessimistic approach = ปลอดภัยกว่าสำหรับระบบ hospital/government
```

---

### 2.7 CI Integration Strategy

#### 2.7.1 CLI Command

```bash
# Analyze single file
npx jasper-risk-detect analyze report.jrxml

# Analyze directory
npx jasper-risk-detect analyze-dir ./reports --recursive

# Options
--format=json|table|thai    # Output format (default: thai)
--threshold=80              # Risk score threshold (default: 80)
--lang=th|en                # Output language (default: th)
--output=report.json        # Write to file instead of stdout
--fail-on-warning           # Fail pipeline on any warning (not just critical)
```

#### 2.7.2 Exit Codes

| Code | ความหมาย |
|------|----------|
| 0 | ผ่าน: risk_score < threshold |
| 1 | ไม่ผ่าน: risk_score >= threshold |
| 2 | ข้อผิดพลาดในการวิเคราะห์ (file not found, parse error) |
| 3 | Version guard rejected (JRXML ≥4.x) |

#### 2.7.3 CI Pipeline Integration

**GitHub Actions example:**
```yaml
- name: Jasper Risk Check
  run: npx jasper-risk-detect analyze-dir ./reports --format=json --output=risk-report.json
  continue-on-error: false

- name: Upload Risk Report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: jasper-risk-report
    path: risk-report.json
```

**JSON output schema (for CI):**
```json
{
  "version": "1.0.0",
  "timestamp": "2026-02-06T14:40:00Z",
  "files": [
    {
      "path": "reports/patient-summary.jrxml",
      "version_check": "pass",
      "layout_score": 35,
      "compile_score": 0,
      "final_score": 35,
      "risk_level": "LOW",
      "findings_count": { "critical": 0, "high": 1, "medium": 3, "low": 2 },
      "findings": [...]
    }
  ],
  "summary": {
    "total_files": 12,
    "passed": 10,
    "failed": 2,
    "max_score": 85,
    "threshold": 80
  }
}
```

---

### 2.8 Key Technical Decisions Summary

| # | การตัดสินใจ | เหตุผล | SKILL.md Rule |
|---|-------------|--------|---------------|
| D1 | Monorepo (Turborepo) | frontend + engine + compiler + cli แยก concern ชัด | — |
| D2 | JRXML Viewer ใช้ dynamic import | Heavy component (~300KB+) ไม่ควรอยู่ใน initial bundle | `bundle-dynamic-imports` |
| D3 | DiffViewer ใช้ dynamic import | ใช้เฉพาะเมื่อ auto-fix active | `bundle-conditional` |
| D4 | Analysis result ใช้ SWR | Dedup across 4 panels ที่ใช้ข้อมูลเดียวกัน | `client-swr-dedup` |
| D5 | Risk score = derived state | Compute ระหว่าง render, ไม่ใช้ useEffect | `rerender-derived-state-no-effect` |
| D6 | Error list ใช้ content-visibility | อาจมี 100+ items, skip paint สำหรับ off-screen | `rendering-content-visibility` |
| D7 | API routes ใช้ Promise.all() | Layout + Compile analysis เป็น independent | `async-parallel` |
| D8 | Rule files ใช้ LRU cache | Rules ไม่เปลี่ยนระหว่าง runtime, cache across requests | `server-cache-lru` |
| D9 | Direct imports (ไม่ผ่าน barrel) | ป้องกัน barrel file bloat | `bundle-barrel-imports` |
| D10 | Functional setState ทุกที่ | Prevent stale closures ใน async analysis flow | `rerender-functional-setstate` |
| D11 | Conditional rendering ใช้ ternary | Error panels อาจมี count=0, ต้อง render null ไม่ใช่ "0" | `rendering-conditional-render` |
| D12 | Preload JRXML Viewer on hover | Upload button hover → preload viewer bundle | `bundle-preload` |

---

### 2.9 Risks & Mitigations

| # | ความเสี่ยง | ระดับ | มาตรการ |
|---|-----------|-------|---------|
| R1 | Java sandbox escape | สูง | SecurityManager + no-write policy + process timeout 30s + no network permissions |
| R2 | Large JRXML DoS | กลาง | Max 5MB upload, max 10,000 elements, parse timeout 10s |
| R3 | JasperReports 3.7.1 JAR availability | กลาง | Bundle JARs in `compiler/lib/` (Apache 2.0 license) |
| R4 | Java 6/7 JDK runtime | กลาง | Compile with `-source 1.6 -target 1.6`, allow JDK 8 runtime, document in README |
| R5 | False positive version detection | ต่ำ | Multi-signal approach, require 2+ signals for rejection |
| R6 | Rule maintenance burden | ต่ำ | JSON rules with schema validation, no code change needed |
| R7 | PDF export quality | ต่ำ | Use pdfkit with Thai font support (THSarabunNew) |

---

## สรุป

แผนนี้ออกแบบตาม:
1. **ข้อจำกัดจาก Prompt** — JasperReports 3.7.1 only, Java 6/7, no DB, Thai messages
2. **กฎจาก SKILL.md** — 57 rules ของ Vercel React Best Practices ถูกนำมาใช้ในการตัดสินใจสถาปัตยกรรม frontend ทั้งหมด
3. **หลักการ Stricter Constraint** — เมื่อมีความขัดแย้ง ใช้กฎที่เข้มงวดกว่าเสมอ (เช่น LRU cache เฉพาะ rules ไม่ cache analysis results)

พร้อมสำหรับขั้นตอนถัดไป: สร้าง starter repository structure ตามแผนนี้
