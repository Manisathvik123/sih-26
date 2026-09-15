# PRAHARI — Team Preparation & Technical Audit

> **Team Beacon — SIH 2026 Problem Statement SIH26186**
> "AI-Based Predictive Personnel Stress and Welfare Monitoring System for Uniformed Forces"

This document is a **read-only technical audit** of the *current* codebase, cross-referenced
against the original proposal (`TeamBEACON.pptx`). It exists to prepare the team to present the
prototype accurately and truthfully to judges.

**Source-of-truth priority (highest → lowest):**
current code → current configuration (`backend/.env`, Supabase) → current UI → Git/history →
PPT → assumptions. Where a fact could not be verified from the workspace it is explicitly marked.

> ⚠️ **Git history does not exist** — the workspace is not a git repository. The project was built
> directly on disk, so there is no commit history to trace architecture decisions.

---

## 1. What Problem SIH26186 Solves (plain-language, judge-facing)

**The problem.** Personnel in uniformed forces (police, CAPFs, paramilitary) work under sustained
physical and psychological stress: long duty hours, overtime, irregular sleep, and a culture where
reporting distress is stigmatised. Welfare checks today are **reactive** — a person reaches a
crisis before anyone notices. There is no early, objective signal that says *"this person's
workload and recovery indicators are trending toward burnout."*

**Who the users are.** (1) Individual uniformed personnel who self-report their wellness, and
(2) welfare/medical officers who need a *screen* of who may need a follow-up conversation.

**The pain point.** Burnout and stress are invisible until they are severe; welfare intervention is
one-off and late; reporting is hindered by stigma.

**What PRAHARI intends to accomplish.** Give welfare officers a lightweight, transparent **early
warning flag** — a numeric risk score plus a plain-language explanation and suggested follow-up —
so a human officer can decide to reach out *before* a crisis, without any medical label being
attached.

**Role of AI.** AI does **not** compute the risk. The risk score is a deterministic, weighted
formula. AI's only jobs are (1) *explaining* the already-computed score in plain language and
(2) *generating* welfare recommendations. This keeps the risk signal explainable, reproducible,
and independent of any AI model behaving unpredictably.

**Out of scope (this prototype).** Authentication/roles, medical/psychiatric diagnosis,
biometrics/wearables (HRV), real government-system integration, ML model training, mission
assignment/deployment optimization, offline/multilingual apps, and psychometric modules (PHQ-9 /
GAD-7 / PSS). These are future work, not current features.

---

## 2. Current Stack — forensic findings

| Layer | Actual technology (verified) |
|---|---|
| Frontend | **React 18** + **Vite 5** (build tool), `react-router-dom` v7, `axios`, `recharts`, `lucide-react` |
| Backend | **Node.js** + **Express 4** (ES modules) |
| Database | **Supabase** (PostgreSQL) via `@supabase/supabase-js` |
| Backend deps | `express`, `cors`, `dotenv`, `@supabase/supabase-js` (that is the entire dependency list) |
| AI (primary) | **NVIDIA NIM** (build.nvidia.com chat/completions endpoint) |
| AI (fallback) | **Groq** → **OpenRouter** → hardcoded fallback |
| Charts | `recharts` |

**No ML libraries** are present anywhere (no `numpy`, `pandas`, `scikit-learn`, `torch`,
`tensorflow`, `xgboost`, `onnx`, etc.). **No MongoDB** anywhere. **No PHQ-9 / GAD-7 / SHAP /
federated-learning code.**

### Exact AI providers & models (env-configured, not hardcoded in source)

| Role | Provider | Configured model |
|---|---|---|
| Explanation (primary) | NVIDIA NIM | `meta/muse-glimmer-30b` |
| Recommendation (primary) | NVIDIA NIM | `meta/muse-glimmer-30b` |
| Explanation + Recommendation (fallback 1) | Groq | `qwen/qwen3.8-27b` |
| Explanation + Recommendation (fallback 2) | OpenRouter | `nex-agi/nex-n2.5-pro:free` |

Model identifiers are read from environment variables (`NVIDIA_EXPLANATION_MODEL`,
`NVIDIA_RECOMMENDATION_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL`) at runtime — they are **not
baked into code**.

