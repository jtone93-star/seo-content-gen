import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAnthropicKey } from "@/lib/credentials";

/** Returns the Claude models available to the connected key, for the picker dropdowns. */
export async function GET() {
  const apiKey = await getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json({ models: [] });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const list = await anthropic.models.list();
    const models = list.data.map((m) => ({ id: m.id, name: m.display_name ?? m.id }));
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
