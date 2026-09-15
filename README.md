# PRAHARI

AI-Based Predictive Personnel Stress and Welfare Monitoring System for
Uniformed Forces — prototype for SIH 2026 Problem Statement **SIH26186**.

PRAHARI takes two inputs — synthetic HR/duty data and a personnel wellness
check-in — and **deterministically** computes a stress-risk score, then uses
AI to *explain* the already-computed factors and *generate welfare
recommendations*. The AI never calculates or changes the risk numbers.

> **Prototype limitations (read first).** HR data is synthetic. There is no
> real government-system integration. There is no medically validated model.
> This is a welfare-awareness tool, not an autonomous diagnostic system.

---

## Pipeline

```
Check-in submitted
  → Express retrieves personnel HR record
  → riskScorer.js (deterministic)
  → risk_score / risk_level / factor_breakdown
  → save stress_analysis to Supabase
  → explanation model  (NVIDIA → Groq → OpenRouter → hardcoded fallback)
  → recommendation model (NVIDIA → Groq → OpenRouter → hardcoded fallback)
  → save recommendation to Supabase
  → return full result to frontend
  → Dashboard / AI Analysis / Recommendations / Timeline update
```

---

## Architecture

```
frontend/ (React + Vite, axios, recharts)
    ├─ pages/       Dashboard, CheckIn, AIAnalysis, Recommendations, Timeline
    └─ components/  PersonnelSelector, RiskLevelBadge, FactorBreakdown, RiskTrendChart

backend/ (Node.js + Express)
    ├─ routes/      personnel, checkins, analysis
    ├─ services/    aiGateway, nvidia*, groqFallback, openrouterFallback, chatClient
    ├─ utils/       riskScorer (deterministic), promptBuilder
    ├─ config/      supabase
    └─ db/          schema.sql
```

Database: Supabase (PostgreSQL). AI primary: NVIDIA NIM; fallback chain
NVIDIA → Groq → OpenRouter → hardcoded fallback.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Charts | recharts |
| HTTP client | axios |
| AI primary | NVIDIA NIM (separate explanation + recommendation models) |
| AI fallback | Groq → OpenRouter → hardcoded fallback |

---

## Local setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # then fill in values below
npm run dev            # http://localhost:5001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api → :5001)
```

---

## Environment variables (`backend/.env`)

```
SUPABASE_URL=
SUPABASE_ANON_KEY=

NVIDIA_API_KEY=
NVIDIA_EXPLANATION_MODEL=meta/muse-glimmer-30b
NVIDIA_RECOMMENDATION_MODEL=meta/muse-glimmer-30b

GROQ_API_KEY=
GROQ_MODEL=qwen/qwen3.8-27b

OPENROUTER_API_KEY=
OPENROUTER_MODEL=nex-agi/nex-n2.5-pro:free

PORT=5001
```

Keys are never hardcoded and never referenced from frontend code.

---

## Supabase setup + schema

1. Create a Supabase project.
2. Run `backend/db/schema.sql` in the Supabase SQL editor. It creates exactly
   four tables: `personnel`, `wellness_checkins`, `stress_analysis`,
   `recommendations`. No additional tables.
3. Copy the project URL and anon key into `backend/.env`.

### Seeding personnel (synthetic HR data)

```bash
cd backend
node seed/seedPersonnel.js                  # seeds the bundled dataset (50 rows)
node seed/seedPersonnel.js path/data.json   # or .csv
```

Expected row shape:

```
{ id, name, department, overtime_hours, blood_pressure, pulse_rate }
```

The bundled dataset (`backend/seed/data/personnel.json`) is derived from
`synthetic_military_hr_dataset.xlsx` (50 synthetic rows). **Field note:** the
source workbook stores `blood_pressure` as a single systolic integer (e.g.
`128`); the formula requires `"SYS/DIA"`, so diastolic is derived as
`systolic − 40` (pulse pressure 40, matching the `120/80` reference). The
original systolic value is preserved verbatim.

---

## AI provider + fallback architecture

All three providers use OpenAI-compatible `/chat/completions`. One shared
client (`services/chatClient.js`) enforces an **8s timeout** per call.

The centralized gateway (`services/aiGateway.js`) is the only place fallback
logic lives. For both explanation and recommendation it walks, in order:

```
NVIDIA → Groq → OpenRouter → hardcoded fallback
```

with **1 retry per provider** and **structured-JSON validation** at each step.
Malformed output is rejected and falls through. On total failure a hardcoded
fallback is returned, so **the deterministic risk score is always available**
regardless of AI availability. Raw provider errors are never surfaced to the
frontend.

---

## Deterministic formula (plain language)

The risk score is a **weighted sum** of normalized factors, each scaled to
0–100, using fixed weights that sum to exactly 1.00:

| Factor | Weight | Meaning |
|---|---|---|
| overtime | 0.25 | overtime hours vs. a 24h reference |
| blood pressure | 0.20 | systolic + diastolic vs. healthy bands |
| pulse | 0.15 | pulse rate vs. a 60–120 band |
| stress level | 0.15 | self-reported 1–10 |
| sleep quality | 0.10 | lower sleep → higher risk |
| fatigue | 0.10 | self-reported 1–10 |
| energy | 0.05 | lower energy → higher risk |

`risk_score = round(Σ normalizedFactor × weight)`.

`risk_level`: **HIGH** if `≥ 70`, **MODERATE** if `≥ 40`, otherwise **LOW**.

`factor_breakdown` lists each factor's `contributionPct`
(`round(normalizedScore × weight)`), sorted descending. This is computed by
the backend only — the LLM never generates the numbers.

`mood` is stored but **not** scored.

---

## Run instructions

- Backend: `cd backend && npm run dev`
- Frontend: `cd frontend && npm run dev`
- Tests (risk scorer): `cd backend && npm test`

---

## API

```
GET  /api/personnel
GET  /api/personnel/:id
POST /api/checkins                    {personnel_id, stress_level, sleep_quality,
                                       mood, energy, fatigue, note}
GET  /api/analysis/:checkinId
GET  /api/personnel/:id/timeline
```

---

## Prototype limitations (explicit)

- HR data is **synthetic**; no real government-system integration exists.
- No **medically validated** model; output is welfare-awareness only, never a
  diagnosis.
- No auth/RBAC, admin dashboards, biometrics/wearables, mission assignment,
  or ML training.