import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import type { AiProvider } from "@/lib/ai-providers";

const LEGACY_ANTHROPIC_ID = "singleton";

export interface CredentialStatus {
  connected: boolean;
  last4?: string;
  updatedAt?: Date;
}

export type CredentialStatuses = Record<AiProvider, CredentialStatus>;

function idsFor(provider: AiProvider): string[] {
  return provider === "anthropic" ? [provider, LEGACY_ANTHROPIC_ID] : [provider];
}

async function findCredential(provider: AiProvider) {
  const primary = await prisma.appCredential.findUnique({ where: { id: provider } });
  if (primary) return primary;
  if (provider === "anthropic") {
    return prisma.appCredential.findUnique({ where: { id: LEGACY_ANTHROPIC_ID } });
  }
  return null;
}

export async function saveProviderKey(provider: AiProvider, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("API key is empty.");

  const { ciphertext, iv, tag } = encryptSecret(trimmed);
  const last4 = trimmed.slice(-4);

  await prisma.appCredential.upsert({
    where: { id: provider },
    create: {
      id: provider,
      provider,
      keyCiphertext: ciphertext,
      keyIv: iv,
      keyTag: tag,
      keyLast4: last4,
    },
    update: {
      provider,
      keyCiphertext: ciphertext,
      keyIv: iv,
      keyTag: tag,
      keyLast4: last4,
    },
  });

  if (provider === "anthropic") {
    await prisma.appCredential.deleteMany({ where: { id: LEGACY_ANTHROPIC_ID } });
  }
}

export async function getProviderKey(provider: AiProvider): Promise<string | null> {
  const cred = await findCredential(provider);
  if (!cred) return null;
  try {
    return decryptSecret({ ciphertext: cred.keyCiphertext, iv: cred.keyIv, tag: cred.keyTag });
  } catch {
    return null;
  }
}

export async function getCredentialStatus(
  provider: AiProvider = "anthropic",
): Promise<CredentialStatus> {
  const cred = await findCredential(provider);
  if (!cred) return { connected: false };
  return { connected: true, last4: cred.keyLast4, updatedAt: cred.updatedAt };
}

export async function getCredentialStatuses(): Promise<CredentialStatuses> {
  const [anthropic, gemini] = await Promise.all([
    getCredentialStatus("anthropic"),
    getCredentialStatus("gemini"),
  ]);
  return { anthropic, gemini };
}

export async function deleteProviderKey(provider: AiProvider): Promise<void> {
  await prisma.appCredential.deleteMany({ where: { id: { in: idsFor(provider) } } });
}

export async function saveAnthropicKey(apiKey: string): Promise<void> {
  return saveProviderKey("anthropic", apiKey);
}

export async function getAnthropicKey(): Promise<string | null> {
  return getProviderKey("anthropic");
}

export async function deleteAnthropicKey(): Promise<void> {
  return deleteProviderKey("anthropic");
}
