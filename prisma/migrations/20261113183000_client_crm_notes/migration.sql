-- CRM card on the client: contact details and operator notes.
ALTER TABLE "ClientProfile" ADD COLUMN "contactName" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN "website" TEXT;
ALTER TABLE "ClientProfile" ADD COLUMN "crmNotes" TEXT;
