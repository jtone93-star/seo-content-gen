import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueAndRun } from "@/lib/jobs/run-inline";
import { latestFindingsPack } from "./evidence";
import { runStrategySynthesis } from "./executor-registry";
import { isKpiMetricKey } from "./kpi-catalog";
import { syncStrategyKpis } from "./kpi-sync";
import { addMonths, currentBillingPeriod, cycleWindow, nextUnusedPeriods } from "./cycles";
import { workKindForCategory } from "./types";

export const strategyInclude = {
  kpis: { orderBy: { createdAt: "asc" as const } },
  recommendations: { orderBy: [{ priority: "asc" as const }, { createdAt: "asc" as const }] },
  cycles: {
    orderBy: [{ year: "asc" as const }, { month: "asc" as const }],
    include: {
      items: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          recommendation: true,
          contentProject: { select: { id: true, topic: true, status: true } },
        },
      },
    },
  },
  sourceAudit: { select: { id: true, name: true, status: true } },
} satisfies Prisma.StrategyInclude;

export async function loadStrategy(id: string) {
  return prisma.strategy.findUnique({ where: { id }, include: strategyInclude });
}

export class StrategyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrategyError";
  }
}

export async function createLivingStrategy(params: {
  clientProfileId: string;
  name: string;
  sourceAuditId?: string | null;
  notes?: string | null;
  kpis?: Array<{ metricKey: string; baseline?: number | null; target: number; deadline?: string | null }>;
}) {
  const client = await prisma.clientProfile.findUnique({ where: { id: params.clientProfileId } });
  if (!client) throw new StrategyError("Client profile not found.");

  if (params.sourceAuditId) {
    const audit = await prisma.audit.findFirst({
      where: { id: params.sourceAuditId, clientProfileId: params.clientProfileId },
    });
    if (!audit) throw new StrategyError("Source audit not found for this client.");
  }

  const kpiRows = (params.kpis ?? []).filter((k) => isKpiMetricKey(k.metricKey));
  for (const kpi of kpiRows) {
    if (!Number.isFinite(kpi.target)) throw new StrategyError("Each KPI needs a numeric target.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.strategy.updateMany({
      where: { clientProfileId: params.clientProfileId, lifecycle: "LIVING" },
      data: { lifecycle: "PAST", archivedAt: new Date() },
    });
    return tx.strategy.create({
      data: {
        clientProfileId: params.clientProfileId,
        name: params.name.trim(),
        sourceAuditId: params.sourceAuditId || null,
        notes: params.notes?.trim() || null,
        lifecycle: "LIVING",
        status: "DRAFT",
        kpis: {
          create: kpiRows.map((k) => ({
            metricKey: k.metricKey,
            baseline: k.baseline ?? null,
            target: k.target,
            deadline: k.deadline ? new Date(k.deadline) : null,
          })),
        },
      },
      include: strategyInclude,
    });
  });
}

export async function restoreStrategy(strategyId: string) {
  const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
  if (!strategy) throw new StrategyError("Strategy not found.");
  if (strategy.lifecycle === "LIVING") return loadStrategy(strategyId);

  await prisma.$transaction(async (tx) => {
    await tx.strategy.updateMany({
      where: { clientProfileId: strategy.clientProfileId, lifecycle: "LIVING" },
      data: { lifecycle: "PAST", archivedAt: new Date() },
    });
    await tx.strategy.update({
      where: { id: strategyId },
      data: { lifecycle: "LIVING", archivedAt: null },
    });
  });

  return loadStrategy(strategyId);
}

