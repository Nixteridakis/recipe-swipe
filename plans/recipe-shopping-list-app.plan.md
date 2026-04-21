---
name: Recipe Shopping List App
overview: Build a personal Next.js + Sanity recipe app that lets me select recipes, generate a clean shopping list, push items to Bring!, and deploy to Netlify.
todos:
  - id: varlock-now
    content: Implement VarLock for local/dev/build env loading and document workflow
    status: completed
  - id: recipe-selection-flow
    content: Finalize recipe selection UX and state model (local-first, no auth)
    status: completed
  - id: shopping-list-generation
    content: Aggregate selected recipe ingredients with sane unit handling and category grouping
    status: completed
  - id: bring-integration
    content: Integrate Bring! push flow (API/direct if possible, fallback export/share flow)
    status: pending
  - id: ui-system-decision
    content: Decide UI strategy (single component system + switchable themes vs fixed theme) and lock design rules
    status: pending
  - id: ui-final-pass
    content: Finalize production UI (tokens, spacing, states, a11y, responsive pass)
    status: pending
  - id: netlify-production
    content: Ship to Netlify with env vars, cache/revalidation, Sanity CORS and smoke tests
    status: completed
  - id: css-swipe-discover
    content: Explore replacing Swiper in discover UX with a CSS-only swipe/scroll solution (no external carousel lib)
    status: completed
  - id: discover-reaction-buttons
    content: Fix Discover action row (dismiss / like / open recipe)—align cues, button behavior, cart updates, and a11y labels
    status: completed
  - id: discover-swipe-improvements
    content: Improve Discover swipe feel (gesture threshold, snap behavior, velocity handling, and accidental-swipe prevention)
    status: pending
  - id: import-page-demo-gif
    content: Record and add a short loopable GIF demo of the Import page flow (URL/text → parse → save)
    status: pending
---

## Progress

Completed:

- [x] ~~varlock-now~~
- [x] ~~recipe-selection-flow~~
- [x] ~~shopping-list-generation~~

Pending:

- [ ] bring-integration
- [ ] ui-system-decision
- [ ] ui-final-pass
- [x] ~~netlify-production~~
- [x] ~~css-swipe-discover~~
- [x] ~~discover-reaction-buttons~~
- [ ] discover-swipe-improvements
- [ ] import-page-demo-gif

## Baseline in Place

- Next.js setup
- Sanity setup + schemas + client/queries
- Base recipe pages
- CSS architecture baseline

## General Guidelines (Lean + Practical)

- Keep this plan lightweight: no heavy task-board process.
- Optimize for shipping and iteration speed over process overhead.
- Prefer local-first state for personal UX; only persist remotely when there is clear value.
- Lock architecture decisions early (UI system, Bring! strategy, env workflow) to avoid churn.
- Every major step must end with a runnable verification (manual or scripted).
- Document only decisions that affect future implementation; skip obvious notes.
- Treat deployment constraints (Netlify + Sanity + envs) as first-class, not an afterthought.

## Immediate Next Step

- Complete `import-page-demo-gif`:
  - Record the main happy path on `/import` at a fixed viewport; trim to a tight loop; optimize file size.
  - Add or link the asset (README, docs, or external URL—avoid huge binaries in git if needed).
  - Sanity-check: loop reads clearly at a glance.

Then: `bring-integration` (Bring! path vs fallback, push/export from cart, real list verification).

## Final Step (post-Netlify mobile testing)

- Complete `discover-swipe-improvements` last:
  - Tune swipe threshold + velocity so intentional swipes feel quick but accidental drags do not trigger.
  - Refine snap behavior and card transition timing for consistent mobile feel.
  - Verify on touch + mouse/trackpad (left/right swipe, edge cases, rapid interactions), with final pass on Netlify/mobile devices.

## discover-reaction-buttons (implementation notes)

- **Goal:** One clear mental model: dismiss (skip without cart), like/save (add to cart + advance), open (detail without changing stack—or define explicitly).
- **Current gaps:** Left cue says “Dismiss” but the control goes to the *previous* card; middle star advances + adds to cart while `aria-label` says “Next recipe”; heart opens the recipe and also adds to cart—decide whether open should add to cart or only the middle action should.
- **Verify:** Keyboard + screen reader labels match visible cues; tap each action and confirm cart + stack behavior matches copy.

## import-page-demo-gif (notes)

- Capture the main happy path on `/import` at a consistent viewport; trim to a tight loop; keep file size reasonable (palette reduction / fps).
- Decide placement: e.g. `README`, project docs, or Sanity/marketing—link the asset rather than bloating the repo if it gets large.
