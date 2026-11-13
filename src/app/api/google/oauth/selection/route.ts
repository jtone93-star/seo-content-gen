import { NextResponse } from "next/server";
import {
  getGoogleConnectionStatus,
  saveGooglePropertySelection,
} from "@/lib/google/oauth";

export async function GET() {
  const status = await getGoogleConnectionStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const status = await getGoogleConnectionStatus();
  if (!status.connected) {
    return NextResponse.json(
      { error: "Connect Google before selecting properties." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const analyticsPropertyId =
    body.analyticsPropertyId === null || typeof body.analyticsPropertyId === "string"
      ? body.analyticsPropertyId
      : undefined;
  const searchConsoleSiteUrl =
    body.searchConsoleSiteUrl === null || typeof body.searchConsoleSiteUrl === "string"
      ? body.searchConsoleSiteUrl
      : undefined;

  if (analyticsPropertyId === undefined && searchConsoleSiteUrl === undefined) {
    return NextResponse.json(
      { error: "Provide analyticsPropertyId and/or searchConsoleSiteUrl." },
      { status: 400 },
    );
  }

  try {
    const updated = await saveGooglePropertySelection({
      analyticsPropertyId,
      searchConsoleSiteUrl,
    });
    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save selection.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
