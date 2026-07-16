import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";

const CREDENTIAL_ID = "singleton";

export interface CredentialStatus {
  connected: boolean;
  last4?: string;
  updatedAt?: Date;
}

export async function saveAnthropicKey(apiKey: string): Promise<void> {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error("API key is empty.");

  const { ciphertext, iv, tag } = encryptSecret(trimmed);
  const last4 = trimmed.slice(-4);

  await prisma.appCredential.upsert({
    where: { id: CREDENTIAL_ID },
    create: {
      id: CREDENTIAL_ID,
      provider: "anthropic",
      keyCiphertext: ciphertext,
      keyIv: iv,
      keyTag: tag,
      keyLast4: last4,
    },
    update: {
      provider: "anthropic",
      keyCiphertext: ciphertext,
      keyIv: iv,
      keyTag: tag,
      keyLast4: last4,
    },
  });
}

export async function getAnthropicKey(): Promise<string | null> {
  const cred = await prisma.appCredential.findUnique({ where: { id: CREDENTIAL_ID } });
  if (!cred) return null;
  try {
    return decryptSecret({ ciphertext: cred.keyCiphertext, iv: cred.keyIv, tag: cred.keyTag });
  } catch {
    return null;
  }
}

export async function getCredentialStatus(): Promise<CredentialStatus> {
  const cred = await prisma.appCredential.findUnique({ where: { id: CREDENTIAL_ID } });
  if (!cred) return { connected: false };
  return { connected: true, last4: cred.keyLast4, updatedAt: cred.updatedAt };
}

export async function deleteAnthropicKey(): Promise<void> {
  await prisma.appCredential.deleteMany({ where: { id: CREDENTIAL_ID } });
}
