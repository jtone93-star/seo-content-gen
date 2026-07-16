import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditClientPage({ params }: Props) {
  const { id } = await params;
  const client = await prisma.clientProfile.findUnique({ where: { id } });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit {client.name}</h1>
      <ClientForm client={client} />
    </div>
  );
}
