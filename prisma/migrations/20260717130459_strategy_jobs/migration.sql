-- CreateTable
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

-- CreateIndex
CREATE INDEX "StrategyJob_strategyId_idx" ON "StrategyJob"("strategyId");

-- CreateIndex
CREATE INDEX "StrategyJob_status_createdAt_idx" ON "StrategyJob"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "StrategyJob" ADD CONSTRAINT "StrategyJob_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