> **NOT VERIFIED / CONFIG CONCERN — TEAM SHOULD CONFIRM.** `backend/.env` contains a malformed /
> duplicated `NVIDIA_EXPLANATION_MODEL` entry: an older value `google/gemma-4-31b-it` appears
> concatenated onto the `NVIDIA_API_KEY` line (missing newline), and a second, correct line
> `NVIDIA_EXPLANATION_MODEL=meta/muse-glimmer-30b` follows. The canonical/effective intent (from
> `README.md` and `.env.example`) is `meta/muse-glimmer-30b`. This stale line should be cleaned up;
> it does not affect source code but may affect runtime config if not corrected.

### Database schema (4 tables, no more)

- `personnel` — `id, name, department, overtime_hours, blood_pressure, pulse_rate`
- `wellness_checkins` — `id, personnel_id, stress_level, sleep_quality, mood, energy, fatigue, note, created_at`
- `stress_analysis` — `id, checkin_id, risk_score, risk_level, factor_breakdown, ai_explanation, created_at`
- `recommendations` — `id, analysis_id, summary, actions, priority, created_at`

Row-level security is **enabled** on all four tables with permissive `anon` policies (a deliberate
prototype shortcut — see §10 "secure/confidential" check).

---

## 3. End-to-end workflow (what happens when a check-in is submitted)

Trigger: user fills the Wellness Check-In form (stress, sleep, mood, energy, fatigue, optional note)
and clicks **Submit**.

`frontend/src/pages/CheckIn.jsx` → `submitCheckin()` → `POST /api/checkins`.

Backend `backend/routes/checkins.js` runs, **in order**:

1. **Validate** (`validateCheckinBody`) — `personnel_id` must be a string; `stress_level`,
   `sleep_quality`, `mood`, `energy`, `fatigue` must be integers 1–10; `note` optional string.
   Invalid → HTTP 400 with a clean message.
2. **Fetch HR record** — `personnel` row for `personnel_id` from Supabase. Missing → 404.
3. **Score** (`utils/riskScorer.js → scoreRisk`) — deterministic. Produces
   `{ risk_score, risk_level, factor_breakdown }`. Invalid BP format → 400.
4. **Generate explanation + recommendation in parallel** (`services/aiGateway.js`) — walks the
   fallback chain NVIDIA → Groq → OpenRouter → hardcoded fallback for *each* of the two outputs.
   The numeric result is passed **read-only**; the models cannot change it.
5. **Persist check-in** → insert `wellness_checkins`.
6. **Persist analysis** → insert `stress_analysis` (includes `ai_explanation` JSON).
7. **Persist recommendation** → insert `recommendations`.
8. **Return** `{ checkin, stress_analysis, recommendation }` (HTTP 201).

Frontend then navigates to **AI Analysis** (`useNavigate("/analysis")`), which reads the latest
analysis from `GET /api/personnel/:id/timeline`.

**Other reads:**
- `GET /api/personnel` — selector dropdown.
- `GET /api/personnel/:id/timeline` — timeline/analysis/recommendation/dashboard all read this one
  endpoint and pick the latest record.
- `GET /api/analysis/:checkinId` — single analysis (backend supports it; UI primarily uses timeline).

---

## 4. Risk score — exactly how it works (`backend/utils/riskScorer.js`)

This is the **only** source of `risk_score`, `risk_level`, and `factor_breakdown`. It is a
**manually-defined weighted sum** — not trained, not learned.

### Inputs (7 used; 1 stored-only)

| Input | Source | Used in score? |
|---|---|---|
| overtime_hours | personnel HR record | ✅ |
| blood_pressure ("SYS/DIA") | personnel HR record | ✅ |
| pulse_rate | personnel HR record | ✅ |
| stress_level (1–10) | check-in | ✅ |
| sleep_quality (1–10) | check-in | ✅ |
| fatigue (1–10) | check-in | ✅ |
| energy (1–10) | check-in | ✅ |
| **mood** | check-in | ❌ **stored, never scored** |
| note | check-in | ❌ stored only |

