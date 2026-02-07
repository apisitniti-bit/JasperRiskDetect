# Prompt: Error Visual Preview & Screenshot Feature

You are Claude Opus 4.6 Thinking, operating inside Windsurf IDE.

## PROJECT CONTEXT

You are working on **JasperRiskDetect** — a static analysis tool for iReport 3.7.1 `.jrxml` files.

Tech stack:
- Frontend: Next.js 15 App Router + Tailwind CSS + Lucide icons
- UI: 5-panel dark IDE layout (TopBar, Left=ErrorListPanel, Center=JrxmlViewerPanel+ThaiExplainPanel, Right=RiskScorePanel)
- State: IDEShell.tsx manages all state, passes props down
- JRXML Viewer: JrxmlCodeViewer.tsx renders XML with syntax highlighting and line-level error highlighting
- Findings: Each Finding has `rule_id`, `severity`, `line`, `column`, `element` (band), `element_name` (expression), `thai` (title/cause/impact/fix), `details` (elements list, static_text_ranking)

## YOUR TASK

Implement an **Error Visual Preview** feature that generates a **screenshot-like image** of the problematic section in the JRXML file, similar to how iReport 3.7.1 shows errors with red boxes around problematic elements.

## WHAT THE USER WANTS

When a user clicks on a finding (error/warning) in the ErrorListPanel:
1. Show a **visual preview image** of the exact JRXML lines where the error occurs
2. The preview should **highlight the error lines** with a red/orange box (like iReport)
3. Include context: 5-10 lines before and after the error line
4. Show the **rule_id**, **severity badge**, and **Thai title** as a header
5. Show the **element_name** (e.g. `$P{ClinicalSign}`) prominently
6. Show the **band name** (e.g. `detail`) as context
7. Add a **"📸 บันทึกภาพ"** (Save Image) button that downloads the preview as PNG

## IMPLEMENTATION PLAN

### Step 1 — Create ErrorPreviewCard Component

Create `frontend/components/ErrorPreviewCard.tsx`:
- A React component that renders a styled "screenshot card" of the error
- Uses a `ref` to capture the DOM element as an image
- Dark theme matching the IDE (bg: #1e1e1e)
- Structure:
  ```
  ┌─────────────────────────────────────────┐
  │ 🔴 LAYOUT-006 [critical]               │  ← header with severity badge
  │ ความเสี่ยงด้านหน้ากระดาษ                 │  ← Thai title
  │ Band: detail | $P{ClinicalSign}         │  ← location info
  ├─────────────────────────────────────────┤
  │  45 │   <band height="698">             │  ← context lines (dimmed)
  │  46 │     <staticText>                  │
  │  47 │       <text>Clinical Signs</text> │  ← ERROR LINE (red highlight)
  │  48 │     </staticText>                 │
  │  49 │     <textField>                   │  ← context lines (dimmed)
  ├─────────────────────────────────────────┤
  │ ปัญหา: แถบ detail มี element 62 ตัว...   │  ← Thai explanation
  │ วิธีแก้: ย้าย staticText ไป columnHeader  │  ← Thai fix (first step)
  └─────────────────────────────────────────┘
  ```

### Step 2 — Install html2canvas

Run: `npm install html2canvas` in the frontend directory.
This library captures a DOM element as a canvas/PNG.

### Step 3 — Screenshot Download Function

Inside ErrorPreviewCard:
- Use `html2canvas` to capture the card DOM as PNG
- Trigger download as `error-{rule_id}-line-{line}.png`
- Add a "📸 บันทึกภาพ" button at the bottom

### Step 4 — Integrate into ThaiExplainPanel

In `frontend/components/ThaiExplainPanel.tsx`:
- Add the ErrorPreviewCard above the existing sections
- Pass `finding` and `jrxmlContent` props
- The card should be visible when a finding is selected

### Step 5 — Pass jrxmlContent to ThaiExplainPanel

In `frontend/components/IDEShell.tsx`:
- ThaiExplainPanel currently receives only `finding`
- Add `jrxmlContent` prop so ErrorPreviewCard can extract the relevant lines

## NON-NEGOTIABLE CONSTRAINTS

1. **No new dependencies except `html2canvas`** — do not add heavy libs
2. **Dark theme only** — match existing IDE colors (#1e1e1e bg, #d4d4d4 text)
3. **Thai language** for all user-facing text
4. **Existing code style** — use Tailwind, Lucide icons, functional components
5. **Do NOT break existing functionality** — ErrorListPanel, JrxmlCodeViewer, etc. must still work
6. **Keep the code simple** — no over-engineering
7. **Severity colors must match existing**:
   - critical: `#f44747` (red)
   - high: `#ff8c00` (orange)
   - medium: `#cca700` (yellow)
   - low: `#3794ff` (blue)

## FILES YOU MUST READ BEFORE CODING

- `frontend/components/IDEShell.tsx` — main state management
- `frontend/components/ThaiExplainPanel.tsx` — where to integrate
- `frontend/components/JrxmlCodeViewer.tsx` — XML syntax highlighting (reuse `highlightXml`)
- `frontend/lib/types.ts` — Finding type definition

## FILES YOU WILL CREATE OR MODIFY

- **CREATE**: `frontend/components/ErrorPreviewCard.tsx`
- **MODIFY**: `frontend/components/ThaiExplainPanel.tsx` — add ErrorPreviewCard
- **MODIFY**: `frontend/components/IDEShell.tsx` — pass jrxmlContent to ThaiExplainPanel

## QUALITY GATE

Before delivering:
1. `npx next build` in frontend/ must succeed
2. No TypeScript errors
3. The screenshot button must produce a valid PNG
4. Thai text must display correctly in the image
5. Error highlight must be clearly visible (red/orange border-left + background)

## IMPORTANT PHILOSOPHY

- The screenshot should look like a **professional IDE error report**
- A developer should be able to share this image and the reader immediately understands:
  - WHAT is wrong
  - WHERE it is (line number + band + element)
  - HOW to fix it (Thai explanation)
- Think of it as an **automated bug report card**

Begin implementation now.
