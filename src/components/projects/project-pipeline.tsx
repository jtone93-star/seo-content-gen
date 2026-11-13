"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArtifactViewer } from "@/components/artifacts/artifact-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type {
  ContentProject,
  ModelSlot,
  PipelineJob,
  PipelineStep,
  StepArtifact,
  ClientProfile,
} from "@/generated/prisma/client";
import { PIPELINE_STEPS, STEP_DESCRIPTIONS, STEP_LABELS } from "@/lib/pipeline/types";
import { liveEngineLabel } from "@/lib/ai-providers";
import { isQualityGate, MAX_QUALITY_LOOPS } from "@/lib/pipeline/quality-loop";

type ProjectWithRelations = ContentProject & {
  clientProfile: ClientProfile;
  artifacts: StepArtifact[];
  pipelineJobs: PipelineJob[];
};

type EngineInfo = {
  engine: "claude" | "gemini" | "mock";
  model?: string | null;
};

function latestArtifact(artifacts: StepArtifact[], step: PipelineStep) {
  return artifacts
    .filter((a) => a.step === step && a.status !== "SUPERSEDED")
    .sort((a, b) => b.version - a.version)[0];
}

function statusColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-teal/15 text-teal";
    case "AWAITING_REVIEW":
      return "bg-gold/15 text-gold";
    case "RUNNING":
      return "bg-sky-500/15 text-sky-300";
    case "QUEUED":
      return "bg-white/[0.06] text-muted";
    case "FAILED":
    case "REJECTED":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-white/[0.06] text-muted";
  }
}

function engineForStep(slots: ModelSlot[], step: PipelineStep): EngineInfo {
  const slot = slots.find((s) => s.step === step);
  if (slot?.enabled && slot.model && slot.provider === "gemini") {
    return { engine: "gemini", model: slot.model };
  }
  if (slot?.enabled && slot.model && slot.provider === "anthropic") {
    return { engine: "claude", model: slot.model };
  }
  return { engine: "mock" };
}

function EngineBadge({ info }: { info: EngineInfo }) {
  if (info.engine !== "mock") {
    return (
      <Badge className="bg-gold/15 text-gold">
        Using: {liveEngineLabel(info.engine === "gemini" ? "gemini" : "anthropic", info.model)}
      </Badge>
    );
  }
  return (
    <Badge className="bg-foreground/10 text-foreground/70">Using: Mock</Badge>
  );
}

