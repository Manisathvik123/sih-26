// Groq fallback provider. Used when NVIDIA is unavailable. Exposes both
// explanation and recommendation generation. Returns raw completion strings.

import { postChatCompletion } from "./chatClient.js";
import { buildExplanationPrompt, buildRecommendationPrompt } from "../utils/promptBuilder.js";

async function groqCall(messages, temperature) {
  return postChatCompletion({
    provider: "groq",
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL,
    messages,
    temperature,
  });
}

export async function groqExplanation(result, department) {
  const { system, user } = buildExplanationPrompt(result, department);
  return groqCall(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    0
  );
}

export async function groqRecommendation(result, department) {
  const { system, user } = buildRecommendationPrompt(result, department);
  return groqCall(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    0.3
  );
}