export async function analyzeStrategy(strategyId: string) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: { kpis: true, clientProfile: true },
  });
  if (!strategy) throw new StrategyError("Strategy not found.");
  if (strategy.lifecycle !== "LIVING") {
    throw new StrategyError("Restore this as the living strategy before generating recommendations.");
  }

  await prisma.strategy.update({
    where: { id: strategyId },
    data: { status: "ANALYZING", errorMessage: null },
  });

  try {
    let audit = strategy.sourceAuditId
      ? await prisma.audit.findUnique({
          where: { id: strategy.sourceAuditId },
          include: {
            dataSources: true,
            artifacts: { orderBy: [{ step: "asc" }, { version: "desc" }] },
          },
        })
      : null;

    if (!audit) {
      audit = await prisma.audit.findFirst({
        where: { clientProfileId: strategy.clientProfileId, status: "COMPLETED" },
        orderBy: { updatedAt: "desc" },
        include: {
          dataSources: true,
          artifacts: { orderBy: [{ step: "asc" }, { version: "desc" }] },
        },
      });
      if (audit && !strategy.sourceAuditId) {
        await prisma.strategy.update({
          where: { id: strategyId },
          data: { sourceAuditId: audit.id },
        });
      }
    }

    const findingsPack = audit ? latestFindingsPack(audit.artifacts) : null;
    const synthesis = await runStrategySynthesis({
      strategy,
      client: strategy.clientProfile,
      audit,
      findingsPack,
    });

    await prisma.strategyRecommendation.deleteMany({
      where: { strategyId, status: "PROPOSED" },
    });

    await prisma.strategyRecommendation.createMany({
      data: synthesis.recommendations.map((rec) => ({
        strategyId,
        category: rec.category,
        title: rec.title,
        rationale: rec.rationale,
        instructions: rec.instructions,
        evidence: rec.evidence as unknown as Prisma.InputJsonValue,
        relatedUrls: rec.relatedUrls,
        targetKeyword: rec.targetKeyword,
        priority: rec.priority,
        effort: rec.effort,
        impact: rec.impact,
        status: "PROPOSED" as const,
      })),
    });

    await prisma.strategy.update({
      where: { id: strategyId },
      data: { status: "READY", synthesis: synthesis.summary, errorMessage: null },
    });

    await syncStrategyKpis(strategyId);
    return loadStrategy(strategyId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Strategy analysis failed.";
    await prisma.strategy.update({
      where: { id: strategyId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }
}

export async function approveRecommendations(strategyId: string, ids?: string[]) {
  const where: Prisma.StrategyRecommendationWhereInput = {
    strategyId,
    status: "PROPOSED",
    ...(ids?.length ? { id: { in: ids } } : {}),
  };
  const result = await prisma.strategyRecommendation.updateMany({
    where,
    data: { status: "BACKLOG" },
  });
  return result.count;
}

export async function rejectRecommendations(strategyId: string, ids: string[]) {
  if (!ids.length) return 0;
  const result = await prisma.strategyRecommendation.updateMany({
    where: { strategyId, id: { in: ids }, status: "PROPOSED" },
    data: { status: "REJECTED" },
  });
  return result.count;
}

export async function upsertKpi(
  strategyId: string,
  input: {
    id?: string;
    metricKey: string;
    baseline?: number | null;
    target: number;
    currentValue?: number | null;
    deadline?: string | null;
  },
) {
  if (!isKpiMetricKey(input.metricKey)) throw new StrategyError("Unknown KPI metric.");
  if (!Number.isFinite(input.target)) throw new StrategyError("KPI target is required.");
  const data = {
    metricKey: input.metricKey,
    baseline: input.baseline ?? null,
    target: input.target,
    currentValue: input.currentValue === undefined ? undefined : input.currentValue,
    deadline: input.deadline ? new Date(input.deadline) : null,
  };
  if (input.id) {
    return prisma.strategyKpi.update({ where: { id: input.id }, data });
  }
  return prisma.strategyKpi.upsert({
    where: { strategyId_metricKey: { strategyId, metricKey: input.metricKey } },
    create: { strategyId, ...data, currentValue: input.currentValue ?? null },
    update: data,
  });
}

export async function createCycle(strategyId: string, year: number, month: number) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: { clientProfile: true },
  });
  if (!strategy) throw new StrategyError("Strategy not found.");
  if (strategy.lifecycle !== "LIVING") throw new StrategyError("Cycles can only be added on the living strategy.");
  const billingDay = strategy.clientProfile.billingDay;
  if (!billingDay) throw new StrategyError("Set a billing day (1–28) on the client before creating cycles.");

  const window = cycleWindow(year, month, billingDay);
  try {
    return await prisma.cycle.create({
      data: {
        strategyId,
        year,
        month,
        label: window.label,
        startDate: window.startDate,
        endDate: window.endDate,
      },
    });
  } catch {
    throw new StrategyError(`${window.label} already exists on this strategy.`);
  }
}

