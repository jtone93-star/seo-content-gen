import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAnthropicKey } from "@/lib/credentials";

/**
 * Validates an Anthropic API key by listing models (a cheap, no-token call).
 * Tests the key in the request body if provided, otherwise the stored key.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const provided = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const apiKey = provided || (await getAnthropicKey());

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "No API key to test. Enter or save a key first." },
      { status: 400 },
    );
  }

  try {
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
