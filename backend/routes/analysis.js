import { Router } from "express";
import { supabase } from "../config/supabase.js";

const router = Router();

// GET /api/analysis/:checkinId — fetch one stress_analysis + its recommendation.
router.get("/:checkinId", async (req, res) => {
  const { data: analysis, error } = await supabase
    .from("stress_analysis")
    .select(`*,
      wellness_checkins (*),
      recommendations (*)
    `)
    .eq("checkin_id", req.params.checkinId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: "Unable to load analysis." });
  if (!analysis) return res.status(404).json({ error: "Analysis not found." });
  return res.json(analysis);
});

export default router;