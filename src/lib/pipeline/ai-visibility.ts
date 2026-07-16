/**
 * Formatting conventions for SEO + generative AI visibility (GEO)
 * and agent/crawler-friendly pages. Used by mock executors today;
 * real model prompts should enforce the same rules later.
 */

export const AI_VISIBILITY_RULES = [
  "Lead each H2 section with a direct 1–2 sentence answer before elaboration",
  "Include a Key takeaways / TL;DR block near the top",
  "Use question-style H2/H3 for FAQ so FAQPage schema maps cleanly",
  "Name primary entities (brand, product, topic) explicitly — avoid vague pronouns",
  "Prefer short paragraphs, numbered steps, and bullet lists over walls of text",
  "Cite or attribute claims so AI systems can verify provenance",
  "Keep one clear H1; nest H2 → H3 without skipping levels",
  "End with a concrete next step / CTA for both humans and agents",
] as const;

export function slugifyEntity(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
