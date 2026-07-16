import { CredentialsForm } from "@/components/settings/credentials-form";
import { ModelSlotsForm } from "@/components/settings/model-slots-form";
import { getCredentialStatus } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ModelSettingsPage() {
  const [slots, credentialStatus] = await Promise.all([
    prisma.modelSlot.findMany({ orderBy: { step: "asc" } }),
    getCredentialStatus(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">AI models</h1>
        <p className="text-sm text-foreground/70">
          Connect your own Claude account and assign a model to each pipeline step.
        </p>
      </div>

      <CredentialsForm status={credentialStatus} />

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Per-step models</h2>
        <ModelSlotsForm slots={slots} connected={credentialStatus.connected} />
      </div>
    </div>
  );
}
