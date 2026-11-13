"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function AuditForm({ clientProfileId }: { clientProfileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("clientProfileId", clientProfileId);

    const res = await fetch("/api/audits", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to create audit.");
      return;
    }
    const audit = await res.json();
    router.push(`/clients/${clientProfileId}/audits/${audit.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl" encType="multipart/form-data">
      <div>
        <Label htmlFor="name">Audit name *</Label>
        <Input id="name" name="name" required placeholder="Q3 site health audit" />
      </div>
      <div>
        <Label htmlFor="seedUrl">Seed URL (optional)</Label>
        <Input
          id="seedUrl"
          name="seedUrl"
          type="url"
          placeholder="https://example.com/important-page"
        />
        <p className="mt-1 text-xs text-foreground/50">
          Optional starting page. Site-wide stages use GSC/GA/crawl; page stages use the shortlist.
        </p>
      </div>
      <div>
        <Label htmlFor="scopeNotes">Scope notes (optional)</Label>
        <Textarea
          id="scopeNotes"
          name="scopeNotes"
          rows={3}
          placeholder="Sections of the site to include/exclude, known constraints…"
        />
      </div>
      <div>
        <Label htmlFor="notes">Evidence notes (optional)</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Paste context for the audit…" />
      </div>
      <div>
        <Label htmlFor="file">CSV / Excel upload (optional)</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        />
        <p className="mt-1 text-xs text-foreground/50">
          Crawl exports work well here. Accepted: .csv, .xlsx (max 5MB). Summarized only.
        </p>
      </div>
      <div>
        <Label htmlFor="runMode">Run mode *</Label>
        <Select id="runMode" name="runMode" required defaultValue="STEP_BY_STEP">
          <option value="STEP_BY_STEP">Review each stage</option>
          <option value="FULL_AUTO">Run all stages, review at end</option>
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create audit"}
      </Button>
    </form>
  );
}
