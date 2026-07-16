import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PIPELINE_STEPS } from "../src/lib/pipeline/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  for (const step of PIPELINE_STEPS) {
    await prisma.modelSlot.upsert({
      where: { step },
      create: { step, enabled: false },
      update: {},
    });
  }

  const existing = await prisma.clientProfile.count();
  if (existing === 0) {
    await prisma.clientProfile.create({
      data: {
        name: "Demo Client",
        industry: "SaaS",
        audience: "Marketing managers at mid-size B2B companies",
        tone: "Professional, approachable",
        readingLevel: "General business",
        pointOfView: "Second person (you)",
        wordsToAvoid: ["synergy", "leverage"],
        seoNotes: "Prefer question-based H2s where natural.",
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
