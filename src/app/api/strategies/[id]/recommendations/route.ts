import { NextResponse } from "next/server";
import {
  approveRecommendations,
  moveBacklogPriority,
  rejectRecommendations,
  StrategyError,
} from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const recommendationId = String(body.id ?? "");
    const direction = body.direction === "down" ? "down" : body.direction === "up" ? "up" : null;
    if (!recommendationId || !direction) {
      return NextResponse.json({ error: "id and direction are required." }, { status: 400 });
    }
    await moveBacklogPriority(id, recommendationId, direction);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reorder the backlog.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const action = String(body.action ?? "approve");
    const ids: string[] = Array.isArray(body.ids) ? body.ids.map(String) : [];
    if (action === "reject") {
      if (!ids.length) return NextResponse.json({ error: "ids are required to reject." }, { status: 400 });
      const count = await rejectRecommendations(id, ids);
      return NextResponse.json({ ok: true, count });
    }
    const count = await approveRecommendations(id, ids.length ? ids : undefined);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update recommendations.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
