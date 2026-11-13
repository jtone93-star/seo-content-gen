import { NextResponse } from "next/server";
import { getProviderKey } from "@/lib/credentials";
import { listGeminiModels } from "@/lib/gemini";

/** Returns Gemini models available to the connected key, for the picker dropdowns. */
export async function GET() {
  const apiKey = await getProviderKey("gemini");
  if (!apiKey) {
    return NextResponse.json({ models: [], error: null });
  }

  try {
    const models = await listGeminiModels(apiKey);
    return NextResponse.json({ models, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list Gemini models.";
    return NextResponse.json({ models: [], error: message }, { status: 200 });
  }
}
