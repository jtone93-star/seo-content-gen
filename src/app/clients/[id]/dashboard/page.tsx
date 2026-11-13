import { ClientDashboardView, type DashboardAudit } from "@/components/clients/client-dashboard-view";
import { ensureWorkingWindows, strategyInclude } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ClientDashboardPage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.clientProfile.findUnique({
    where: { id },
    include: {
      strategies: {
        where: { lifecycle: "LIVING" },
        include: strategyInclude,
        take: 1,
      },
      audits: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        include: {
          artifacts: {
            where: {
              step: "FINDINGS_ROLLUP",
              status: { in: ["APPROVED", "AWAITING_REVIEW"] },
            },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!client) notFound();

  let living = client.strategies[0] ?? null;
  if (living && client.billingDay) {
    await ensureWorkingWindows(living.id);
    living = await prisma.strategy.findUnique({
      where: { id: living.id },
      include: strategyInclude,
    });
  }

  return (
    <ClientDashboardView
      clientId={client.id}
      clientName={client.name}
      billingDay={client.billingDay}
      cycles={living?.cycles ?? []}
      kpis={living?.kpis ?? []}
      audit={toDashboardAudit(client.audits[0])}
    />
  );
}

function toDashboardAudit(
  audit:
    | {
        name: string;
        updatedAt: Date;
        artifacts: Array<{ output: unknown }>;
      }
    | undefined,
): DashboardAudit | null {
  if (!audit) return null;
  const output = audit.artifacts[0]?.output;
  const summary =
    output && typeof output === "object" && "summary" in output && typeof output.summary === "string"
      ? output.summary
      : null;
  const findings =
    output && typeof output === "object" && "findings" in output && Array.isArray(output.findings)
      ? output.findings
      : [];
  const highlights = findings
    .map((finding) => {
      if (!finding || typeof finding !== "object" || !("title" in finding)) return null;
      const title = finding.title;
      return typeof title === "string" && title.trim() ? title.trim() : null;
    })
    .filter((title): title is string => Boolean(title))
    .slice(0, 5);

  return {
    name: audit.name,
    updatedAt: audit.updatedAt.toISOString(),
    summary,
    highlights,
  };
}
