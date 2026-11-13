-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('DRAFT', 'ANALYZING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "StrategyDataSourceType" AS ENUM ('GA4', 'GSC', 'UPLOAD', 'NOTE');

-- CreateEnum
CREATE TYPE "StrategyRecommendationCategory" AS ENUM ('TECHNICAL', 'CONTENT', 'LINKING', 'UX', 'MEASUREMENT');

-- CreateEnum
CREATE TYPE "StrategyRecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'DISMISSED', 'CONVERTED');

-- CreateTable
CREATE TABLE "StrategyModelSlot" (
    "id" TEXT NOT NULL DEFAULT 'strategy',
    "provider" TEXT,
    "model" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyModelSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "id" TEXT NOT NULL,
    "clientProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'DRAFT',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyDataSource" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "type" "StrategyDataSourceType" NOT NULL,
    "label" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyDataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyRecommendation" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "category" "StrategyRecommendationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "priority" INTEGER NOT NULL,
    "effort" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "status" "StrategyRecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "contentProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL DEFAULT 'google',
    "provider" TEXT NOT NULL DEFAULT 'google',
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenIv" TEXT NOT NULL,
    "accessTokenTag" TEXT NOT NULL,
    "refreshTokenCiphertext" TEXT,
    "refreshTokenIv" TEXT,
    "refreshTokenTag" TEXT,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "analyticsPropertyId" TEXT,
    "searchConsoleSiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Strategy_clientProfileId_idx" ON "Strategy"("clientProfileId");

-- CreateIndex
CREATE INDEX "Strategy_status_idx" ON "Strategy"("status");

-- CreateIndex
CREATE INDEX "StrategyDataSource_strategyId_idx" ON "StrategyDataSource"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyDataSource_type_idx" ON "StrategyDataSource"("type");

-- CreateIndex
CREATE INDEX "StrategyRecommendation_strategyId_idx" ON "StrategyRecommendation"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyRecommendation_category_idx" ON "StrategyRecommendation"("category");

-- CreateIndex
CREATE INDEX "StrategyRecommendation_contentProjectId_idx" ON "StrategyRecommendation"("contentProjectId");

-- AddForeignKey
ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_clientProfileId_fkey" FOREIGN KEY ("clientProfileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyDataSource" ADD CONSTRAINT "StrategyDataSource_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyRecommendation" ADD CONSTRAINT "StrategyRecommendation_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrategyRecommendation" ADD CONSTRAINT "StrategyRecommendation_contentProjectId_fkey" FOREIGN KEY ("contentProjectId") REFERENCES "ContentProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
