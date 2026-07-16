-- Job queue for async pipeline execution
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

CREATE TYPE "PipelineJobType" AS ENUM ('START', 'APPROVE', 'REGENERATE');
CREATE TYPE "PipelineJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "PipelineJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "PipelineJobType" NOT NULL,
    "step" "PipelineStep",
    "feedback" TEXT,
    "status" "PipelineJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PipelineJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PipelineJob_status_createdAt_idx" ON "PipelineJob"("status", "createdAt");
CREATE INDEX "PipelineJob_projectId_idx" ON "PipelineJob"("projectId");

ALTER TABLE "PipelineJob" ADD CONSTRAINT "PipelineJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
