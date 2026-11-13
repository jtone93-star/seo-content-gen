import { notFound } from "next/navigation";
import { AuditPipeline } from "@/components/audit/audit-pipeline";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; auditId: string }> };

export default async function AuditDetailPage({ params }: Props) {
  const { id, auditId } = await params;
  const [audit, modelSlots] = await Promise.all([
    prisma.audit.findFirst({
      where: { id: auditId, clientProfileId: id },
      include: {
        clientProfile: true,
        dataSources: { orderBy: { createdAt: "desc" } },
        artifacts: { orderBy: [{ createdAt: "desc" }] },
        jobs: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.auditModelSlot.findMany(),
  ]);

  if (!audit) notFound();

  return <AuditPipeline audit={audit} modelSlots={modelSlots} clientId={id} />;
}
