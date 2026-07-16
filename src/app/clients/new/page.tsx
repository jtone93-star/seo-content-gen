import { ClientForm } from "@/components/clients/client-form";

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New client profile</h1>
      <ClientForm />
    </div>
  );
}
