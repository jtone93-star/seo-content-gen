import { NextResponse } from "next/server";
import { parseAiProvider } from "@/lib/ai-providers";
import {
  deleteProviderKey,
  getCredentialStatus,
  getCredentialStatuses,
  saveProviderKey,
} from "@/lib/credentials";

export async function GET(request: Request) {
  const provider = parseAiProvider(new URL(request.url).searchParams.get("provider"));
  if (provider) {
    return NextResponse.json(await getCredentialStatus(provider));
  }
  return NextResponse.json(await getCredentialStatuses());
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const provider = parseAiProvider(body.provider) ?? "anthropic";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";

  if (!apiKey.trim()) {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }

  try {
    await saveProviderKey(provider, apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json(await getCredentialStatus(provider));
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const provider =
    parseAiProvider(body.provider) ?? parseAiProvider(url.searchParams.get("provider")) ?? "anthropic";
  await deleteProviderKey(provider);
  return NextResponse.json({ connected: false });
}
