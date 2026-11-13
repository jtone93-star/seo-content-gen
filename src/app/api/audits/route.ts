import { NextResponse } from "next/server";
import type { Prisma, RunMode } from "@/generated/prisma/client";
import { parseSpreadsheet } from "@/lib/audit/ingest";
import { prisma } from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

async function createOptionalSources(auditId: string, notes: string | null, file: File | null) {
  if (notes) {
    await prisma.auditDataSource.create({
      data: { auditId, type: "NOTE", label: "Notes", summary: { text: notes } },
    });
  }
  if (file && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.`);
    }
    const ext = extensionOf(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error("Unsupported file type. Upload a CSV or Excel file (.csv, .xlsx).");
    }
    const summary = await parseSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
    await prisma.auditDataSource.create({
      data: {
        auditId,
        type: "UPLOAD",
        label: file.name,
        summary: summary as unknown as Prisma.InputJsonValue,
        meta: { fileName: file.name, mimeType: file.type || null, byteLength: file.size },
      },
    });
  }
}

export async function GET(request: Request) {
  const clientProfileId = new URL(request.url).searchParams.get("clientProfileId");
  const audits = await prisma.audit.findMany({
    where: clientProfileId ? { clientProfileId } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { dataSources: true, artifacts: true } } },
  });
  return NextResponse.json(audits);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let clientProfileId = "";
    let name = "";
    let seedUrl: string | null = null;
    let scopeNotes: string | null = null;
    let runMode: RunMode = "STEP_BY_STEP";
    let notes: string | null = null;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      clientProfileId = String(form.get("clientProfileId") ?? "").trim();
      name = String(form.get("name") ?? "").trim();
      const seedRaw = String(form.get("seedUrl") ?? "").trim();
      seedUrl = seedRaw || null;
      scopeNotes = String(form.get("scopeNotes") ?? "").trim() || null;
      runMode = (String(form.get("runMode") ?? "STEP_BY_STEP") as RunMode) || "STEP_BY_STEP";
      notes = String(form.get("notes") ?? "").trim() || null;
      const uploaded = form.get("file");
      file = uploaded instanceof File ? uploaded : null;
    } else {
      const body = await request.json();
      clientProfileId = String(body.clientProfileId ?? "").trim();
      name = String(body.name ?? "").trim();
      seedUrl = body.seedUrl ? String(body.seedUrl).trim() : null;
      scopeNotes = body.scopeNotes ? String(body.scopeNotes).trim() : null;
      runMode = (body.runMode as RunMode) || "STEP_BY_STEP";
      notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
    }

    if (!clientProfileId) return NextResponse.json({ error: "clientProfileId is required." }, { status: 400 });
    if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });
    if (seedUrl && !isHttpUrl(seedUrl)) {
      return NextResponse.json({ error: "seedUrl must be a valid http(s) URL." }, { status: 400 });
    }

    const client = await prisma.clientProfile.findUnique({ where: { id: clientProfileId } });
    if (!client) return NextResponse.json({ error: "Client profile not found." }, { status: 404 });

    const audit = await prisma.audit.create({
      data: {
        clientProfileId,
        name,
        seedUrl,
        scopeNotes,
        runMode,
        status: "DRAFT",
        selectedPages: seedUrl ? [seedUrl] : [],
      },
    });

    try {
      await createOptionalSources(audit.id, notes, file);
    } catch (err) {
      await prisma.audit.delete({ where: { id: audit.id } });
      const message = err instanceof Error ? err.message : "Failed to process upload.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const full = await prisma.audit.findUnique({
      where: { id: audit.id },
      include: { dataSources: true, artifacts: true },
    });
    return NextResponse.json(full, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create audit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