/** Create the current and next billing-month cycles if they are missing. */
export async function ensureWorkingWindows(strategyId: string) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: { clientProfile: true },
  });
  if (!strategy || strategy.lifecycle !== "LIVING") return [];
  const billingDay = strategy.clientProfile.billingDay;
  if (!billingDay) return [];

  const current = currentBillingPeriod(new Date(), billingDay);
  const periods = [current, addMonths(current.year, current.month, 1)];
  const cycles = [];
  for (const period of periods) {
    const window = cycleWindow(period.year, period.month, billingDay);
    cycles.push(
      await prisma.cycle.upsert({
        where: {
          strategyId_year_month: {
            strategyId,
            year: period.year,
            month: period.month,
          },
        },
        create: {
          strategyId,
          year: period.year,
          month: period.month,
          label: window.label,
          startDate: window.startDate,
          endDate: window.endDate,
        },
        update: {},
      }),
    );
  }
  return cycles;
}

export async function moveBacklogPriority(
  strategyId: string,
  recommendationId: string,
  direction: "up" | "down",
) {
  const recs = await prisma.strategyRecommendation.findMany({
    where: { strategyId, status: "BACKLOG" },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  const index = recs.findIndex((rec) => rec.id === recommendationId);
  if (index < 0) throw new StrategyError("That play is not in the backlog.");
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= recs.length) return;

  const ordered = [...recs];
  const [moved] = ordered.splice(index, 1);
  ordered.splice(swapWith, 0, moved);
  await prisma.$transaction(
    ordered.map((rec, i) =>
      prisma.strategyRecommendation.update({
        where: { id: rec.id },
        data: { priority: i + 1 },
      }),
    ),
  );
}

export async function createNextCycles(strategyId: string, count = 6) {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: { clientProfile: true, cycles: true },
  });
  if (!strategy) throw new StrategyError("Strategy not found.");
  if (!strategy.clientProfile.billingDay) {
    throw new StrategyError("Set a billing day (1–28) on the client before creating cycles.");
  }
  const periods = nextUnusedPeriods(strategy.cycles, strategy.clientProfile.billingDay, count);
  const created = [];
  for (const period of periods) {
    created.push(await createCycle(strategyId, period.year, period.month));
  }
  return created;
}

export async function assignToCycle(cycleId: string, recommendationIds: string[]) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: { strategy: true, items: true },
  });
  if (!cycle) throw new StrategyError("Cycle not found.");
  if (cycle.strategy.lifecycle !== "LIVING") throw new StrategyError("Assign items on the living strategy.");

  const recs = await prisma.strategyRecommendation.findMany({
    where: { id: { in: recommendationIds }, strategyId: cycle.strategyId },
  });
  if (recs.length !== recommendationIds.length) {
    throw new StrategyError("One or more recommendations do not belong to this strategy.");
  }
  for (const rec of recs) {
    if (rec.status !== "BACKLOG") {
      throw new StrategyError(`“${rec.title}” must be in the backlog before it can be scheduled.`);
    }
  }

  let sort = cycle.items.length;
  await prisma.$transaction(async (tx) => {
    for (const rec of recs) {
      await tx.cycleItem.create({
        data: {
          cycleId,
          recommendationId: rec.id,
          sortOrder: sort,
          workKind: workKindForCategory(rec.category),
        },
      });
      await tx.strategyRecommendation.update({
        where: { id: rec.id },
        data: { status: "SCHEDULED" },
      });
      sort += 1;
    }
  });
}

export async function unassignCycleItem(cycleItemId: string) {
  const item = await prisma.cycleItem.findUnique({
    where: { id: cycleItemId },
    include: { cycle: true },
  });
  if (!item) throw new StrategyError("Cycle item not found.");
  await prisma.$transaction([
    prisma.cycleItem.delete({ where: { id: cycleItemId } }),
    prisma.strategyRecommendation.update({
      where: { id: item.recommendationId },
      data: { status: "BACKLOG" },
    }),
  ]);
  await refreshCycleStatus(item.cycleId);
}

