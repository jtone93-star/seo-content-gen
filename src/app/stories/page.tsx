import { DocLink, MarkdownDoc } from "@/components/docs/markdown-doc";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User stories",
  description: "Internal product user stories and acceptance criteria",
  robots: { index: false, follow: false },
};

export default function StoriesPage() {
  return (
    <MarkdownDoc
      relativePath="docs/USER_STORIES.md"
      sourceLabel="docs/USER_STORIES.md"
      eyebrow={
        <>
          Internal acceptance criteria ·{" "}
          <DocLink href="/documentation">Documentation</DocLink>
          {" · "}
          <DocLink href="/">Dashboard</DocLink>
        </>
      }
    />
  );
}
