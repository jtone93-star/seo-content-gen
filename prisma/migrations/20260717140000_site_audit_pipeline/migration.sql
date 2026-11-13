-- CreateEnum
CREATE TYPE "AuditStep" AS ENUM (
  'CRAWL_TECHNICAL',
  'INDEXATION',
  'VISIBILITY_DEMAND',
  'INTERNAL_LINKING',
  'PAGE_SHORTLIST',
  'PAGE_DEEP_DIVE',
  'KEYWORD_RELEVANCE',
  'AI_CRAWLABILITY',
  'AI_EXTRACTABILITY',
  'FINDINGS_ROLLUP'
);

-- CreateEnum
CREATE TYPE "AuditDataSourceType" AS ENUM ('GA4', 'GSC', 'UPLOAD', 'NOTE');

-- Drop legacy strategy tables (local feature branch; replaced by Audit pipeline)
DROP TABLE IF EXISTS "StrategyRecommendation" CASCADE;
DROP TABLE IF EXISTS "StrategyDataSource" CASCADE;
DROP TABLE IF EXISTS "StrategyJob" CASCADE;
DROP TABLE IF EXISTS "Strategy" CASCADE;
DROP TABLE IF EXISTS "StrategyModelSlot" CASCADE;

DROP TYPE IF EXISTS "StrategyStatus";
DROP TYPE IF EXISTS "StrategyDataSourceType";
DROP TYPE IF EXISTS "StrategyRecommendationCategory";
DROP TYPE IF EXISTS "StrategyRecommendationStatus";

-- CreateTable
CREATE TABLE "AuditModelSlot" (
    "step" "AuditStep" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditModelSlot_pkey" PRIMARY KEY ("step")
);

CREATE TABLE "Audit" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seedUrl" TEXT,
    "scopeNotes" TEXT,
    "runMode" "RunMode" NOT NULL DEFAULT 'STEP_BY_STEP',
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" "AuditStep",
    "selectedPages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditJob" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "type" "PipelineJobType" NOT NULL,
    "step" "AuditStep",
    "feedback" TEXT,
    "status" "PipelineJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AuditJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditDataSource" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "type" "AuditDataSourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditDataSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditArtifact" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "step" "AuditStep" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "inputSnapshot" JSONB,
    "output" JSONB,
    "userFeedback" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AuditArtifact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Audit_clientProfileId_idx" ON "Audit"("clientProfileId");
CREATE INDEX "Audit_status_idx" ON "Audit"("status");
CREATE INDEX "AuditJob_auditId_idx" ON "AuditJob"("auditId");
CREATE INDEX "AuditJob_status_createdAt_idx" ON "AuditJob"("status", "createdAt");
CREATE INDEX "AuditDataSource_auditId_idx" ON "AuditDataSource"("auditId");
CREATE INDEX "AuditDataSource_type_idx" ON "AuditDataSource"("type");
CREATE UNIQUE INDEX "AuditArtifact_auditId_step_version_key" ON "AuditArtifact"("auditId", "step", "version");
CREATE INDEX "AuditArtifact_auditId_idx" ON "AuditArtifact"("auditId");

ALTER TABLE "Audit" ADD CONSTRAINT "Audit_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditJob" ADD CONSTRAINT "AuditJob_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditDataSource" ADD CONSTRAINT "AuditDataSource_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditArtifact" ADD CONSTRAINT "AuditArtifact_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
