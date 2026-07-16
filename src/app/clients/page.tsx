import Link from "next/link";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.clientProfile.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Client profiles</h1>
        <Link href="/clients/new" className="text-sm font-medium hover:underline">
          + New client
        </Link>
      </div>

      {clients.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/70">No clients yet. Create one to get started.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id}>
              <Link href={`/clients/${c.id}/edit`}>
                <Card className="hover:bg-foreground/[0.04] transition">
                  <p className="font-medium">{c.name}</p>
                  {c.industry && (
                    <p className="text-sm text-foreground/60 mt-1">{c.industry}</p>
                  )}
                  {c.tone && (
                    <p className="text-xs text-foreground/50 mt-1">Tone: {c.tone}</p>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
