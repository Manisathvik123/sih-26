// OpenRouter fallback provider. Used when NVIDIA and Groq are unavailable.
// Exposes both explanation and recommendation generation. Returns raw strings.

import { postChatCompletion } from "./chatClient.js";
import { buildExplanationPrompt, buildRecommendationPrompt } from "../utils/promptBuilder.js";

async function openrouterCall(messages, temperature) {
  return postChatCompletion({
    provider: "openrouter",
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_MODEL,
    messages,
    temperature,
  });
}

export async function openrouterExplanation(result, department) {
  const { system, user } = buildExplanationPrompt(result, department);
  return openrouterCall(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    0
  );
}

export async function openrouterRecommendation(result, department) {
  const { system, user } = buildRecommendationPrompt(result, department);
  return openrouterCall(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    0.3
  );
}