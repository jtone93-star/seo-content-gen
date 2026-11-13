import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { parseAiProvider } from "@/lib/ai-providers";
import { getProviderKey } from "@/lib/credentials";
import { listGeminiModels } from "@/lib/gemini";

/**
 * Validates a BYO API key by listing models (a cheap, no-token call).
 * Tests the key in the request body if provided, otherwise the stored key.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const provider = parseAiProvider(body.provider) ?? "anthropic";
  const provided = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKey = provided || (await getProviderKey(provider));

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "No API key to test. Enter or save a key first." },
      { status: 400 },
    );
  }

  try {
    if (provider === "gemini") {
      const models = await listGeminiModels(apiKey);
      return NextResponse.json({ ok: true, modelCount: models.length });
    }

    const anthropic = new Anthropic({ apiKey });
    const models = await anthropic.models.list();
    return NextResponse.json({
      ok: true,
      modelCount: models.data.length,
    });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `${err.status ?? ""} ${err.message}`.trim()
        : err instanceof Error
          ? err.message
          : "Connection failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
