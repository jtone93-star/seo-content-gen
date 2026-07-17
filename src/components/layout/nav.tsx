import Link from "next/link";
import { isAuthEnabled } from "@/lib/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/projects/new", label: "New content" },
  { href: "/settings/models", label: "AI models" },
];

export function Nav() {
  const authEnabled = isAuthEnabled();

  return (
    <header className="border-b border-foreground/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Content Generator
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-foreground/70 hover:text-foreground transition"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/documentation"
            className="text-foreground/70 hover:text-foreground transition"
          >
            Documentation
          </Link>
          {authEnabled && (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="text-foreground/70 hover:text-foreground transition"
              >
                Log out
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
