import { ClaudeDefaultsForm } from "@/components/settings/claude-defaults-form";
import { CredentialsForm } from "@/components/settings/credentials-form";
import { DesktopGoogleForm } from "@/components/settings/desktop-google-form";
import { getCredentialStatuses } from "@/lib/credentials";
import { PIPELINE_STEPS } from "@/lib/pipeline/types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function ensureContentModelSlots() {
  await Promise.all(
    PIPELINE_STEPS.map((step) =>
      prisma.modelSlot.upsert({
        where: { step },
        create: { step, provider: null, model: null, enabled: false },
        update: {},
      }),
    ),
  );
}

function deriveInitialDefaults(opts: {
  strategy: { enabled: boolean; provider: string | null; model: string | null } | null;
  content: Array<{ enabled: boolean; provider: string | null; model: string | null }>;
  audit: Array<{ enabled: boolean; provider: string | null; model: string | null }>;
}) {
  const candidates = [opts.strategy, ...opts.content, ...opts.audit].filter(Boolean) as Array<{
    enabled: boolean;
    provider: string | null;
    model: string | null;
  }>;
  const live = candidates.find((s) => s.enabled && s.provider === "anthropic" && s.model);
  return {
    enabled: Boolean(live),
    model: live?.model ?? opts.strategy?.model ?? null,
  };
}

export default async function ModelSettingsPage() {
  await ensureContentModelSlots();

  const [slots, auditSlots, strategySlot, credentials] = await Promise.all([
    prisma.modelSlot.findMany({ orderBy: { step: "asc" } }),
    prisma.auditModelSlot.findMany(),
    prisma.strategyModelSlot.findUnique({ where: { id: "strategy" } }),
    getCredentialStatuses(),
  ]);

  const defaults = deriveInitialDefaults({
    strategy: strategySlot,
    content: slots,
    audit: auditSlots,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI models</h1>
        <p className="text-sm text-foreground/70">
          Connect Claude and choose one model for strategy, site audits, and content. Switch
          tiers anytime (for example Sonnet → Opus) without reconfiguring each stage.
        </p>
      </div>

      <CredentialsForm provider="anthropic" status={credentials.anthropic} />
      <DesktopGoogleForm />

      <ClaudeDefaultsForm
        anthropicConnected={credentials.anthropic.connected}
        initialEnabled={defaults.enabled}
        initialModel={defaults.model}
      />
    </div>
  );
}
