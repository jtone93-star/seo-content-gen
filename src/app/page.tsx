import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { Card } from "@/components/ui/card";
import { isDatabaseUnreachable } from "@/lib/db-error";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let clients;
  let projects;
  let audits;
  let livingStrategies;

  try {
    [clients, projects, audits, livingStrategies] = await Promise.all([
      prisma.clientProfile.findMany({ orderBy: { name: "asc" } }),
      prisma.contentProject.findMany({
        orderBy: { updatedAt: "desc" },
        take: 10,
        select: { id: true, status: true },
      }),
      prisma.audit.count(),
      prisma.strategy.count({ where: { lifecycle: "LIVING" } }),
    ]);
  } catch (error) {
    if (isDatabaseUnreachable(error)) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <DbUnavailable />
        </div>
      );
    }
    throw error;
  }

  const failed = projects.filter((p) => p.status === "FAILED").length;
  const inReview = projects.filter((p) => p.status === "PAUSED_FOR_REVIEW").length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold">Workspace</p>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">Dashboard</h1>
        <p className="mt-1 text-muted text-sm max-w-xl">
          Audits, living strategy, and content pipeline — one place to see what’s moving.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Clients"
          value={clients.length}
          hint="Profiles in this workspace"
          emphasis
          href="/clients"
        />
        <StatTile
          label="Audits"
          value={audits}
          hint="Diagnostic runs on file"
          href="/clients"
        />
        <StatTile
          label="Living strategies"
          value={livingStrategies}
          hint="Active roadmaps"
          emphasis
          href="/clients"
        />
        <StatTile
          label="Content projects"
          value={projects.length}
          hint={
            failed
              ? `${failed} failed · ${inReview} in review`
              : inReview
                ? `${inReview} waiting on review`
                : "Open a client hub to start work"
          }
          href="/clients"
        />
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  emphasis,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  emphasis?: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="relative overflow-hidden hover:border-gold/40 transition">
        <span className="absolute inset-y-0 left-0 w-1 bg-gold" />
        <p
          className={`pl-3 text-4xl font-semibold tracking-tight tabular-nums ${emphasis ? "text-gold" : "text-foreground"}`}
        >
          {value}
        </p>
        <p className="pl-3 mt-1 text-sm font-medium">{label}</p>
        <p className="pl-3 mt-0.5 text-xs text-muted">{hint}</p>
      </Card>
    </Link>
  );
}
