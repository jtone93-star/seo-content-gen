import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { initials } from "@/lib/ui-status";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.clientProfile.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { audits: true, projects: true, strategies: true } },
      strategies: {
        where: { lifecycle: "LIVING" },
        select: { id: true, name: true, status: true },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold">Directory</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">Clients</h1>
          <p className="mt-1 text-sm text-muted">
            {clients.length} profile{clients.length === 1 ? "" : "s"} · audits, strategy, and content
            under each hub
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center rounded-lg bg-gold px-4 py-2 text-sm font-medium text-gold-ink hover:bg-gold/90"
        >
          New client
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card className="border-gold/20">
          <p className="text-sm text-muted">No clients yet.</p>
          <Link href="/clients/new" className="mt-3 inline-block text-sm font-medium text-gold hover:underline">
            Create the first client
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {clients.map((c) => {
            const living = c.strategies[0];
            return (
              <li key={c.id}>
                <Card className="relative overflow-hidden hover:border-gold/40 transition h-full">
                  <span className="absolute inset-y-0 left-0 w-1 bg-gold" />
                  <div className="flex items-start gap-4 pl-2">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/clients/${c.id}`} className="min-w-0">
                          <p className="font-semibold truncate">{c.name}</p>
                          <p className="text-sm text-muted mt-0.5 truncate">
                            {[c.industry, c.audience].filter(Boolean).join(" · ") || "No industry set"}
                          </p>
                        </Link>
                        <Link
                          href={`/clients/${c.id}/edit`}
                          className="shrink-0 text-xs text-muted hover:text-gold"
                        >
                          Edit
                        </Link>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge className="bg-gold/15 text-gold">{c._count.audits} audits</Badge>
                        <Badge className="bg-gold/10 text-gold">{c._count.projects} content</Badge>
                        {living ? (
                          <Badge className="bg-gold/20 text-gold">Strategy · {living.name}</Badge>
                        ) : (
                          <Badge>No strategy</Badge>
                        )}
                      </div>
                      <Link
                        href={`/clients/${c.id}`}
                        className="mt-3 inline-block text-sm text-gold hover:underline"
                      >
                        Open hub
                      </Link>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
