// Shared OpenAI-compatible chat-completions client.
// NVIDIA NIM, Groq, and OpenRouter all expose the same
// /chat/completions shape, so one thin helper serves all three.

const DEFAULT_ENDPOINTS = {
  nvidia: "https://integrate.api.nvidia.com/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

export async function postChatCompletion({ provider, apiKey, model, messages, temperature }) {
  const url = DEFAULT_ENDPOINTS[provider];
  if (!url) throw new Error(`Unknown provider: ${provider}`);
  if (!apiKey) throw new Error(`Missing API key for ${provider}`);
  if (!model) throw new Error(`Missing model for ${provider}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, temperature }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Provider ${provider} returned ${res.status}`);

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error(`Provider ${provider} returned an empty completion`);
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}