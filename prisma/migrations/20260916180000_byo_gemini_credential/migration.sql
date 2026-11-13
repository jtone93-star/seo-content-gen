-- Move the legacy singleton Anthropic credential onto a provider-scoped id
-- so Gemini can be stored as a second encrypted key.
UPDATE "AppCredential"
SET id = 'anthropic', provider = 'anthropic'
WHERE id = 'singleton';

ALTER TABLE "AppCredential" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "AppCredential" ALTER COLUMN "provider" DROP DEFAULT;
