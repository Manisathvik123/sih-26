// NVIDIA NIM explanation model. Returns a raw completion string; the gateway
// is responsible for JSON parsing, shape validation and fallback.

import { postChatCompletion } from "./chatClient.js";
import { buildExplanationPrompt } from "../utils/promptBuilder.js";

export async function nvidiaExplanation(result, department) {
  const { system, user } = buildExplanationPrompt(result, department);
  return postChatCompletion({
    provider: "nvidia",
    apiKey: process.env.NVIDIA_API_KEY,
    model: process.env.NVIDIA_EXPLANATION_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0,
  });
}