import { DocLink, MarkdownDoc } from "@/components/docs/markdown-doc";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Documentation",
  description: "How to use SEO Turtle Tool",
};

export default function DocumentationPage() {
  return (
    <MarkdownDoc
      relativePath="docs/HOW_TO_USE.md"
      sourceLabel="docs/HOW_TO_USE.md"
      eyebrow={
        <>
          Operator guide ·{" "}
          <DocLink href="/">Dashboard</DocLink>
          {" · "}
          <DocLink href="/stories">User stories</DocLink>
        </>
      }
    />
  );
}
