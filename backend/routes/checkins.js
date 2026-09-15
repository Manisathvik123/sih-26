import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { scoreRisk } from "../utils/riskScorer.js";
import { generateExplanation, generateRecommendation } from "../services/aiGateway.js";

const router = Router();

const SLIDER_FIELDS = ["stress_level", "sleep_quality", "mood", "energy", "fatigue"];

function validateCheckinBody(body) {
  if (!body || typeof body !== "object") return "Request body is required.";
  if (!body.personnel_id || typeof body.personnel_id !== "string") return "personnel_id is required.";
  for (const field of SLIDER_FIELDS) {
    const v = body[field];
    if (!Number.isInteger(v) || v < 1 || v > 10) {
      return `${field} must be an integer between 1 and 10.`;
    }
  }
  if (body.note != null && typeof body.note !== "string") return "note must be a string.";
  return null;
}

// POST /api/checkins — runs the full pipeline (§9):
// validate -> save check-in -> fetch HR -> score -> explanation -> recommendation
// -> persist analysis + recommendation -> return combined result.
router.post("/", async (req, res) => {
  const body = req.body || {};

  const validationError = validateCheckinBody(body);
  if (validationError) return res.status(400).json({ error: validationError });

  // 2. Fetch personnel HR record (needed before scoring; also validates existence).
  const { data: personnel, error: personnelErr } = await supabase
    .from("personnel")
    .select("*")
    .eq("id", body.personnel_id)
    .maybeSingle();
  if (personnelErr) return res.status(500).json({ error: "Unable to load personnel record." });
  if (!personnel) return res.status(404).json({ error: "Personnel not found." });

  // 3. Deterministic scoring — validate inputs (incl. BP format) via riskScorer.
  let result;
  try {
    result = scoreRisk(personnel, body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  // 4. AI explanation + recommendation (with full fallback chain). These can
  // never change the numeric assessment; result is used read-only.
  const [explanation, recommendation] = await Promise.all([
    generateExplanation(result, personnel.department),
    generateRecommendation(result, personnel.department),
  ]);

  // 5. Persist wellness check-in.
  const { data: checkin, error: checkinErr } = await supabase
    .from("wellness_checkins")
    .insert({
      personnel_id: body.personnel_id,
      stress_level: body.stress_level,
      sleep_quality: body.sleep_quality,
      mood: body.mood,
      energy: body.energy,
      fatigue: body.fatigue,
      note: body.note ?? null,
    })
    .select()
    .single();
  if (checkinErr) return res.status(500).json({ error: "Unable to save check-in." });

  // 6. Persist stress_analysis (with the AI explanation embedded).
  const { data: analysis, error: analysisErr } = await supabase
    .from("stress_analysis")
    .insert({
      checkin_id: checkin.id,
      risk_score: result.risk_score,
      risk_level: result.risk_level,
      factor_breakdown: result.factor_breakdown,
      ai_explanation: explanation,
    })
    .select()
    .single();
  if (analysisErr) return res.status(500).json({ error: "Unable to save analysis." });

  // 7. Persist recommendation.
  const { data: recommendationRow, error: recErr } = await supabase
    .from("recommendations")
    .insert({
      analysis_id: analysis.id,
      summary: recommendation.summary,
      actions: recommendation.actions,
      priority: recommendation.priority,
    })
    .select()
    .single();
  if (recErr) return res.status(500).json({ error: "Unable to save recommendation." });

  return res.status(201).json({ checkin, stress_analysis: analysis, recommendation: recommendationRow });
});

export default router;