import { NextResponse } from "next/server";
import type { AuditStep } from "@/generated/prisma/client";
import { AuditJobError, enqueueAndRunAudit } from "@/lib/audit/run-inline";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string; step: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, step } = await params;
  let selectedPages: string[] | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body.selectedPages)) {
      selectedPages = body.selectedPages.map((p: unknown) => String(p).trim()).filter(Boolean);
    }
  } catch {
    selectedPages = undefined;
  }

  try {
    const result = await enqueueAndRunAudit({
      auditId: id,
      type: "APPROVE",
      step: step as AuditStep,
      selectedPages,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, jobId: result.jobId, status: result.status },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, jobId: result.jobId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve audit step";
    const status = err instanceof AuditJobError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
