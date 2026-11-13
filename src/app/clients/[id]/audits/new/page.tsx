import Link from "next/link";
import { notFound } from "next/navigation";
import { AuditForm } from "@/components/audit/audit-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function NewAuditPage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.clientProfile.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/clients/${id}`} className="text-sm text-foreground/60 hover:text-foreground">
          ← {client.name}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight mt-2">New site audit</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Diagnose crawl, visibility, linking, keyword relevance, and AI crawlability issues. Strategy
          planning is a separate later module.
        </p>
      </div>
      <AuditForm clientProfileId={id} />
    </div>
  );
}
