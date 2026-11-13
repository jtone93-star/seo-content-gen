export function projectStatusClass(status: string): string {
  switch (status) {
    case "COMPLETED":
      return "bg-gold/15 text-gold";
    case "FAILED":
      return "bg-red-500/15 text-red-300";
    case "PAUSED_FOR_REVIEW":
      return "bg-gold/15 text-gold";
    case "RUNNING":
      return "bg-gold/10 text-gold";
    case "QUEUED":
      return "bg-white/[0.08] text-muted";
    default:
      return "bg-white/[0.06] text-muted";
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}
