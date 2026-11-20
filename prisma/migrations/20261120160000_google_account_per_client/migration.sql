-- Google connections move from one per workspace to one per client.
-- The old workspace-wide connection cannot be attributed to a client, so it is removed
-- and each client is connected again from its Overview.
DELETE FROM "OAuthAccount";

ALTER TABLE "OAuthAccount" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "OAuthAccount" ADD COLUMN "clientId" TEXT NOT NULL;
ALTER TABLE "OAuthAccount" ADD COLUMN "accountEmail" TEXT;
ALTER TABLE "OAuthAccount" ADD COLUMN "analyticsPropertyName" TEXT;

CREATE UNIQUE INDEX "OAuthAccount_clientId_key" ON "OAuthAccount"("clientId");

ALTER TABLE "OAuthAccount"
  ADD CONSTRAINT "OAuthAccount_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