### Normalization (each factor → 0–100, then clamped)

```
overtime      = min(overtime_hours / 24 * 100, 100)

systolic, diastolic parsed from "SYS/DIA"
sysScore      = clamp((systolic  − 110) / (160 − 110) * 100, 0, 100)
diaScore      = clamp((diastolic −  70) / (100 −  70) * 100, 0, 100)
bloodPressure = (sysScore + diaScore) / 2

pulse         = clamp((pulse_rate − 60) / (120 − 60) * 100, 0, 100)
stressLevel   = stress_level / 10 * 100
sleepQuality  = 100 − (sleep_quality / 10 * 100)   // lower sleep → higher risk
fatigue       = fatigue / 10 * 100
energy        = 100 − (energy / 10 * 100)          // lower energy → higher risk
```

### Weights (sum = 1.00, manually defined)

| Factor | Weight |
|---|---|
| overtime | 0.25 |
| blood pressure | 0.20 |
| pulse | 0.15 |
| stress level | 0.15 |
| sleep quality | 0.10 |
| fatigue | 0.10 |
| energy | 0.05 |

### Formula

```
risk_score = round( Σ (normalizedFactor × weight) )
```

### Thresholds

```
risk_level = "HIGH"     if risk_score ≥ 70
             "MODERATE" if risk_score ≥ 40
             "LOW"      otherwise
```

### Factor breakdown

For each factor, `contributionPct = round(normalizedScore × weight)`, then the list is **sorted
descending by contribution**. This is what powers the "what pushed the score up" chart and the AI
explanation.

### Why each factor matters (defensible, non-clinical framing)

- **Overtime** (highest weight): a direct, objective proxy for workload exposure.
- **Blood pressure + pulse**: objective physiological indicators that can be *elevated*, tied to
  strain — never treated as a diagnosis.
- **Stress / sleep / fatigue / energy**: self-reported recovery markers.
- **Why weights are what they are**: they are **domain-informed, manually set** priorities — not
  statistically derived. This must be stated plainly; do **not** imply they were validated.

### Validation

- `blood_pressure` **must** match `^\d{2,3}/\d{2,3}$` or the request is rejected (400).
- Slider fields must be integers 1–10.
- There is a unit test suite (`backend/utils/riskScorer.test.js`) covering LOW/HIGH boundaries,
  determinism/reproducibility, factor sort order, BP-format rejection, and "mood is excluded."

---

## 5. AI / LLM — what is computed vs. what is generated

**Critical framing:** PRAHARI has *two* clearly separated mechanisms.

| | Computed by OUR backend (deterministic) | Generated by external LLM |
|---|---|---|
| risk_score | ✅ | ❌ never |
| risk_level | ✅ | ❌ never |
| factor_breakdown | ✅ | ❌ never |
| explanation summary + per-factor sentences | ❌ | ✅ |
| recommendation summary + actions + priority | ❌ | ✅ |

### The two AI calls (identical input, different instructions)

Both receive **only already-computed values** — never raw check-in data:

```json
{ "risk_level": "HIGH", "risk_score": 81,
  "factor_breakdown": [{"factor":"overtime","contributionPct":22}, ...],
  "department": "Infantry" }
```

| | Explanation | Recommendation |
|---|---|---|
| Provider | NVIDIA NIM (→ Groq → OpenRouter → fallback) | NVIDIA NIM (→ Groq → OpenRouter → fallback) |
| Purpose | plain-language explanation of the score | welfare follow-up suggestions |
| `temperature` | 0 (deterministic-ish) | 0.3 (a little variation) |
| Output shape | `{summary, explanations[]}` | `{summary, actions[], priority}` |
| Prompt guards | never change score/level; never invent factors; no diagnosis language; JSON only | never recompute assessment; practical actions; no diagnosis; JSON only |

Prompts are built in `backend/utils/promptBuilder.js`, which enforces:
- **Never change** `risk_score` / `risk_level`.
- **Never invent** factors or percentages not supplied.
- **No medical/psychiatric diagnosis language.**
- **JSON only**, with a strict output shape.

### Parsing, validation, fallback (`services/aiGateway.js`)

