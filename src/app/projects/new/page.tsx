import { ProjectForm } from "@/components/projects/project-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ client?: string }> };

export default async function NewProjectPage({ searchParams }: Props) {
  const { client } = await searchParams;
  const clients = await prisma.clientProfile.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">New content piece</h1>
        <p className="mt-1 text-sm text-foreground/70">
          brief → SERP research → outline → draft → edit → QA → SEO → technical SEO → ship check →
          final.
        </p>
      </div>
      <ProjectForm clients={clients} defaultClientId={client} />
    </div>
  );
}
