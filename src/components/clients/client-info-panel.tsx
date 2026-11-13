"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientProfile } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientInfoButton({ client }: { client: ClientProfile }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        Client Info
      </Button>
      {open && <ClientInfoCard client={client} onClose={() => setOpen(false)} />}
    </>
  );
}

function ClientInfoCard({ client, onClose }: { client: ClientProfile; onClose: () => void }) {
  const router = useRouter();
  const [contactName, setContactName] = useState(client.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(client.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(client.contactPhone ?? "");
  const [website, setWebsite] = useState(client.website ?? "");
  const [crmNotes, setCrmNotes] = useState(client.crmNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setContactName(client.contactName ?? "");
    setContactEmail(client.contactEmail ?? "");
    setContactPhone(client.contactPhone ?? "");
    setWebsite(client.website ?? "");
    setCrmNotes(client.crmNotes ?? "");
  }, [client]);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactName,
        contactEmail,
        contactPhone,
        website,
        crmNotes,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not save client info.");
      return;
    }
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-line bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted">Client info</p>
            <h2 className="text-xl font-semibold tracking-tight mt-1">{client.name}</h2>
            <p className="text-sm text-foreground/65 mt-1">Contacts and notes for this account.</p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <Label htmlFor="contact-name">Contact name</Label>
            <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contact-email">Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="contact-phone">Phone</Label>
            <Input id="contact-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="contact-website">Website</Label>
            <Input id="contact-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="crm-notes">Notes</Label>
            <Textarea
              id="crm-notes"
              rows={8}
              value={crmNotes}
              placeholder="Decision maker, call preferences, contract notes, anything you need next to the account."
              onChange={(e) => setCrmNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
        <div className="border-t border-line px-5 py-4">
          <Button type="button" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