- Each provider returns raw text → `JSON.parse` → **shape validation** (`validExplanation` /
  `validRecommendation`).
- Chain order per call: **NVIDIA → Groq → OpenRouter → hardcoded fallback**, with **1 retry** per
  provider and an **8s timeout** (in `services/chatClient.js`).
- Any malformed/non-200/empty/timeout output is discarded and the next tier is tried.
- If every provider fails, a **hardcoded** explanation/recommendation is returned so the flow never
  breaks. The risk score is returned in all cases, regardless of AI availability.

### Training vs. inference (answering "did you train it?")

- **We did not train any model.** We call **pre-trained hosted models at inference time**
  (NVIDIA NIM, Groq, OpenRouter).
- Those models generate text by **continuing from the prompt** using weights learned during their
  (provider-side) training — not from PRAHARI data, and **not fine-tuned on PRAHARI data**.
- We constrain the output through **prompting + strict JSON schema validation + fallback**, not
  through training.

Can the AI alter our risk score? **No.** The number is computed before any AI call, stored, and
returned directly; the LLM output is a *separate* field and is validated to a fixed shape.

---

## 6. Synthetic data & AI reliability

### The dataset (verified)

- **Source file:** `synthetic_military_hr_dataset.xlsx` (bundled, normalized to
  `backend/seed/data/personnel.json`).
- **50 rows**, fields: `id, name, department, overtime_hours, blood_pressure, pulse_rate`.
- Departments: Administration, Communications, Engineering, Infantry, Logistics, Medical.
- Ranges: overtime 2–14, single systolic 115–140 (→ diastolic derived as `systolic − 40`), pulse 66–88.
- **It is synthetic** (fictional names, generated values). It is **not** real government data.
- **Normalization note:** the source workbook stored `blood_pressure` as a *single systolic
  integer* (e.g. `128`); the formula requires `"SYS/DIA"`, so diastolic is *derived* as
  `systolic − 40` (pulse pressure 40, matching the `120/80` reference). Systolic is preserved
  verbatim; diastolic is synthetic.

### Why synthetic data (professional framing)

- No access to real (and protected) personnel health data — correct and expected for a prototype.
- Synthetic data lets the team **build and test the full pipeline** (schema → scoring → AI →
  persistence → UI) without risking privacy.
- It demonstrates *mechanics*, not *medical validity*.

### Can synthetic data validate the system? **No.**

- It proves **end-to-end function**, reproducibility, and determinism.
- It does **not** prove the score correlates with real stress/burnout, and it was **not** used to
  train or validate any model (there is no trained model).

### What real-world validation would require

- Real (de-identified) personnel data across time.
- A defined ground-truth outcome (e.g. welfare referral, absence, validated clinician review).
- Retrospective or prospective evaluation of the score's correlation with that outcome
  (calibration, thresholds, sensitivity/specificity).

> **We have none of these metrics. We must not claim we do.**

### Hallucination — where it does and does not apply

- **The risk score CANNOT hallucinate.** It is arithmetic. Same inputs → same output, every time.
- **The explanation and recommendation CAN** hallucinate — they are LLM text. Our safeguards are:
  (a) the model only sees already-computed numbers (reduces room to invent facts), (b) prompting
  forbids inventing factors/percentages and diagnosis language, (c) strict JSON shape validation,
  (d) automatic fallback on bad output.
- **We have no measured hallucination rate and no measured accuracy/validation metric.** There is
  no benchmark, no evaluation harness, and no number we can honestly quote. **Do not invent one.**

---

## 7. Why these technology choices (defensible rationale)

### Frontend — React + Vite
Fast single-page app, component-based UI that maps cleanly to the five screens, large ecosystem
(`recharts` for charts, `lucide-react` for icons). Vite gives instant dev iteration for a rapid
hackathon build. No SSR/server complexities needed.

### Backend — Node.js + Express
One language across the stack; Express is minimal and sufficient for four REST endpoints; async
`fetch` is built-in for calling AI providers (no heavy HTTP client dependency).

