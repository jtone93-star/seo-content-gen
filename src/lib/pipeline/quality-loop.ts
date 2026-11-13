import type { PipelineStep } from "@/generated/prisma/client";
import type { QaOutput, ShipCheckOutput, StepOutput } from "./types";
import { PIPELINE_STEPS } from "./types";

/** Max times a quality gate (QA or ship check) may run before pausing for a human. */
export const MAX_QUALITY_LOOPS = 3;

export type QualityGateStep = "QA" | "SHIP_CHECK";

const QA_REWIND_STEPS: PipelineStep[] = ["RESEARCH", "OUTLINE", "DRAFT", "EDIT"];
const SHIP_REWIND_STEPS: PipelineStep[] = ["OUTLINE", "DRAFT", "EDIT", "SEO", "TECHNICAL_SEO"];

export function isQualityGate(step: PipelineStep): step is QualityGateStep {
  return step === "QA" || step === "SHIP_CHECK";
}

export type QualityGateResult = {
  passed: boolean;
  rewindTo: PipelineStep | null;
  feedback: string;
};

function allowedRewinds(gate: QualityGateStep): PipelineStep[] {
  return gate === "QA" ? QA_REWIND_STEPS : SHIP_REWIND_STEPS;
}

function defaultRewind(gate: QualityGateStep): PipelineStep {
  return "EDIT";
}

function asStep(value: unknown, allowed: PipelineStep[]): PipelineStep | null {
  if (typeof value !== "string") return null;
  return allowed.includes(value as PipelineStep) ? (value as PipelineStep) : null;
}

function gateIndex(gate: QualityGateStep): number {
  return PIPELINE_STEPS.indexOf(gate);
}

/** Rewind target must be a real earlier stage, never the gate or anything after it. */
function sanitizeRewind(gate: QualityGateStep, requested: PipelineStep | null): PipelineStep | null {
  const allowed = allowedRewinds(gate);
  const candidate = requested && allowed.includes(requested) ? requested : defaultRewind(gate);
  if (PIPELINE_STEPS.indexOf(candidate) < 0) return null;
  if (PIPELINE_STEPS.indexOf(candidate) >= gateIndex(gate)) return defaultRewind(gate);
  return candidate;
}

export function parseQualityGate(step: QualityGateStep, output: StepOutput): QualityGateResult {
  const record = output as Partial<QaOutput & ShipCheckOutput>;
  const passed = record.passed === true;
  if (passed) {
    return { passed: true, rewindTo: null, feedback: "" };
  }

  const requested = asStep(record.rewindTo, allowedRewinds(step));
  const rewindTo = sanitizeRewind(step, requested);
  const notes = typeof record.notes === "string" ? record.notes.trim() : "";
  const explicit = typeof record.feedback === "string" ? record.feedback.trim() : "";
  const feedback =
    explicit ||
    notes ||
    `${step === "QA" ? "QA & compliance" : "Ship check"} failed. Fix the issues and keep client constraints.`;

  return { passed: false, rewindTo, feedback };
}
