-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('BLOG', 'LANDING_PAGE', 'PRODUCT_DESCRIPTION');

-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('STEP_BY_STEP', 'FULL_AUTO');

-- CreateEnum
CREATE TYPE "PipelineStep" AS ENUM ('RESEARCH', 'OUTLINE', 'DRAFT', 'EDIT', 'SEO', 'FINAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED_FOR_REVIEW', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ArtifactStatus" AS ENUM ('PENDING', 'RUNNING', 'AWAITING_REVIEW', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "audience" TEXT,
    "tone" TEXT,
    "readingLevel" TEXT,
    "pointOfView" TEXT,
    "wordsToAvoid" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredDisclaimers" TEXT,
    "seoNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentProject" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "targetKeyword" TEXT,
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pastedNotes" TEXT,
    "targetLength" INTEGER,
    "contentType" "ContentType" NOT NULL,
    "runMode" "RunMode" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStep" "PipelineStep",
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StepArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "step" "PipelineStep" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ArtifactStatus" NOT NULL DEFAULT 'PENDING',
    "inputSnapshot" JSONB,
    "output" JSONB,
    "userFeedback" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StepArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelSlot" (
    "step" "PipelineStep" NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModelSlot_pkey" PRIMARY KEY ("step")
);

-- CreateIndex
CREATE INDEX "ContentProject_clientProfileId_idx" ON "ContentProject"("clientProfileId");

-- CreateIndex
CREATE INDEX "ContentProject_status_idx" ON "ContentProject"("status");

-- CreateIndex
CREATE INDEX "StepArtifact_projectId_idx" ON "StepArtifact"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "StepArtifact_projectId_step_version_key" ON "StepArtifact"("projectId", "step", "version");

-- AddForeignKey
ALTER TABLE "ContentProject" ADD CONSTRAINT "ContentProject_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StepArtifact" ADD CONSTRAINT "StepArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ContentProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