export async function setCycleItemStatus(
  cycleItemId: string,
  executionStatus: "PLANNED" | "IN_PROGRESS" | "DONE" | "BLOCKED",
) {
  const item = await prisma.cycleItem.findUnique({ where: { id: cycleItemId } });
  if (!item) throw new StrategyError("Cycle item not found.");

  const recStatus =
    executionStatus === "DONE" ? "DONE" : executionStatus === "PLANNED" ? "SCHEDULED" : "SCHEDULED";

  await prisma.$transaction([
    prisma.cycleItem.update({
      where: { id: cycleItemId },
      data: { executionStatus },
    }),
    prisma.strategyRecommendation.update({
      where: { id: item.recommendationId },
      data: { status: recStatus },
    }),
  ]);
  await refreshCycleStatus(item.cycleId);
  const itemFull = await prisma.cycleItem.findUnique({
    where: { id: cycleItemId },
    include: { cycle: true },
  });
  if (itemFull) await syncStrategyKpis(itemFull.cycle.strategyId);
}

async function refreshCycleStatus(cycleId: string) {
  const items = await prisma.cycleItem.findMany({ where: { cycleId } });
  if (!items.length) {
    await prisma.cycle.update({ where: { id: cycleId }, data: { status: "PLANNED" } });
    return;
  }
  const allDone = items.every((i) => i.executionStatus === "DONE");
  const anyStarted = items.some((i) => i.executionStatus !== "PLANNED");
  await prisma.cycle.update({
    where: { id: cycleId },
    data: { status: allDone ? "COMPLETED" : anyStarted ? "ACTIVE" : "PLANNED" },
  });
}

export async function startCycleWork(cycleId: string, cycleItemIds?: string[]) {
  const cycle = await prisma.cycle.findUnique({
    where: { id: cycleId },
    include: {
      strategy: { include: { clientProfile: true } },
      items: { include: { recommendation: true } },
    },
  });
  if (!cycle) throw new StrategyError("Cycle not found.");
  if (cycle.strategy.lifecycle !== "LIVING") {
    throw new StrategyError("Start work from the living strategy.");
  }

  const selected = cycleItemIds?.length
    ? cycle.items.filter((item) => cycleItemIds.includes(item.id))
    : cycle.items;
  if (!selected.length) throw new StrategyError("No cycle items to start.");

  const started: Array<{ cycleItemId: string; workKind: string; contentProjectId?: string }> = [];

  for (const item of selected) {
    if (item.workKind === "CONTENT") {
      if (!item.contentProjectId) {
        const rec = item.recommendation;
        const project = await prisma.contentProject.create({
          data: {
            clientProfileId: cycle.strategy.clientProfileId,
            topic: rec.title,
            targetKeyword: rec.targetKeyword,
            sourceUrls: rec.relatedUrls,
            pastedNotes: [rec.rationale, rec.instructions].filter(Boolean).join("\n\n"),
            contentType: "BLOG",
            runMode: "STEP_BY_STEP",
            status: "DRAFT",
          },
        });
        await prisma.cycleItem.update({
          where: { id: item.id },
          data: { contentProjectId: project.id, executionStatus: "IN_PROGRESS" },
        });
        const result = await enqueueAndRun({ projectId: project.id, type: "START" });
        if (!result.ok) {
          await prisma.contentProject.update({
            where: { id: project.id },
            data: { errorMessage: result.error },
          });
        }
        started.push({ cycleItemId: item.id, workKind: "CONTENT", contentProjectId: project.id });
      } else if (item.executionStatus === "PLANNED") {
        await prisma.cycleItem.update({
          where: { id: item.id },
          data: { executionStatus: "IN_PROGRESS" },
        });
        started.push({
          cycleItemId: item.id,
          workKind: "CONTENT",
          contentProjectId: item.contentProjectId,
        });
      }
    } else {
      await prisma.cycleItem.update({
        where: { id: item.id },
        data: { executionStatus: item.executionStatus === "DONE" ? "DONE" : "IN_PROGRESS" },
      });
      started.push({ cycleItemId: item.id, workKind: "TECH" });
    }

    await prisma.strategyRecommendation.update({
      where: { id: item.recommendationId },
      data: { status: "SCHEDULED" },
    });
  }

  await refreshCycleStatus(cycleId);
  await syncStrategyKpis(cycle.strategyId);
  return { started, exportPath: `/api/strategies/${cycle.strategyId}/cycles/${cycleId}/export` };
}
