// Builds the LLM prompts (system + user) for explanation and recommendation.
// The user prompt is always built from ALREADY-COMPUTED values — never raw
// check-in data, and the models are never allowed to change those values.

const LANGUAGE_GUARD =
  "Never use medical, psychiatric, or clinical diagnosis language (e.g. do not say someone 'has depression' or is 'mentally unfit'). Use welfare-aware phrasing such as elevated stress risk, welfare risk, recovery concern, elevated indicators, or recommended welfare follow-up.";

const JSON_ONLY = "Respond with valid JSON only, no markdown, no commentary.";

function buildUserPayload(result, department) {
  return {
    risk_level: result.risk_level,
    risk_score: result.risk_score,
    factor_breakdown: result.factor_breakdown.map((f) => ({
      factor: f.factor,
      contributionPct: f.contributionPct,
    })),
    department,
  };
}

export function buildExplanationPrompt(result, department) {
  const system = [
    "You are a welfare-awareness assistant for a uniformed-forces personnel monitoring system.",
    "You explain an already-computed risk assessment in plain language.",
    "Rules:",
    "- Never change, override, or comment on the accuracy of risk_score or risk_level.",
    "- Never invent factors or percentages that were not supplied.",
    "- Explain only the factors provided.",
    "- Be concise.",
    LANGUAGE_GUARD,
    JSON_ONLY,
    'Output shape: {"summary": "1-2 sentence plain-language summary", "explanations": ["one sentence per supplied factor"]}',
  ].join(" ");

  return { system, user: JSON.stringify(buildUserPayload(result, department)) };
}

export function buildRecommendationPrompt(result, department) {
  const system = [
    "You are a welfare advisor for a uniformed-forces personnel monitoring system.",
    "You generate actionable welfare recommendations from an already-computed risk assessment.",
    "Rules:",
    "- Never change or recompute the numeric assessment (risk_score / risk_level / factor_breakdown).",
    "- Give practical, operationally-feasible suggestions.",
    LANGUAGE_GUARD,
    JSON_ONLY,
    'Output shape: {"summary": "...", "actions": ["...", "...", "..."], "priority": "HIGH"}',
  ].join(" ");

  return { system, user: JSON.stringify(buildUserPayload(result, department)) };
}