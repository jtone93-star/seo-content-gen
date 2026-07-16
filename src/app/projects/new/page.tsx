import { ProjectForm } from "@/components/projects/project-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const clients = await prisma.clientProfile.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New content piece</h1>
        <p className="mt-1 text-sm text-foreground/70">
          Add your topic, optional keyword, source URLs, notes, and length. The pipeline runs
          brief → SERP research → outline → draft → edit → QA → SEO → technical SEO → final.
        </p>
      </div>
      <ProjectForm clients={clients} />
    </div>
  );
}
