# SmartGrant — AI-assisted grant administration and mapping

A working prototype of **Concept 1 (SmartGrant)** from the Defra Strategic AI & Emerging
Technology Opportunity Assessment — the flagship recommendation of Stage 2, addressing
**Gap G1: accurate, timely grant/payment delivery** (ranked 1 of 10 in the Stage 1 gap
analysis).

Farmers and land managers register, apply for grants (SFI, Countryside Stewardship,
capital grants) against a land-parcel register, and track progress. RPA case officers
work a triage-prioritised casework queue, review AI-assisted mapping validation and
claim-risk flags, and record decisions — every decision human-made, with a written
rationale and full audit trail.

GOV.UK Design System–inspired styling throughout (it is **not** an official GOV.UK
product and does not use the crown or GDS Transport font).

## Run it

Requires Node.js 22.13+ (uses the built-in `node:sqlite` — no native modules).

```bash
npm install
npm start        # http://localhost:3000
```

First run seeds the SQLite database (`data/smartgrant.db`) with a demo land-parcel
register, two demo accounts and three sample applications.

| Role | Email | Password |
|---|---|---|
| Farmer | `farmer@farm.demo` | `FarmerDemo1` |
| RPA case officer | `officer@rpa.demo` | `OfficerDemo1` |

Case-officer self-registration needs the invite code `RPA-DEMO-2026`
(override with `SMARTGRANT_OFFICER_CODE`).

```bash
npm test         # unit + integration + data-integrity tests
npm run dev      # auto-restart on change
npm run seed     # (re-)seed explicitly
```

## What's in it

- **Registration, sign in and sign out** — bcrypt-hashed passwords, database-backed
  sessions (HttpOnly, SameSite cookies), CSRF protection on all authenticated forms,
  role separation (farmer vs officer).
- **Grant applications** — scheme/action/parcel journey with GOV.UK-style validation
  and error summaries; instant mapping validation of the claimed area against the
  parcel register (the prototype stand-in for LPIS + Earth-observation cross-checks).
- **Claim-risk triage** — a deterministic, explainable rules engine (`src/risk.js`)
  that prioritises the casework queue. It is **advisory only**: it never decides.
- **Casework** — filterable queue (status, scheme, priority), case view with claim
  details, mapping result, plain-English triage reasons, and decision recording that
  *requires* a written officer rationale (mandatory human-in-the-loop with an audit
  trail — the Stage 2 ethical mitigation, implemented literally).
- **Delivery reports** — live metrics aligned to the concept's success measures
  (payments on time, mapping-query rate, time to decision, cases by priority).
- **Evidence page** (`/about`) — the gap, problem statement, scoring matrix,
  sensitivity analysis, roadmap and recommendation, rendered from
  `src/data/assessment.js`.

## Data integrity

`src/data/assessment.js` is the single structured snapshot of the Stage 1–2 content —
every figure transcribed verbatim from `Defra_Stage1_Evidence_Base.md` and
`Defra_Stage2_Options.md`. The UI contains no hard-coded assessment facts.

`test/scoring.test.js` is the drift guard: it recomputes all weighted totals from the
raw 1–10 scores and the weights, for the base case **and all three sensitivity
scenarios**, and asserts they equal the published Stage 2 figures exactly
(SmartGrant 8.00, FloodSight 7.80, ClearWater 7.60, OneData 6.80, TraceLink 6.55 in
the base case). If the data module ever drifts from the source, the build fails.

When Stages 1–2 are refreshed: update `src/data/assessment.js` from the new documents,
update the expected values in `test/scoring.test.js` to the newly published figures,
and run `npm test`.

The scheme *actions and payment rates* in `src/schemes.js` are demonstration data only
(marked as such in the UI) — the source documents do not publish scheme rates.

## Accessibility

Keyboard-first and WCAG 2.2 AA–minded: skip link, semantic landmarks, labelled forms
with linked error summaries, visible focus states (GOV.UK yellow), AA contrast, status
conveyed by text tags rather than colour alone, and no JavaScript required anywhere.

## Structure

```
server.js               entry point (seeds on first run)
src/app.js              Express app, Nunjucks setup
src/db.js               SQLite (node:sqlite) schema + helpers
src/auth.js             sessions, CSRF, password hashing, role guards
src/risk.js             mapping validation + claim-risk triage engine
src/schemes.js          scheme/action catalogue (demo rates)
src/seed.js             demo seed data
src/data/assessment.js  verbatim Stage 1–2 snapshot (single source of truth)
src/routes/             public, auth, farmer, officer routes
src/views/              Nunjucks templates (GOV.UK-inspired patterns)
src/public/styles.css   design system CSS
test/                   scoring integrity, risk engine, end-to-end journey
```
