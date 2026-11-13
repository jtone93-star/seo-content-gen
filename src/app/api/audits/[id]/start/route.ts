import { NextResponse } from "next/server";
import { AuditJobError, enqueueAndRunAudit } from "@/lib/audit/run-inline";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const result = await enqueueAndRunAudit({ auditId: id, type: "START" });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, jobId: result.jobId, status: result.status },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, jobId: result.jobId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start audit";
    const status = err instanceof AuditJobError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
