import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { parseSpreadsheet } from "@/lib/audit/ingest";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];

function extensionOf(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx >= 0 ? fileName.slice(idx).toLowerCase() : "";
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const audit = await prisma.audit.findUnique({ where: { id } });
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const notesRaw = String(form.get("notes") ?? "").trim();
      const labelRaw = String(form.get("label") ?? "").trim();
      const uploaded = form.get("file");
      const file = uploaded instanceof File ? uploaded : null;

      if ((!file || file.size === 0) && !notesRaw) {
        return NextResponse.json({ error: "Provide a CSV/Excel file and/or notes." }, { status: 400 });
      }

      const created = [];
      if (notesRaw) {
        created.push(
          await prisma.auditDataSource.create({
            data: {
              auditId: id,
              type: "NOTE",
              label: labelRaw || "Notes",
              summary: { text: notesRaw },
            },
          }),
        );
      }
      if (file && file.size > 0) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json(
            { error: `File too large. Maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)}MB.` },
            { status: 400 },
          );
        }
        const ext = extensionOf(file.name);
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
          return NextResponse.json(
            { error: "Unsupported file type. Upload a CSV or Excel file (.csv, .xlsx)." },
            { status: 400 },
          );
        }
        try {
          const summary = await parseSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
          created.push(
            await prisma.auditDataSource.create({
              data: {
                auditId: id,
                type: "UPLOAD",
                label: labelRaw || file.name,
                summary: summary as unknown as Prisma.InputJsonValue,
                meta: { fileName: file.name, mimeType: file.type || null, byteLength: file.size },
              },
            }),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to parse spreadsheet.";
          return NextResponse.json({ error: message }, { status: 400 });
        }
      }
      return NextResponse.json(created.length === 1 ? created[0] : created, { status: 201 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.notes !== "string" || !body.notes.trim()) {
      return NextResponse.json({ error: "notes is required for JSON uploads." }, { status: 400 });
    }
    const source = await prisma.auditDataSource.create({
      data: {
        auditId: id,
        type: "NOTE",
        label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : "Notes",
        summary: { text: body.notes.trim() },
      },
    });
    return NextResponse.json(source, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add data source.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
