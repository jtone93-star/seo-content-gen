-- Replace the earlier single-shot Strategy tables with living strategy, KPIs, cycles.

DROP TABLE IF EXISTS "StrategyJob";
DROP TABLE IF EXISTS "StrategyRecommendation";
DROP TABLE IF EXISTS "StrategyDataSource";
DROP TABLE IF EXISTS "Strategy";
DROP TABLE IF EXISTS "StrategyModelSlot";

DROP TYPE IF EXISTS "StrategyRecommendationStatus";
DROP TYPE IF EXISTS "StrategyRecommendationCategory";
DROP TYPE IF EXISTS "StrategyDataSourceType";
DROP TYPE IF EXISTS "StrategyStatus";

ALTER TABLE "ClientProfile" ADD COLUMN IF NOT EXISTS "billingDay" INTEGER;

CREATE TYPE "StrategyLifecycle" AS ENUM ('LIVING', 'PAST');

CREATE TYPE "StrategyStatus" AS ENUM ('DRAFT', 'ANALYZING', 'READY', 'FAILED');

CREATE TYPE "StrategyRecommendationCategory" AS ENUM ('TECHNICAL', 'CONTENT', 'LINKING', 'UX', 'MEASUREMENT', 'AI_VISIBILITY');

CREATE TYPE "StrategyRecommendationStatus" AS ENUM ('PROPOSED', 'REJECTED', 'BACKLOG', 'SCHEDULED', 'DONE');

CREATE TYPE "CycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED');

CREATE TYPE "CycleItemStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED');

CREATE TYPE "CycleItemWorkKind" AS ENUM ('CONTENT', 'TECH');

CREATE TABLE "StrategyModelSlot" (
    "id" TEXT NOT NULL DEFAULT 'strategy',
    "provider" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyModelSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lifecycle" "StrategyLifecycle" NOT NULL DEFAULT 'LIVING',
    "status" "StrategyStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceAuditId" TEXT,
    "notes" TEXT,
    "synthesis" TEXT,
    "errorMessage" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategyKpi" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "baseline" DOUBLE PRECISION,
    "target" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyKpi_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategyRecommendation" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "category" "StrategyRecommendationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "relatedUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetKeyword" TEXT,
    "priority" INTEGER NOT NULL,
    "effort" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "status" "StrategyRecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CycleStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CycleItem" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "workKind" "CycleItemWorkKind" NOT NULL,
    "executionStatus" "CycleItemStatus" NOT NULL DEFAULT 'PLANNED',
    "contentProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CycleItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StrategyJob" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "status" "PipelineJobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StrategyJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Strategy_clientProfileId_idx" ON "Strategy"("clientProfileId");
CREATE INDEX "Strategy_lifecycle_idx" ON "Strategy"("lifecycle");
CREATE INDEX "Strategy_status_idx" ON "Strategy"("status");
CREATE INDEX "Strategy_sourceAuditId_idx" ON "Strategy"("sourceAuditId");
CREATE UNIQUE INDEX "Strategy_one_living_per_client" ON "Strategy"("clientProfileId") WHERE "lifecycle" = 'LIVING';

CREATE UNIQUE INDEX "StrategyKpi_strategyId_metricKey_key" ON "StrategyKpi"("strategyId", "metricKey");
CREATE INDEX "StrategyKpi_strategyId_idx" ON "StrategyKpi"("strategyId");

CREATE INDEX "StrategyRecommendation_strategyId_idx" ON "StrategyRecommendation"("strategyId");
CREATE INDEX "StrategyRecommendation_category_idx" ON "StrategyRecommendation"("category");
CREATE INDEX "StrategyRecommendation_status_idx" ON "StrategyRecommendation"("status");

CREATE UNIQUE INDEX "Cycle_strategyId_year_month_key" ON "Cycle"("strategyId", "year", "month");
CREATE INDEX "Cycle_strategyId_idx" ON "Cycle"("strategyId");

CREATE UNIQUE INDEX "CycleItem_recommendationId_key" ON "CycleItem"("recommendationId");
CREATE INDEX "CycleItem_cycleId_idx" ON "CycleItem"("cycleId");
CREATE INDEX "CycleItem_contentProjectId_idx" ON "CycleItem"("contentProjectId");

CREATE INDEX "StrategyJob_strategyId_idx" ON "StrategyJob"("strategyId");
CREATE INDEX "StrategyJob_status_createdAt_idx" ON "StrategyJob"("status", "createdAt");

ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_sourceAuditId_fkey" FOREIGN KEY ("sourceAuditId") REFERENCES "Audit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StrategyKpi" ADD CONSTRAINT "StrategyKpi_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StrategyRecommendation" ADD CONSTRAINT "StrategyRecommendation_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CycleItem" ADD CONSTRAINT "CycleItem_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycleItem" ADD CONSTRAINT "CycleItem_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "StrategyRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CycleItem" ADD CONSTRAINT "CycleItem_contentProjectId_fkey" FOREIGN KEY ("contentProjectId") REFERENCES "ContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StrategyJob" ADD CONSTRAINT "StrategyJob_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
