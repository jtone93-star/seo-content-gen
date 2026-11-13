import { ClientHub } from "@/components/clients/client-hub";
import { ensureWorkingWindows, strategyInclude } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ClientHubPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { tab } = await searchParams;

  const client = await prisma.clientProfile.findUnique({
    where: { id },
    include: {
      audits: { orderBy: { updatedAt: "desc" } },
      projects: { orderBy: { updatedAt: "desc" } },
      strategies: {
        orderBy: { updatedAt: "desc" },
        include: strategyInclude,
      },
    },
  });

  if (!client) notFound();

  let living = client.strategies.find((s) => s.lifecycle === "LIVING") ?? null;
  const past = client.strategies.filter((s) => s.lifecycle === "PAST");

  if (living && client.billingDay) {
    await ensureWorkingWindows(living.id);
    living = await prisma.strategy.findUnique({
      where: { id: living.id },
      include: strategyInclude,
    });
  }

  return (
    <ClientHub
      client={client}
      audits={client.audits}
      projects={client.projects}
      living={living}
      past={past}
      initialTab={tab}
    />
  );
}
