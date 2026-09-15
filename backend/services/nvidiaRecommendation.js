// NVIDIA NIM recommendation model. Returns a raw completion string; the
// gateway is responsible for JSON parsing, shape validation and fallback.

import { postChatCompletion } from "./chatClient.js";
import { buildRecommendationPrompt } from "../utils/promptBuilder.js";

export async function nvidiaRecommendation(result, department) {
  const { system, user } = buildRecommendationPrompt(result, department);
  return postChatCompletion({
    provider: "nvidia",
    apiKey: process.env.NVIDIA_API_KEY,
    model: process.env.NVIDIA_RECOMMENDATION_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
  });
}