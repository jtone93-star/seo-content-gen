import { NextResponse } from "next/server";
import type { AuditStep } from "@/generated/prisma/client";
import { AuditJobError, enqueueAndRunAudit } from "@/lib/audit/run-inline";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string; step: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, step } = await params;
  const body = await request.json().catch(() => ({}));
  const feedback = typeof body.feedback === "string" ? body.feedback : undefined;

  try {
    const result = await enqueueAndRunAudit({
      auditId: id,
      type: "REGENERATE",
      step: step as AuditStep,
      feedback,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, jobId: result.jobId, status: result.status },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, jobId: result.jobId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to regenerate audit step";
    const status = err instanceof AuditJobError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