### Database — Supabase (PostgreSQL)
- **Relational joins fit the domain** (personnel → check-ins → analyses → recommendations).
- Managed, instant setup, generous free tier — appropriate for a prototype.
- `jsonb` columns store the `factor_breakdown` and `ai_explanation`/`actions` flexibly.
- Postgres + Supabase's client SDK removed the need to write boilerplate DB plumbing.

### AI — external hosted LLMs (NVIDIA NIM primary, Groq/OpenRouter fallback)
- **Why external LLMs instead of training our own model:** training a stress-risk model would need
  a large, labelled, **real** dataset we do not have, plus substantial compute and evaluation.
  Feasibility-wise, that is out of reach for a prototype — and unjustifiable on synthetic data.
- **Why the deterministic score, not an LLM score:** a reproducible, explainable, auditable score
  is the correct engineering choice for a *screening* tool; an opaque LLM deciding someone's "risk"
  would be unsafe and hard to defend.
- **Why NVIDIA NIM primary:** build.nvidia.com hosts the running models and exposes an
  OpenAI-compatible API; the team selected the model that was actually available/provisioned on
  their account (`meta/muse-glimmer-30b`).
- **Why Groq + OpenRouter as fallback:** demo reliability. A chain means a single provider outage
  still yields an explanation/recommendation, and the deterministic score always renders.

### Why the current architecture is right for a prototype
It cleanly separates **deterministic computation** (safe, explainable, testable) from **LLM
narration** (flexible, non-critical, gracefully degradable). Every stage is independently
replaceable, and the core score is unit-tested.

---

## 8. PPT → prototype: what changed and why

| # | Original PPT (proposal) | Current implementation | Status | Professional explanation |
|---|---|---|---|---|
| 1 | React.js dashboard | React + Vite | ✅ Implemented | Same idea, modernized build tooling |
| 2 | Node.js + Express backend | Node.js + Express | ✅ Implemented | As proposed |
| 3 | **MongoDB** database | **Supabase (PostgreSQL)** | 🔄 Changed | Relational joins + `jsonb` + managed hosting fit the personnel→checkin→analysis→recommendation model better than a document store for this schema |
| 4 | Rule-based risk scoring (v1), "ML future roadmap" | Deterministic weighted scoring **implemented** | ✅ Implemented | Exactly the "v1 rule-based" part of the proposal |
| 5 | ML risk scoring (roadmap) | **Not implemented** — no ML training | ❌ Not built | No real labelled dataset exists to train on; correctly deferred |
| 6 | External LLM narration | — | ➕ Added | Not in PPT; added to provide explainability + recommendations *on top of* the rule-based score |
| 7 | PHQ-9 / GAD-7 / PSS psychometric scales | **Not implemented** | ❌ Not built | Out of scope for this prototype |
| 8 | Explainable AI (SHAP) | "Risk Assessment (calculated)" vs "AI Explanation (generated)" split | 🔄 Reframed | Explainability achieved via a *deterministic score breakdown* rather than SHAP (which needs a trained model) |
| 9 | Wearables / HRV / sleep-tracking | No wearable integration (BP+pulse are static HR fields only) | ❌ Not built | Hardware/API out of scope |
| 10 | Role-based dashboards / RBAC / anonymization / on-device encryption / audit trail | No auth, no RBAC, single shared view | ❌ Not built | Prototype has no authentication layer |
| 11 | Offline-first, multilingual | Not implemented | ❌ Not built | Future scope |

**One-sentence framing for judges:** *"Our original proposal outlined a broad, multi-modal, ML-driven
vision. During implementation we scoped the deliverable to what could be built honestly and shown
working — a deterministic, explainable risk engine with AI narration on top — and moved MongoDB →
Supabase and ML-training → hosted LLM inference as prototype and data-availability decisions."*

---

## 9. Overclaim / truth check

