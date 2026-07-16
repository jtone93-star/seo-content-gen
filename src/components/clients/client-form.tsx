"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ClientProfile } from "@/generated/prisma/client";

type ClientFormProps = {
  client?: ClientProfile;
};

export function ClientForm({ client }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const wordsRaw = String(fd.get("wordsToAvoid") ?? "");
    const payload = {
      name: fd.get("name"),
      industry: fd.get("industry") || null,
      audience: fd.get("audience") || null,
      tone: fd.get("tone") || null,
      readingLevel: fd.get("readingLevel") || null,
      pointOfView: fd.get("pointOfView") || null,
      wordsToAvoid: wordsRaw
        .split(/[,;\n]+/)
        .map((w) => w.trim())
        .filter(Boolean),
      requiredDisclaimers: fd.get("requiredDisclaimers") || null,
      seoNotes: fd.get("seoNotes") || null,
    };

    const url = client ? `/api/clients/${client.id}` : "/api/clients";
    const method = client ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (!res.ok) {
      setError("Failed to save client profile.");
      return;
    }

    router.push("/clients");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="name">Client name *</Label>
        <Input id="name" name="name" required defaultValue={client?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" name="industry" defaultValue={client?.industry ?? ""} />
        </div>
        <div>
          <Label htmlFor="audience">Target audience</Label>
          <Input id="audience" name="audience" defaultValue={client?.audience ?? ""} />
        </div>
      </div>
      <div>
        <Label htmlFor="tone">Tone</Label>
        <Input
          id="tone"
          name="tone"
          placeholder="Professional, approachable"
          defaultValue={client?.tone ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="readingLevel">Reading level</Label>
          <Input
            id="readingLevel"
            name="readingLevel"
            defaultValue={client?.readingLevel ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="pointOfView">Point of view</Label>
          <Input
            id="pointOfView"
            name="pointOfView"
            defaultValue={client?.pointOfView ?? ""}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="wordsToAvoid">Words to avoid (comma-separated)</Label>
        <Input
          id="wordsToAvoid"
          name="wordsToAvoid"
          defaultValue={client?.wordsToAvoid.join(", ") ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="requiredDisclaimers">Required disclaimers</Label>
        <Textarea
          id="requiredDisclaimers"
          name="requiredDisclaimers"
          rows={2}
          defaultValue={client?.requiredDisclaimers ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="seoNotes">SEO notes</Label>
        <Textarea id="seoNotes" name="seoNotes" rows={2} defaultValue={client?.seoNotes ?? ""} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : client ? "Update client" : "Create client"}
      </Button>
    </form>
  );
}
