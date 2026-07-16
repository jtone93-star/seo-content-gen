import { NextResponse } from "next/server";
import {
  deleteAnthropicKey,
  getCredentialStatus,
  saveAnthropicKey,
} from "@/lib/credentials";

export async function GET() {
  const status = await getCredentialStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : "";

  if (!apiKey.trim()) {
    return NextResponse.json({ error: "API key is required." }, { status: 400 });
  }

  try {
    await saveAnthropicKey(apiKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save key.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const status = await getCredentialStatus();
  return NextResponse.json(status);
}

export async function DELETE() {
  await deleteAnthropicKey();
  return NextResponse.json({ connected: false });
}