export function ProjectPipeline({
  project,
  modelSlots,
}: {
  project: ProjectWithRelations;
  modelSlots: ModelSlot[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const activeJob = project.pipelineJobs[0] ?? null;
  const isQueued = project.status === "QUEUED" || activeJob?.status === "PENDING";
  const isProcessing =
    project.status === "RUNNING" || activeJob?.status === "PROCESSING";
  const pipelineBusy = isQueued || isProcessing;

  const pipelineStep =
    project.currentStep ??
    (project.status === "COMPLETED" ? "FINAL" : "BRIEF");

  const [activeStep, setActiveStep] = useState<PipelineStep>(pipelineStep);

  const currentArtifact = latestArtifact(project.artifacts, activeStep);
  const activeEngine = engineForStep(modelSlots, activeStep);
  const isViewingHistory =
    activeStep !== pipelineStep ||
    (project.status === "COMPLETED" && activeStep !== "FINAL");

  useEffect(() => {
    if (!pipelineBusy) return;
    const id = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(id);
  }, [pipelineBusy, router]);

  async function callApi(path: string, method = "POST", body?: object) {
    setLoading(path);
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    setLoading(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Request failed");
    }
    router.refresh();
  }

  const canApprove =
    currentArtifact?.status === "AWAITING_REVIEW" && !pipelineBusy;
  const canStart = project.status === "DRAFT" || project.status === "FAILED";
  const gateOutput =
    currentArtifact && isQualityGate(activeStep) && currentArtifact.output
      ? (currentArtifact.output as { passed?: boolean })
      : null;
  const gateFailed = gateOutput?.passed === false;

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <ol className="space-y-2">
        {PIPELINE_STEPS.map((step) => {
          const artifact = latestArtifact(project.artifacts, step);
          const isActive = step === activeStep;
          const canOpen = !!artifact;
          const engine = engineForStep(modelSlots, step);
          return (
            <li key={step}>
              <button
                type="button"
                disabled={!canOpen}
                onClick={() => setActiveStep(step)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-foreground/10 font-medium"
                    : canOpen
                      ? "hover:bg-foreground/5"
                      : "opacity-40 cursor-not-allowed"
                }`}
              >
                <span className="block">{STEP_LABELS[step]}</span>
                <span className="mt-0.5 block text-[11px] font-normal leading-snug text-foreground/50">
                  {engine.engine === "mock"
                    ? "Mock"
                    : liveEngineLabel(engine.engine === "gemini" ? "gemini" : "anthropic", engine.model)}
                </span>
                {artifact ? (
                  <Badge className={`mt-1 ${statusColor(artifact.status)}`}>
                    {artifact.status.replace(/_/g, " ").toLowerCase()}
                    {artifact.version > 1 ? ` · v${artifact.version}` : ""}
                  </Badge>
                ) : (
                  <span className="mt-1 block text-xs text-foreground/40">Not started</span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{STEP_LABELS[activeStep]}</h2>
            <Badge className={statusColor(project.status)}>
              {project.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
            <EngineBadge info={activeEngine} />
          </div>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-2xl">
            {STEP_DESCRIPTIONS[activeStep]}
          </p>
        </div>

        {pipelineBusy && (
          <p className="text-sm text-foreground/70 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2">
            {isProcessing
              ? "Running pipeline step… this can take a minute with Claude."
              : "Starting…"}
          </p>
        )}

        {isViewingHistory && currentArtifact && !pipelineBusy && (
          <p className="text-sm text-foreground/60 rounded-lg border border-foreground/10 bg-foreground/[0.02] px-3 py-2">
            Viewing a previous stage. Use the step list to move between stages, or{" "}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={() => setActiveStep(pipelineStep)}
            >
              return to {STEP_LABELS[pipelineStep]}
            </button>
            .
          </p>
        )}

        {project.errorMessage && (
          <p className="text-sm text-red-600 rounded-lg border border-red-200 p-3">
            {project.errorMessage}
          </p>
        )}

        {canStart && !pipelineBusy && (
          <Button
            onClick={() => callApi(`/api/projects/${project.id}/start`)}
            disabled={!!loading}
          >
            {project.status === "FAILED" ? "Retry pipeline" : "Start pipeline"}
          </Button>
        )}

        {currentArtifact ? (
          <ArtifactViewer step={activeStep} output={currentArtifact.output} />
        ) : (
          <p className="text-sm text-foreground/60">This step has not run yet.</p>
        )}

        {gateFailed && canApprove && (
          <p className="text-sm text-amber-400 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            This gate failed after {MAX_QUALITY_LOOPS} automatic passes. Approve to continue anyway,
            or regenerate a stage with feedback.
          </p>
        )}

        {canApprove && (
          <div className="flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
            <Button
              onClick={async () => {
                const idx = PIPELINE_STEPS.indexOf(activeStep);
                const next = idx >= 0 ? PIPELINE_STEPS[idx + 1] : undefined;
                await callApi(`/api/projects/${project.id}/steps/${activeStep}/approve`);
                if (next) setActiveStep(next);
              }}
              disabled={!!loading}
            >
              {gateFailed ? "Approve anyway & continue" : "Approve & continue"}
            </Button>
          </div>
        )}

        {(canApprove || currentArtifact?.status === "APPROVED") && !pipelineBusy && (
          <div className="space-y-2 border-t border-foreground/10 pt-4">
            <label className="text-sm font-medium">Regenerate with feedback (optional)</label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
              placeholder="e.g. Make the outline more focused on enterprise buyers"
            />
            <Button
              variant="secondary"
              onClick={() =>
                callApi(`/api/projects/${project.id}/steps/${activeStep}/regenerate`, "POST", {
                  feedback: feedback || undefined,
                })
              }
              disabled={!!loading}
            >
              Regenerate step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
