PROJECT: AG-UI Learning Games Renderer (v1)

INTENT (for the LLM)
- Build a minimal React UI that can render multiple learning “game” types from strict JSON, emit standard events, and score locally.
- Prioritize simplicity, accessibility, and strict schema validation. No backend required in v1.

STACK
- React + Vite + TypeScript
- Tailwind CSS + lightweight primitives (plain HTML; optional Radix later)
- Zod (validate JSON specs)
- Zustand (tiny state for attempts/timer)

DELIVERABLES
1) A <GameRenderer> component that:
   - Accepts a validated GameSpec JSON
   - Renders by type ("mcq", "ordering", "pair-match")
   - Emits events: "ready", "answer.submitted", "evaluate.requested", "time.expired"
2) Three game components: MCQ, Ordering, PairMatch (basic)
3) Local scoring for MCQ and Ordering
4) Demo page loading 2–3 sample specs from /public/specs
5) Basic a11y (keyboard nav, focus ring) + dark mode

DATA CONTRACTS (TypeScript-ish; also provide Zod)
Base:
  id: string
  type: "mcq" | "ordering" | "pair-match"
  title?: string
  prompt?: string
  instructions?: string
  timeLimitSec?: number
  metadata?: { subject?: string; tags?: string[]; difficulty?: 1|2|3|4|5 }

MCQ:
  options: { id: string; text: string }[]   // >=2
  correctOptionId: string
  explanation?: string

Ordering:
  items: string[]                            // correct order
  shuffle?: boolean

PairMatch:
  pairs: { left: string; right: string }[]   // truth pairs
  distractorsRight?: string[]

EVENTS (UI → Host)
  { kind: "ready", gameId }
  { kind: "answer.submitted", gameId, payload: any } // e.g. { optionId }, { order }, { matches }
  { kind: "evaluate.requested", gameId }
  { kind: "time.expired", gameId }

EVALUATION RESULT (Host → UI; v1 can be local)
  { gameId, correct: boolean, score: number (0..1), feedback?: string }

LOCAL SCORING (v1)
- MCQ: correctOptionId match → score 1 else 0.
- Ordering: exact match → 1 else 0. (Future: partial credit)
- PairMatch: v1 submit only; scoring can be stubbed (0/1 exact).

UI BEHAVIOUR
- On mount: validate spec with Zod; if invalid → show small error card with copyable JSON.
- Emit "ready" once.
- Render game; on Submit → emit "answer.submitted"; run local scoring if possible; show feedback.
- Prevent double submit; allow "Try again" if time allows.
- Optional timer: if timeLimitSec elapses → emit "time.expired" and disable inputs.

ACCESSIBILITY
- Keyboard: Tab/Shift+Tab through all controls.
- Visible focus states; no color-only cues.
- aria-live region for feedback text.

FOLDER STRUCTURE
src/
  domain/
    schema.ts        // Zod + TS types
    scoring.ts
    events.ts
  components/
    GameRenderer.tsx
    games/
      MCQ.tsx
      Ordering.tsx
      PairMatch.tsx
  lib/
    store.ts         // zustand for attempts/time
  main.tsx, index.css
public/specs/
  mcq-ohmslaw.json
  ordering-spectrum.json
  pairmatch-terms.json

ACCEPTANCE CRITERIA
- Given valid JSON, renderer displays game and emits "ready".
- Submitting an answer emits "answer.submitted" with payload.
- MCQ + Ordering score locally and show feedback.
- Keyboard-only playthrough works; dark mode class supported.
- Invalid JSON → friendly error card (no crash).

SAMPLE SPECS (put in /public/specs)
MCQ:
{
  "id": "g-001",
  "type": "mcq",
  "title": "Ohm’s Law",
  "prompt": "If V stays constant and R doubles, what happens to I?",
  "options": [
    {"id":"A","text":"I doubles"},
    {"id":"B","text":"I halves"},
    {"id":"C","text":"I stays the same"},
    {"id":"D","text":"V halves"}
  ],
  "correctOptionId": "B",
  "explanation": "I = V/R → doubling R halves I.",
  "metadata": { "subject": "Physics", "difficulty": 2 }
}

Ordering:
{
  "id": "g-010",
  "type": "ordering",
  "title": "EM Spectrum (low→high)",
  "items": ["Radio","Microwave","Infrared","Visible","Ultraviolet","X-ray","Gamma"],
  "shuffle": true,
  "metadata": { "subject": "Physics", "difficulty": 2 }
}

PairMatch:
{
  "id": "g-020",
  "type": "pair-match",
  "title": "Terms → Definitions",
  "pairs": [
    {"left":"Voltage","right":"Energy per charge"},
    {"left":"Current","right":"Charge per second"},
    {"left":"Resistance","right":"Opposition to current"}
  ],
  "distractorsRight": ["Power", "Work"],
  "metadata": { "subject": "Physics", "difficulty": 2 }
}

TASK LIST (for the agent)
1) Scaffold Vite React TS + Tailwind; add Zod & Zustand.
2) Implement schema.ts (Zod for Base, MCQ, Ordering, PairMatch + union).
3) Build GameRenderer (validate → error card OR render by type; emit "ready").
4) Build MCQ.tsx, Ordering.tsx, PairMatch.tsx (simple controls + Submit).
5) scoring.ts for MCQ/Ordering; wire to Submit.
6) Demo page loads /public/specs/*.json, validates, renders first spec, has a selector to switch.
7) Add basic keyboard focus styles and aria-live for feedback.
