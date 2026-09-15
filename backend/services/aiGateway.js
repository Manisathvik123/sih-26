// Centralized AI gateway. The single place where the provider fallback chain
// lives — no duplicated fallback logic anywhere else.
//
// Order: NVIDIA -> Groq -> OpenRouter -> hardcoded fallback.
// Per provider: 8s timeout (enforced in chatClient) + 1 retry, then
// structured-response validation. Malformed output is rejected and falls
// through. Raw provider errors are never surfaced: on total failure a
// hardcoded fallback is returned so the deterministic score always flows.

import { nvidiaExplanation } from "./nvidiaExplanation.js";
import { nvidiaRecommendation } from "./nvidiaRecommendation.js";
import { groqExplanation, groqRecommendation } from "./groqFallback.js";
import { openrouterExplanation, openrouterRecommendation } from "./openrouterFallback.js";

const EXPLANATION_CHAIN = [nvidiaExplanation, groqExplanation, openrouterExplanation];
const RECOMMENDATION_CHAIN = [nvidiaRecommendation, groqRecommendation, openrouterRecommendation];

const FALLBACK_EXPLANATION = {
  summary:
    "AI services are temporarily unavailable. The deterministic risk assessment is still available.",
  explanations: [
    "The displayed risk assessment is based on the calculated workload, physiological and wellness factors.",
  ],
};

const FALLBACK_RECOMMENDATION = {
  summary: "AI recommendation service is temporarily unavailable.",
  actions: [
    "Monitor recovery during the next duty cycle.",
    "Consider reducing excessive workload where operationally feasible.",
    "Continue regular wellness check-ins.",
  ],
  priority: "MODERATE",
};

const parseJSON = (raw) => JSON.parse(raw.replace(/```json|```/g, "").trim());

function validExplanation(obj) {
  return (
    obj &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.explanations) &&
    obj.explanations.every((s) => typeof s === "string")
  );
}

function validRecommendation(obj) {
  return (
    obj &&
    typeof obj.summary === "string" &&
    Array.isArray(obj.actions) &&
    obj.actions.every((s) => typeof s === "string") &&
    typeof obj.priority === "string"
  );
}

async function runChain(chain, validator, fallback, result, department) {
  for (const provider of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await provider(result, department);
        const parsed = parseJSON(raw);
        if (validator(parsed)) return parsed;
      } catch {
        // fall through to the next attempt / provider on any failure
      }
    }
  }
  return fallback;
}

export async function generateExplanation(result, department) {
  return runChain(EXPLANATION_CHAIN, validExplanation, FALLBACK_EXPLANATION, result, department);
}

export async function generateRecommendation(result, department) {
  return runChain(RECOMMENDATION_CHAIN, validRecommendation, FALLBACK_RECOMMENDATION, result, department);
}