| Claim/term | Evidence in code | Safe to say? | Recommended wording |
|---|---|---|---|
| "AI-powered" / "uses AI" | LLM generates explanation + recommendation | ✅ (narrow) | "Uses AI for explanation and recommendations, not for the risk score" |
| "Predictive" | Score is a **rule-based** weighted sum; no trained predictive model | ⚠️ | "Rule-based risk scoring" / "early-warning indicator" — avoid "predictive model" |
| "Personalized" | Per-person risk, but score is a shared formula | ⚠️ | "Person-specific assessment using a standard scoring method" |
| "Real-time" | Synchronous request/response on submit | ⚠️ (avoid) | "Immediate on submit" — not continuous/streaming |
| "Explainable" | Factor breakdown + per-factor sentences | ✅ | "Explainable — factor contributions are computed and shown" |
| "Accurate" | No accuracy measurement exists | ❌ | "Deterministic and reproducible" (never "accurate") |
| "Validated" | Only unit tests on the formula; no clinical validation | ❌ | "Unit-tested determinism" — never "clinically validated" |
| "Secure" / "confidential" | **No auth**, permissive anon RLS policies | ❌ | "Prototype; authentication/security not implemented" |
| "Production-ready" | Prototype with fallbacks | ❌ | "Prototype demonstrating the workflow" |
| "Medical/clinical" | Explicitly forbidden in prompts and language | ❌ | "Welfare-awareness tool; not a diagnostic system" |

---

## 10. Judge question bank

### A. Basic judge

**Q1. What problem are you solving?**
- *Testing:* grasp of the problem domain.
- *Say:* Uniformed personnel face hidden, accumulating stress from long duty and poor recovery; welfare
  checks are reactive and arrive too late. We build an early-warning welfare flag.
- *Deeper:* the flag is a reproducible score + explanation so a human officer triggers follow-up early.
- *Follow-up:* "Why now?" — burnout is a systemic, under-screened issue in high-stress forces.
- *Don't claim:* that we diagnose or treat anything.

**Q2. What is PRAHARI?**
- *Testing:* clarity.
- *Say:* A web prototype that turns a personnel wellness check-in (plus their HR duty record) into a
  risk signal, an explanation, and suggested follow-up.

**Q3. Who uses it?**
- *Testing:* audience understanding.
- *Say:* Uniformed personnel self-report; welfare/medical officers review.

**Q4. Why is it useful?**
- *Testing:* value.
- *Say:* It makes stress-risk visible, explainable, and traceable over time (timeline), so support is
  early, targeted, and stigma-reducing.

### B. Technical judge

**Q5. Explain the architecture.**
- *Testing:* end-to-end understanding.
- *Answer:* React/Vite SPA → Express REST API → Supabase (PostgreSQL); deterministic scorer; LLM
  narration via NVIDIA NIM with Groq/OpenRouter fallback.

**Q6. How is the score calculated?**
- *Testing:* the formula.
- *Answer:* seven weighted factors normalized to 0–100, weighted sum, rounded; thresholds at 40 and 70.

**Q7. Why these weights/factors?**
- *Testing:* honesty about the weights.
- *Answer:* domain-informed, manually set priorities (workload heaviest, then physiology, then
  self-report). **Not statistically trained** — say this clearly.

**Q8. Why Supabase?**
- *Testing:* reasoning.
- *Answer:* relational model fits the data; managed Postgres; `jsonb` for flexible fields; fast to
  build.

**Q9. Why this frontend/backend stack?**
- *Testing:* pragmatism.
- *Answer:* one language, minimal deps, fast iteration, mature chart/icon libraries.

**Q10. How does the API flow work?**
- *Testing:* the POST pipeline.
- *Answer:* validate → fetch HR → score → (parallel) call explanation + recommendation with fallback
  chain → persist checkin/analysis/recommendation → return combined result.

**Q11. What happens when AI fails?**
- *Testing:* robustness.
- *Answer:* A three-tier fallback chain (NVIDIA→Groq→OpenRouter) each with retry/timeout, then a
  hardcoded fallback; the deterministic score always renders and data always persists.

### C. Challenging AI/ML judge (the hard ones)

**Q12. Where is your trained ML model?**
- *Testing whether we overclaim ML.*
- *Say:* There isn't one. The risk engine is a **deterministic rule-based** system — this was the
  deliberate, defensible choice for a screening tool with no real labelled data.
- *Deeper:* a trained model would require a large real dataset + outcome labels we don't have.
- *Follow-up:* "So why call it AI?" — see Q13.
- *Don't claim:* that the weights are "learned."

