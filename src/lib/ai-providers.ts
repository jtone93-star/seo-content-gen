export const AI_PROVIDERS = ["anthropic", "gemini"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export function isAiProvider(value: unknown): value is AiProvider {
  return value === "anthropic" || value === "gemini";
}

export function parseAiProvider(value: unknown): AiProvider | null {
  return isAiProvider(value) ? value : null;
}

export function providerDisplayName(provider: string | null | undefined): string {
  if (provider === "anthropic") return "Claude";
  if (provider === "gemini") return "Gemini";
  return "Mock";
}

export function liveEngineLabel(
  provider: string | null | undefined,
  model?: string | null,
): string {
  const name = providerDisplayName(provider);
  if (name === "Mock") return "Mock";
  return model ? `${name} · ${model}` : name;
}

export function slotProviderFromBody(body: {
  provider?: unknown;
  enabled?: unknown;
}): AiProvider | null {
  if (!body.enabled) return null;
  return parseAiProvider(body.provider) ?? "anthropic";
}
