import { readFile } from "fs/promises";
import Link from "next/link";
import path from "path";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";

const proseClass = [
  "prose prose-neutral dark:prose-invert max-w-none",
  "prose-headings:scroll-mt-8",
  "prose-h1:text-2xl prose-h1:font-semibold prose-h1:tracking-tight",
  "prose-h2:text-lg prose-h2:mt-10 prose-h2:border-b prose-h2:border-foreground/10 prose-h2:pb-2",
  "prose-h3:text-base prose-h3:mt-6",
  "prose-p:text-foreground/80 prose-li:text-foreground/80",
  "prose-strong:text-foreground prose-code:text-sm prose-code:bg-foreground/5 prose-code:px-1 prose-code:rounded",
  "prose-pre:bg-foreground/5 prose-pre:text-xs",
  "prose-table:text-sm",
].join(" ");

export async function MarkdownDoc({
  relativePath,
  eyebrow,
  sourceLabel,
}: {
  relativePath: string;
  eyebrow?: ReactNode;
  sourceLabel: string;
}) {
  const filePath = path.join(process.cwd(), relativePath);
  const markdown = await readFile(filePath, "utf-8");

  return (
    <div className="max-w-3xl">
      {eyebrow && <div className="text-xs text-foreground/50 mb-6">{eyebrow}</div>}
      <article className={proseClass}>
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </article>
      <p className="mt-12 text-xs text-foreground/40">
        Source: {sourceLabel} · Edit that file to update this page.
      </p>
    </div>
  );
}

export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="underline hover:text-foreground">
      {children}
    </Link>
  );
}