**Q13. Why use an external LLM? Is this really AI?**
- *Testing:* whether we understand what our "AI" actually is.
- *Say:* We use **inference** on pre-trained hosted LLMs for two narrow jobs — explanation and
  recommendation. The risk *scoring* is not AI; the *narration* is.
- *Follow-up:* "Isn't this just an API wrapper?" — Answer honestly: yes, the AI portion is prompt +
  call + schema validation; the engineering value is the deterministic engine + graceful fallback +
  explanation split.

**Q14. How was the model evaluated? What is your accuracy?**
- *Testing:* honesty about evaluation.
- *Say:* We did **not** train or benchmark; there is **no accuracy metric** we can quote. We validate
  correctness (determinism, format, validation) not clinical accuracy.

**Q15. What is your hallucination rate?**
- *Testing:* integrity.
- *Say:* We have **not measured** one. We mitigate (not eliminate) hallucination in the text layer by
  feeding only computed numbers, prompting strict JSON, shape-validating, and falling back. The
  numeric score cannot hallucinate.

**Q16. How do you trust AI recommendations?**
- *Testing:* safety reasoning.
- *Say:* We don't treat them as authoritative. They are suggestion text tied to an already-computed
  score, guarded to avoid diagnosis language, and always replaceable by a hardcoded conservative
  fallback.

**Q17. Who decided the scoring weights?**
- *Testing:* provenance.
- *Say:* The team, as domain-*informed* heuristics. They are configurable in code and not presented
  as validated.

**Q18. How does the model learn from your dataset?**
- *Testing:* detecting a misconception.
- *Say:* It doesn't. Our dataset is a small synthetic seed used only to populate the demo; no model is
  trained or updated from it.

**Q19. Why use synthetic data?**
- *Testing:* awareness of limitations.
- *Say:* We don't have access to real (protected) personnel health records. Synthetic data exercised
  the full pipeline; it does not validate the system medically.

**Q20. What happens with real government data?**
- *Testing:* deployment realism.
- *Answer:* It would require real, de-identified, governed data; explicit consent; the auth/RBAC and
  encryption layers (currently absent); and actual outcome-based evaluation of the score. This is
  future work.

**Q21. Why does your PPT differ from the prototype?**
- *Testing:* honesty/coherence.
- *Answer:* We scoped to a working, demonstrable core. MongoDB→Supabase and ML→deterministic+LLM were
  feasibility/data decisions made during the build.

**Q22. How much of the system was AI-assisted?**
- *Testing:* integrity about tools.
- *Answer:* The *system* is human-written; the *AI narration inside the product* is LLM-generated.
  (If you used AI coding assistants to *build* it, state that plainly rather than hiding it.)

---

## 11. Presentation preparation

### 30-second introduction
"PRAHARI is a welfare-awareness prototype for uniformed forces. A personnel check-in combined with
their duty record produces a single, transparent risk score, tells you *why* in plain language, and
suggests follow-up — so welfare officers can reach out early, before burnout becomes a crisis. It is
not a medical diagnostic — it's an early-warning flag for a human to act on."

### 1-minute explanation
Cover: problem → inputs → deterministic score → AI explanation/recommendation → timeline →
limitations (synthetic data, no trained model, no diagnosis).

### 10-minute structure
1. Problem (60s). 2. Live demo of the flow (3 min). 3. How the score works (2 min). 4. How AI is
used vs what is deterministic (1.5 min). 5. Architecture & fallback (1.5 min). 6. Limitations &
future (1 min).

### Live demo narration (do exactly this order)
1. Sidebar → select personnel. 2. Dashboard (empty state). 3. Wellness Check-In → set values → submit.
4. Auto-navigation to AI Analysis → point out "Risk Assessment (calculated)" vs "AI Explanation
(generated)". 5. Recommendations. 6. Timeline (history). 7. (Optional) demonstrate fallback by
explaining the chain — or, if prepared, show a stored result with AI "temporarily unavailable."

