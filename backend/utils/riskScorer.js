// Deterministic risk engine (section 7). The LLM never touches this.
//
// The ONLY source of risk_score, risk_level and factor_breakdown in PRAHARI.
// AI models never calculate, adjust or invent these values.

const WEIGHTS = {
  overtime: 0.25,
  bloodPressure: 0.2,
  pulse: 0.15,
  stressLevel: 0.15,
  sleepQuality: 0.1,
  fatigue: 0.1,
  energy: 0.05,
};

const BP_REGEX = /^\d{2,3}\/\d{2,3}$/;

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

// Validate (and normalize) the HR + check-in inputs. Throws on invalid input
// so the caller can return 400 (never coerce silently).
export function normalizeInputs(personnel, checkin) {
  if (!personnel || typeof personnel !== "object") {
    throw new Error("Personnel HR record is required.");
  }

  const bp = personnel.blood_pressure;
  if (!bp || !BP_REGEX.test(bp)) {
    throw new Error(`Invalid blood_pressure format "${bp}". Expected "SYS/DIA" (e.g. "120/80").`);
  }

  const sliderFields = ["stress_level", "sleep_quality", "energy", "fatigue"];
  for (const field of sliderFields) {
    const v = checkin[field];
    if (!Number.isInteger(v) || v < 1 || v > 10) {
      throw new Error(`${field} must be an integer between 1 and 10.`);
    }
  }

  return {
    overtime_hours: personnel.overtime_hours ?? 0,
    systolic: parseInt(bp.split("/")[0], 10),
    diastolic: parseInt(bp.split("/")[1], 10),
    pulse_rate: personnel.pulse_rate ?? 0,
    stress_level: checkin.stress_level,
    sleep_quality: checkin.sleep_quality,
    fatigue: checkin.fatigue,
    energy: checkin.energy,
  };
}

function normalizedScores(i) {
  const overtime = clamp((i.overtime_hours / 24) * 100);

  const sysScore = clamp(((i.systolic - 110) / (160 - 110)) * 100);
  const diaScore = clamp(((i.diastolic - 70) / (100 - 70)) * 100);
  const bloodPressure = (sysScore + diaScore) / 2;

  const pulse = clamp(((i.pulse_rate - 60) / (120 - 60)) * 100);
  const stressLevel = (i.stress_level / 10) * 100;
  const sleepQuality = 100 - (i.sleep_quality / 10) * 100;
  const fatigue = (i.fatigue / 10) * 100;
  const energy = 100 - (i.energy / 10) * 100;

  return { overtime, bloodPressure, pulse, stressLevel, sleepQuality, fatigue, energy };
}

export function scoreRisk(personnel, checkin) {
  const i = normalizeInputs(personnel, checkin);
  const n = normalizedScores(i);

  const risk_score = Math.round(
    n.overtime * WEIGHTS.overtime +
      n.bloodPressure * WEIGHTS.bloodPressure +
      n.pulse * WEIGHTS.pulse +
      n.stressLevel * WEIGHTS.stressLevel +
      n.sleepQuality * WEIGHTS.sleepQuality +
      n.fatigue * WEIGHTS.fatigue +
      n.energy * WEIGHTS.energy
  );

  const risk_level = risk_score >= 70 ? "HIGH" : risk_score >= 40 ? "MODERATE" : "LOW";

  const factor_breakdown = [
    { factor: "overtime", normalizedScore: n.overtime, contributionPct: Math.round(n.overtime * WEIGHTS.overtime) },
    { factor: "bloodPressure", normalizedScore: n.bloodPressure, contributionPct: Math.round(n.bloodPressure * WEIGHTS.bloodPressure) },
    { factor: "pulse", normalizedScore: n.pulse, contributionPct: Math.round(n.pulse * WEIGHTS.pulse) },
    { factor: "stressLevel", normalizedScore: n.stressLevel, contributionPct: Math.round(n.stressLevel * WEIGHTS.stressLevel) },
    { factor: "sleepQuality", normalizedScore: n.sleepQuality, contributionPct: Math.round(n.sleepQuality * WEIGHTS.sleepQuality) },
    { factor: "fatigue", normalizedScore: n.fatigue, contributionPct: Math.round(n.fatigue * WEIGHTS.fatigue) },
    { factor: "energy", normalizedScore: n.energy, contributionPct: Math.round(n.energy * WEIGHTS.energy) },
  ]
    .sort((a, b) => b.contributionPct - a.contributionPct);

  return { risk_score, risk_level, factor_breakdown };
}