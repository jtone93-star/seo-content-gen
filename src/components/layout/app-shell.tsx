"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Cpu, LayoutDashboard, LogOut, Users } from "lucide-react";
import { ModelSwitcher } from "@/components/layout/model-switcher";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/settings/models", label: "AI models", icon: Cpu },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  authEnabled,
}: {
  children: React.ReactNode;
  authEnabled: boolean;
}) {
  const pathname = usePathname();
  if (pathname === "/login") {
    return <div className="min-h-full">{children}</div>;
  }

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-line bg-[#0c0f16] px-3 py-5">
        <Link href="/" className="mb-8 flex items-center gap-2.5 px-2">
          <Image
            src="/seo-turtle-logo.png"
            alt="SEO Turtle Tool"
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-gold/30"
            priority
          />
          <span className="text-base font-semibold tracking-tight leading-tight">
            SEO Turtle Tool
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {links.map((l) => {
            const Icon = l.icon;
            const active = isActive(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                  active
                    ? "bg-gold/10 text-gold"
                    : "text-muted hover:bg-white/[0.04] hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/documentation"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
              pathname.startsWith("/documentation") || pathname.startsWith("/stories")
                ? "bg-gold/10 text-gold"
                : "text-muted hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            Documentation
          </Link>
        </nav>

        <ModelSwitcher />

        {authEnabled && (
          <form action="/api/auth/logout" method="post" className="px-1">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-white/[0.04] hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </form>
        )}
      </aside>
      <main className="min-w-0 flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
