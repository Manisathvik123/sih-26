import { Router } from "express";
import { supabase } from "../config/supabase.js";

const router = Router();

// GET /api/personnel — list all personnel (for the frontend selector)
router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("personnel").select("*").order("name");
  if (error) return res.status(500).json({ error: "Unable to load personnel records." });
  return res.json(data);
});

// GET /api/personnel/:id — single HR record
router.get("/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("personnel")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) return res.status(500).json({ error: "Unable to load personnel record." });
  if (!data) return res.status(404).json({ error: "Personnel not found." });
  return res.json(data);
});

// GET /api/personnel/:id/timeline — all analyses for a personnel, chronological,
// joined with recommendations.
router.get("/:id/timeline", async (req, res) => {
  const { data: analyses, error } = await supabase
    .from("stress_analysis")
    .select(`*,
      wellness_checkins (id, personnel_id, created_at, stress_level, sleep_quality, mood, energy, fatigue, note),
      recommendations (*)
    `)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: "Unable to load timeline." });

  const filtered = analyses.filter((a) => a.wellness_checkins?.personnel_id === req.params.id);
  return res.json(filtered);
});

export default router;