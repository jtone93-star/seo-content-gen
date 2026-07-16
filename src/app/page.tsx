import Link from "next/link";
import { DbUnavailable } from "@/components/db-unavailable";
import { Card } from "@/components/ui/card";
import { isDatabaseUnreachable } from "@/lib/db-error";
import { prisma } from "@/lib/prisma";
import { CONTENT_TYPE_LABELS } from "@/lib/pipeline/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let clients;
  let projects;

  try {
    [clients, projects] = await Promise.all([
      prisma.clientProfile.findMany({ orderBy: { name: "asc" } }),
      prisma.contentProject.findMany({
        include: { clientProfile: { select: { name: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-foreground/70 text-sm">
          Generate SEO-friendly content with a guided brief → research → outline → draft → edit →
          SEO pipeline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-2xl font-semibold">{clients.length}</p>
          <p className="text-sm text-foreground/60">Client profiles</p>
        </Card>
        <Card>
          <p className="text-2xl font-semibold">{projects.length}</p>
          <p className="text-sm text-foreground/60">Recent projects</p>
        </Card>
        <Card className="flex items-center">
          <Link href="/projects/new" className="text-sm font-medium hover:underline">
            + New content piece
          </Link>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-3">Recent projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-foreground/60">No projects yet.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/projects/${p.id}`}
                  className="block rounded-lg border border-foreground/10 px-4 py-3 hover:bg-foreground/5 transition"
                >
                  <span className="font-medium">{p.topic}</span>
                  <span className="text-foreground/50 text-sm ml-2">
                    {p.clientProfile.name} · {CONTENT_TYPE_LABELS[p.contentType]} ·{" "}
                    {p.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
