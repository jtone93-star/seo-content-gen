const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";

export type ListedGeminiModel = { id: string; name: string };

function geminiModelId(model: string): string {
  return model.replace(/^models\//, "").trim();
}

function formatGeminiError(status: number, data: unknown): string {
  const message =
    data && typeof data === "object"
      ? (data as { error?: { message?: string } }).error?.message
      : undefined;
  return `${status} ${message ?? "Gemini request failed."}`.trim();
}

function isUsefulChatModel(id: string): boolean {
  if (!id) return false;
  const lower = id.toLowerCase();
  if (lower.includes("embedding")) return false;
  if (lower.includes("aqa")) return false;
  if (lower.includes("image")) return false;
  if (lower.includes("tts")) return false;
  if (lower.includes("robotics")) return false;
  if (lower.includes("computer-use")) return false;
  return true;
}

/** List every generateContent model the key can see (follows Google pagination). */
export async function listGeminiModels(apiKey: string): Promise<ListedGeminiModel[]> {
  const collected: ListedGeminiModel[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GEMINI_API}/models`);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "100");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as {
      models?: Array<{
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
      }>;
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(formatGeminiError(res.status, data));
    }

    for (const model of data.models ?? []) {
      if (!(model.supportedGenerationMethods ?? []).includes("generateContent")) continue;
      const id = geminiModelId(String(model.name ?? ""));
      if (!isUsefulChatModel(id)) continue;
      collected.push({ id, name: model.displayName || id });
    }

    pageToken = data.nextPageToken || undefined;
  } while (pageToken);

  // Prefer stable ids; de-dupe by id.
  const byId = new Map<string, ListedGeminiModel>();
  for (const model of collected) {
    if (!byId.has(model.id)) byId.set(model.id, model);
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function generateGeminiJson(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxOutputTokens?: number;
}): Promise<string> {
  const model = geminiModelId(opts.model);
  if (!model) throw new Error("Gemini model id is empty.");

  const res = await fetch(
    `${GEMINI_API}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.user }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: opts.maxOutputTokens ?? 8192,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{
      finishReason?: string;
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  if (!res.ok) {
    throw new Error(formatGeminiError(res.status, data));
  }
  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked the prompt (${data.promptFeedback.blockReason}).`);
  }

  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("\n");
  if (!text.trim()) {
    const reason = data.candidates?.[0]?.finishReason ?? "empty response";
    throw new Error(`Gemini returned no text (${reason}).`);
  }
  return text;
}
