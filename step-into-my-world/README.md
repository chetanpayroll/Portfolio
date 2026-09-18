# Step Into My World — Playable Career Simulation

A standalone, 60-second simulation of a Global Payroll Transformation Manager's
shift. The visitor does not watch the job — they work it.

## What it does
A four-panel workstation (Slack, Outlook, delivery dashboard, reconciliation
sheet) runs a live 60-second shift. Three times during that minute the visitor
is handed a real decision under a countdown:

- a parallel run closing over the variance gate on the eve of go-live,
- two escalations landing in the same minute,
- a statutory filing against an incomplete input file,
- a vendor consolidation exception,
- a segregation-of-duties conflict at bank-file cut-off.

Three of the five are drawn per run, so a second visit is a different shift.

**The clock never stops for a decision.** Letting it run out is recorded as a
call not made, because that is what happens on a real payroll cycle. Every
choice changes the workstation: ship on a bad variance and the reconciliation
sheet fills with mismatches; hold the gate and the delivery dashboard takes the
slip instead.

It ends on a scorecard — what you chose, the rule that applies, and the
arithmetic of what your choice would have cost.

## Honesty
The scenarios are fiction and stay anonymised (Client A, EMP-1042), as the rest
of the page always has. The verdict states how Chetan *decides* — a documented
rule — never a claim that he personally lived the incident just played. Every
figure quoted (the 0.5% variance gate, 54 → 4 vendors, PEPM $12.92 → $10.73,
36,720 employees, 54 countries) traces to `js/profile-facts.js` or to copy
published elsewhere on the site, and the QA suite asserts that rather than
trusting it.

## Technical
- **Stack**: single self-contained HTML file. No frameworks, no build step.
- **Engine**: `requestAnimationFrame` timeline with a decision state machine
  layered over it; pauses on `visibilitychange` so switching tabs does not
  silently burn the clock.
- **Fonts**: Inter (UI), JetBrains Mono (data).
- **Accessibility**: keyboard-operable decisions (1–3), 44px targets, ARIA live
  regions, `prefers-reduced-motion` honoured, pinch zoom permitted.
- **No JavaScript**: says so plainly and points at `/experience`, rather than
  presenting a dead button.

## Usage
Open `index.html` in any modern browser and press **Start the Shift**.
