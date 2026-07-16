import { Card } from "@/components/ui/card";

export function DbUnavailable() {
  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <h1 className="text-lg font-semibold">Database not reachable</h1>
      <p className="mt-2 text-sm text-foreground/80">
        PostgreSQL is not running on port 5432. The app cannot load data until the database is
        started.
      </p>
      <p className="mt-4 text-sm font-medium">Fix (PowerShell, from project folder):</p>
      <pre className="mt-2 rounded-lg bg-foreground/5 p-3 text-xs overflow-x-auto">
        npm run db:start
      </pre>
      <p className="mt-3 text-xs text-foreground/60">
        After a reboot you need to start Postgres again (or install it as a Windows service). Then
        refresh this page.
      </p>
    </Card>
  );
}
