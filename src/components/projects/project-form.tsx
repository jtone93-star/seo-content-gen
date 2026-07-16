"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientProfile } from "@/generated/prisma/client";
import { parseUrlList } from "@/lib/utils";

type ProjectFormProps = {
  clients: ClientProfile[];
};

export function ProjectForm({ clients }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const urlsRaw = String(fd.get("sourceUrls") ?? "");

    const payload = {
      clientProfileId: fd.get("clientProfileId"),
      topic: fd.get("topic"),
      targetKeyword: fd.get("targetKeyword") || null,
      sourceUrls: parseUrlList(urlsRaw),
      pastedNotes: fd.get("pastedNotes") || null,
      targetLength: fd.get("targetLength") ? Number(fd.get("targetLength")) : null,
      contentType: fd.get("contentType"),
      runMode: fd.get("runMode"),
    };

    const createRes = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!createRes.ok) {
      setLoading(false);
      setError("Failed to create project.");
      return;
    }

    const project = await createRes.json();
    const startRes = await fetch(`/api/projects/${project.id}/start`, { method: "POST" });

    setLoading(false);
    if (!startRes.ok) {
      router.push(`/projects/${project.id}`);
      return;
    }

    router.push(`/projects/${project.id}`);
    router.refresh();
  }

  if (clients.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        Create a client profile first before starting content.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="clientProfileId">Client *</Label>
        <Select id="clientProfileId" name="clientProfileId" required defaultValue={clients[0]?.id}>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="topic">Topic *</Label>
        <Input id="topic" name="topic" required placeholder="e.g. How to reduce churn in SaaS" />
      </div>
      <div>
        <Label htmlFor="targetKeyword">Target keyword (optional)</Label>
        <Input id="targetKeyword" name="targetKeyword" placeholder="saas churn reduction" />
      </div>
      <div>
        <Label htmlFor="contentType">Content type *</Label>
        <Select id="contentType" name="contentType" required defaultValue="BLOG">
          <option value="BLOG">Blog post</option>
          <option value="LANDING_PAGE">Landing page</option>
          <option value="PRODUCT_DESCRIPTION">Product description</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="targetLength">Target length in words (optional)</Label>
        <Input id="targetLength" name="targetLength" type="number" min={100} placeholder="1500" />
      </div>
      <div>
        <Label htmlFor="sourceUrls">Source URLs (one per line or comma-separated)</Label>
        <Textarea
          id="sourceUrls"
          name="sourceUrls"
          rows={3}
          placeholder="https://example.com/article&#10;https://docs.example.com/guide"
        />
      </div>
      <div>
        <Label htmlFor="pastedNotes">Pasted research notes (optional)</Label>
        <Textarea
          id="pastedNotes"
          name="pastedNotes"
          rows={5}
          placeholder="Paste stats, quotes, bullet points, or briefs here…"
        />
      </div>
      <div>
        <Label htmlFor="runMode">Generation mode *</Label>
        <Select id="runMode" name="runMode" required defaultValue="STEP_BY_STEP">
          <option value="STEP_BY_STEP">Review each step</option>
          <option value="FULL_AUTO">Generate entire piece, review at end</option>
        </Select>
        <p className="mt-1 text-xs text-foreground/50">
          Step-by-step pauses after research, outline, draft, edit, and SEO. Full auto runs through
          to the final output.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Starting pipeline…" : "Create & start"}
      </Button>
    </form>
  );
}