### Architecture explanation (one breath)
"React SPA → Express API → Supabase. On submit, Express validates, fetches the HR record, runs a
deterministic scorer, then calls the AI gateway (NVIDIA NIM, with Groq/OpenRouter/hardcoded fallback)
for a plain-language explanation and a recommendation, persists everything, and returns it."

### Key points every member should know
- The score formula + weights + thresholds (from §4).
- Mood is stored but NOT scored.
- AI never touches the numbers.
- The fallback chain order and the hardcoded fallback.
- Synthetic data, no trained model, no accuracy/hallucination metrics, no auth.
- MongoDB→Supabase and ML→LLM are the two big PPT changes, and how to justify them.

---

## 12. PRAHARI — LAST-MINUTE JUDGE CHEAT SHEET

1. **Problem** — hidden, accumulating stress/overtime in uniformed forces; reactive welfare checks.
2. **What it is** — deterministic risk score + LLM explanation + recommendation.
3. **Users** — personnel self-report; welfare/medical officers review.
4. **Score** — weighted sum of 7 normalized factors; thresholds 40/70 for MODERATE/HIGH.
5. **Weights** — overtime .25, BP .20, pulse .15, stress .15, sleep .10, fatigue .10, energy .05.
6. **Mood** — stored, **not** scored.
7. **AI role** — explain + recommend only; never computes the score.
8. **Models** — NVIDIA `meta/muse-glimmer-30b` primary; Groq `qwen/qwen3.8-27b`; OpenRouter
   `nex-agi/nex-n2.5-pro:free` (env-configured).
9. **Fallback** — NVIDIA → Groq → OpenRouter → hardcoded; 8s timeout + 1 retry each.
10. **Storage** — Supabase; 4 tables (personnel, checkins, analysis, recommendations).
11. **Stack** — React+Vite / Express / Supabase; axios, recharts, lucide, react-router.
12. **Training** — none; hosted inference on pre-trained LLMs.
13. **Accuracy/hallucination rate** — not measured; do not quote a number.
14. **Data** — 50 synthetic rows; systolic-only BP (diastolic derived as −40).
15. **Validation** — formula is unit-tested; **not** clinically validated.
16. **Security** — no auth/RBAC; prototype only.
17. **Real-time/predictive** — avoid; say "immediate rule-based indicator."
18. **PPT changes** — MongoDB→Supabase; ML→deterministic+LLM.
19. **Explainability** — factor breakdown, not SHAP.
20. **Wearables/phsychometrics** — not implemented.
21. **"Is it AI?"** — inference for narration; deterministic for scoring.
22. **Why external LLM** — no real training data; feasibility.
23. **Real gov data** — requires consent, encryption, RBAC, outcome evaluation (future).
24. **AI-assisted build** — state it plainly if relevant.
25. **One-liner** — "Data → Risk Calculation → Explanation → Recommendation → Timeline."

---

## 13. THINGS WE MUST NEVER CLAIM

- ❌ We trained an ML model (we did not; it's rule-based scoring + hosted LLM inference).
- ❌ Our synthetic data is real government data.
- ❌ We have clinical/medical validation.
- ❌ We have an accuracy percentage, F1, or any benchmark result.
- ❌ We have a hallucination rate/percentage.
- ❌ Security / authentication / encryption / RBAC exists (it does not).
- ❌ "Predictive" machine learning powers the score.
- ❌ Wearable/HRV biometric monitoring exists.
- ❌ PHQ-9/GAD-7/PSS are implemented.
- ❌ SHAP explainability is implemented.
- ❌ The PPT features (role dashboards, offline, multilingual, federated learning) are implemented.
- ❌ The AI can change the risk number.
- ❌ The recommendations are medically authoritative.

---

## 14. Absolute accuracy notes (read before presenting)

- **No git history exists** — this workspace is not a repo.
- **Exact AI model names are config-dependent**; the canonical values are the ones in §2, but the
  team should confirm `backend/.env` is correct (see the malformed-line note in §2).
- **Blood pressure diastolic is synthetic** (derived `systolic − 40`), not measured.
- **No accuracy / confidence / hallucination / performance metric exists anywhere in this repo.**
  Any such number would be invented.

<!-- END OF AUDIT -->