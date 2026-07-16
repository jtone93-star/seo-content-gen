import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectPipeline } from "@/components/projects/project-pipeline";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { CONTENT_TYPE_LABELS } from "@/lib/pipeline/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectPage({ params }: Props) {
  const { id } = await params;
  const [project, modelSlots] = await Promise.all([
    prisma.contentProject.findUnique({
      where: { id },
      include: {
        clientProfile: true,
        artifacts: true,
        pipelineJobs: {
          where: { status: { in: ["PENDING", "PROCESSING"] } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.modelSlot.findMany(),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold mt-2">{project.topic}</h1>
        <p className="text-sm text-foreground/70 mt-1">
          {project.clientProfile.name} · {CONTENT_TYPE_LABELS[project.contentType]}
          {project.targetKeyword && ` · Keyword: ${project.targetKeyword}`}
          {project.targetLength && ` · ~${project.targetLength} words`}
        </p>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge>{project.runMode === "STEP_BY_STEP" ? "Step-by-step" : "Full auto"}</Badge>
          {project.sourceUrls.length > 0 && (
            <Badge>{project.sourceUrls.length} URL(s)</Badge>
          )}
        </div>
      </div>
      <ProjectPipeline project={project} modelSlots={modelSlots} />
    </div>
  );
}
