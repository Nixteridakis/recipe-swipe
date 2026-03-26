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
    status: pending
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
    status: pending
---

## Progress

Completed foundation:

- [x] Next.js setup
- [x] Sanity setup + schemas + client/queries
- [x] Base recipe pages
- [x] CSS architecture baseline

Current focus:

- [x] ~~varlock-now~~
- [x] ~~recipe-selection-flow~~
- [ ] shopping-list-generation
- [ ] bring-integration
- [ ] ui-system-decision
- [ ] ui-final-pass
- [ ] netlify-production

## General Guidelines (Lean + Practical)

- Keep this plan lightweight: no heavy task-board process.
- Optimize for shipping and iteration speed over process overhead.
- Prefer local-first state for personal UX; only persist remotely when there is clear value.
- Lock architecture decisions early (UI system, Bring! strategy, env workflow) to avoid churn.
- Every major step must end with a runnable verification (manual or scripted).
- Document only decisions that affect future implementation; skip obvious notes.
- Treat deployment constraints (Netlify + Sanity + envs) as first-class, not an afterthought.

## Immediate Next Step

1. ~~Implement VarLock now~~ (completed):
   - ~~Add `.env.schema`~~
   - ~~Update scripts to run dev/build with VarLock~~
   - ~~Verify `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, and `SANITY_API_TOKEN` resolution locally~~
   - ~~Define Netlify env strategy (VarLock in CI vs Netlify UI env vars)~~

2. Implement shopping-list-generation:
   - Aggregate ingredients across selected recipes by ingredient identity
   - Normalize units and sum quantities where compatible
   - Group final list by grocery category
   - Validate with at least 3 recipes containing overlapping ingredients
