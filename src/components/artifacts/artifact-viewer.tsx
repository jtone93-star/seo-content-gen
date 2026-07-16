import type { PipelineStep } from "@/generated/prisma/client";
import type {
  BriefOutput,
  DraftOutput,
  EditOutput,
  FinalOutput,
  OutlineOutput,
  QaOutput,
  ResearchOutput,
  SeoOutput,
  TechnicalSeoOutput,
} from "@/lib/pipeline/types";
import {
  normalizeBrief,
  normalizeFinal,
  normalizeOutline,
  normalizeQa,
  normalizeResearch,
  normalizeSeo,
  normalizeTechnicalSeo,
} from "./normalize-legacy";

export function ArtifactViewer({
  step,
  output,
}: {
  step: PipelineStep;
  output: unknown;
}) {
  if (!output) return <p className="text-sm text-foreground/60">No output yet.</p>;

  switch (step) {
    case "BRIEF":
      return <BriefView output={normalizeBrief(output)} />;
    case "RESEARCH":
      return <ResearchView output={normalizeResearch(output)} />;
    case "OUTLINE":
      return <OutlineView output={normalizeOutline(output)} />;
    case "DRAFT":
    case "EDIT":
      return <BodyView output={output as DraftOutput | EditOutput} />;
    case "QA":
      return <QaView output={normalizeQa(output)} />;
    case "SEO":
      return <SeoView output={normalizeSeo(output)} />;
    case "TECHNICAL_SEO":
      return <TechnicalSeoView output={normalizeTechnicalSeo(output)} />;
    case "FINAL":
      return <FinalView output={normalizeFinal(output)} />;
    default:
      return <pre className="text-xs overflow-auto">{JSON.stringify(output, null, 2)}</pre>;
  }
}

function BriefView({ output }: { output: BriefOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <KeyValue label="Search intent" value={output.searchIntent} />
      <KeyValue label="Primary keyword" value={output.primaryKeyword} />
      <div>
        <h4 className="font-medium mb-1">Secondary keywords</h4>
        <ul className="list-disc pl-5 text-foreground/80">
          {output.secondaryKeywords.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </div>
      <KeyValue label="Target audience" value={output.targetAudience} />
      <KeyValue label="Content goal" value={output.contentGoal} />
      <KeyValue label="Recommended format" value={output.recommendedFormat} />
      {output.wordCountTarget && (
        <KeyValue label="Word count target" value={String(output.wordCountTarget)} />
      )}
      <KeyValue label="Differentiation" value={output.differentiation} />
      <div>
        <h4 className="font-medium mb-1">Must-cover topics</h4>
        <ul className="list-disc pl-5 text-foreground/80">
          {output.mustCoverTopics.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      <KeyValue label="CTA" value={output.cta} />
      <div>
        <h4 className="font-medium mb-1">Success metrics</h4>
        <ul className="list-disc pl-5 text-foreground/80">
          {output.successMetrics.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
      {output.primaryEntities.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">Primary entities</h4>
          <ul className="list-disc pl-5 text-foreground/80">
            {output.primaryEntities.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {output.aiVisibilityGoals.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">AI visibility / crawlability goals</h4>
          <ul className="list-disc pl-5 text-foreground/80">
            {output.aiVisibilityGoals.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResearchView({ output }: { output: ResearchOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <section>
        <h4 className="font-medium mb-1">Summary</h4>
        <p className="text-foreground/80">{output.summary}</p>
      </section>
      <section>
        <h4 className="font-medium mb-1">SERP snapshot</h4>
        <ul className="space-y-2">
          {output.serpSnapshot.map((r, i) => (
            <li key={i} className="rounded-lg border border-foreground/10 p-3">
              <p className="font-medium">{r.title}</p>
              <p className="font-mono text-xs break-all text-foreground/50 mt-1">{r.url}</p>
              <p className="text-foreground/70 mt-1">
                {r.format} · ~{r.estimatedWords} words · {r.angle}
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="font-medium mb-1">People also ask</h4>
        <ul className="list-disc pl-5 text-foreground/80">
          {output.peopleAlsoAsk.map((q, i) => (
            <li key={i}>{q}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="font-medium mb-1">Competitor angles</h4>
        <ul className="list-disc pl-5 text-foreground/80">
          {output.competitorAngles.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4 className="font-medium mb-1">Content gaps</h4>
        <ul className="list-disc pl-5 text-amber-700 dark:text-amber-400">
          {output.contentGaps.map((g, i) => (
            <li key={i}>{g}</li>
          ))}
        </ul>
      </section>
      {(output.recommendedWordRange.min > 0 || output.recommendedWordRange.max > 0) && (
        <p className="text-foreground/60">
          Recommended length: {output.recommendedWordRange.min}–{output.recommendedWordRange.max}{" "}
          words
        </p>
      )}
      <section>
        <h4 className="font-medium mb-1">Sources</h4>
        <ul className="space-y-2">
          {output.sources.map((s, i) => (
            <li key={i} className="rounded-lg border border-foreground/10 p-3">
              <p className="font-mono text-xs break-all">{s.url}</p>
              <p className="mt-1 text-foreground/70">{s.notes}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function OutlineView({ output }: { output: OutlineOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <KeyValue label="Title" value={output.title} />
      <KeyValue label="Angle" value={output.angle} />
      <div className="space-y-3">
        {output.sections.map((s, i) => (
          <div key={i} className="border-l-2 border-foreground/20 pl-3">
            <p className="font-medium">
              {s.level.toUpperCase()}: {s.heading}
            </p>
            <ul className="mt-1 list-disc pl-4 text-foreground/70">
              {s.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {output.faqSection.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">FAQ section</h4>
          <ul className="space-y-2">
            {output.faqSection.map((f, i) => (
              <li key={i} className="rounded-lg border border-foreground/10 p-3">
                <p className="font-medium">{f.question}</p>
                <p className="text-foreground/70 mt-1">{f.answerOutline}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {output.internalLinks.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Internal link plan</h4>
          <ul className="space-y-2">
            {output.internalLinks.map((link, i) => (
              <li key={i} className="rounded-lg border border-foreground/10 p-3">
                <p>
                  <span className="font-medium">{link.anchorText}</span> →{" "}
                  <span className="font-mono text-xs break-all">{link.targetUrl}</span>
                </p>
                <p className="text-foreground/60 mt-1">
                  Placement: {link.placement} — {link.rationale}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <KeyValue label="CTA" value={output.cta} />
      {output.keyTakeaways.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Key takeaways</h4>
          <ul className="list-disc pl-5 text-foreground/80">
            {output.keyTakeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </section>
      )}
      {output.formattingNotes.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Formatting notes (AI visibility)</h4>
          <ul className="list-disc pl-5 text-foreground/70 text-xs">
            {output.formattingNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function BodyView({ output }: { output: DraftOutput | EditOutput }) {
  return (
    <div className="space-y-3 text-sm">
      {"structureNotes" in output && output.structureNotes && output.structureNotes.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Structure (AI visibility)</h4>
          <ul className="list-disc pl-5 text-foreground/70">
            {output.structureNotes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
      {"changesSummary" in output && output.changesSummary && (
        <section>
          <h4 className="font-medium mb-1">Changes</h4>
          <ul className="list-disc pl-5 text-foreground/70">
            {output.changesSummary.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
      {"wordCount" in output && (
        <p className="text-foreground/60">~{output.wordCount} words</p>
      )}
      <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-4 text-xs leading-relaxed">
        {output.body}
      </pre>
    </div>
  );
}

function QaView({ output }: { output: QaOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <p className={output.passed ? "text-green-700 dark:text-green-400" : "text-amber-700"}>
        {output.passed ? "All checks passed" : "Some checks need attention"}
      </p>
      <KeyValue label="Readability" value={output.readabilityScore} />
      <section>
        <h4 className="font-medium mb-1">Checklist</h4>
        <ul className="space-y-1">
          {output.checklist.map((c, i) => (
            <li key={i} className={c.passed ? "text-foreground/80" : "text-amber-700"}>
              {c.passed ? "✓" : "○"} {c.item}
            </li>
          ))}
        </ul>
      </section>
      {output.claimsToVerify.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Claims to verify</h4>
          <ul className="space-y-1 text-foreground/80">
            {output.claimsToVerify.map((c, i) => (
              <li key={i}>
                [{c.status}] {c.claim}
              </li>
            ))}
          </ul>
        </section>
      )}
      {output.bannedWordsFound.length > 0 && (
        <p className="text-red-600">Banned words found: {output.bannedWordsFound.join(", ")}</p>
      )}
      <KeyValue label="Notes" value={output.notes} />
    </div>
  );
}

function MetaBlock({
  metaTitle,
  metaDescription,
  headers,
}: {
  metaTitle: string;
  metaDescription: string;
  headers: { level: string; text: string }[];
}) {
  return (
    <div className="space-y-3 rounded-lg border border-foreground/10 p-4 bg-foreground/[0.03]">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">Meta title</p>
        <p className="text-sm">{metaTitle}</p>
        <p className="text-xs text-foreground/50 mt-0.5">{metaTitle.length} chars</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/50">
          Meta description
        </p>
        <p className="text-sm">{metaDescription}</p>
        <p className="text-xs text-foreground/50 mt-0.5">{metaDescription.length} chars</p>
      </div>
      {headers.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-foreground/50 mb-2">
            Headers
          </p>
          <ul className="space-y-1">
            {headers.map((h, i) => (
              <li key={i} className="font-mono text-xs">
                <span className="text-foreground/50">{h.level}</span> {h.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SeoView({ output }: { output: SeoOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <MetaBlock
        metaTitle={output.metaTitle}
        metaDescription={output.metaDescription}
        headers={output.headers}
      />
      {output.keywordMap.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Keyword map</h4>
          <ul className="space-y-2">
            {output.keywordMap.map((k, i) => (
              <li key={i} className="text-foreground/80">
                <span className="font-medium">{k.keyword}</span> — {k.count}× (
                {k.placement.join(", ")})
              </li>
            ))}
          </ul>
        </section>
      )}
      {output.answerBlocks.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Answer blocks (AI Overview / snippets)</h4>
          <ul className="space-y-2">
            {output.answerBlocks.map((a, i) => (
              <li key={i} className="rounded-lg border border-foreground/10 p-3">
                <p className="font-medium">{a.question}</p>
                <p className="text-foreground/70 mt-1">{a.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {output.aiVisibilityNotes.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">AI visibility notes</h4>
          <ul className="list-disc pl-5 text-foreground/70 text-xs">
            {output.aiVisibilityNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      )}
      <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-4 text-xs leading-relaxed">
        {output.body}
      </pre>
    </div>
  );
}

function TechnicalSeoView({ output }: { output: TechnicalSeoOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <KeyValue label="URL slug" value={output.slug} />
      <MetaBlock
        metaTitle={output.metaTitle}
        metaDescription={output.metaDescription}
        headers={[]}
      />
      <KeyValue label="OG title" value={output.ogTitle} />
      <KeyValue label="OG description" value={output.ogDescription} />
      <KeyValue label="Schema type" value={output.schemaType} />
      <KeyValue label="Canonical" value={output.canonicalUrl ?? "—"} />
      <KeyValue label="Index" value={output.indexRecommendation} />
      {output.speakableSelectors.length > 0 && (
        <KeyValue
          label="Speakable selectors"
          value={output.speakableSelectors.join(", ")}
        />
      )}
      {output.agentSummary && (
        <section>
          <h4 className="font-medium mb-1">Agent summary</h4>
          <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-4 text-xs">
            {output.agentSummary}
          </pre>
        </section>
      )}
      <section>
        <h4 className="font-medium mb-1">Schema (JSON-LD)</h4>
        <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-4 text-xs overflow-auto max-h-48">
          {output.schemaJsonLd}
        </pre>
      </section>
      <section>
        <h4 className="font-medium mb-1">Publishing checklist</h4>
        <ul className="space-y-1">
          {output.publishingChecklist.map((c, i) => (
            <li key={i}>{c.passed ? "✓" : "○"} {c.item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FinalView({ output }: { output: FinalOutput }) {
  return (
    <div className="space-y-4 text-sm">
      <KeyValue label="Slug" value={output.slug} />
      <MetaBlock
        metaTitle={output.metaTitle}
        metaDescription={output.metaDescription}
        headers={output.headers}
      />
      <KeyValue label="Schema" value={output.schemaType} />
      {output.agentSummary && (
        <section>
          <h4 className="font-medium mb-1">Agent summary</h4>
          <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-4 text-xs">
            {output.agentSummary}
          </pre>
        </section>
      )}
      {output.answerBlocks.length > 0 && (
        <section>
          <h4 className="font-medium mb-1">Answer blocks</h4>
          <ul className="space-y-2">
            {output.answerBlocks.map((a, i) => (
              <li key={i} className="rounded-lg border border-foreground/10 p-3">
                <p className="font-medium">{a.question}</p>
                <p className="text-foreground/70 mt-1">{a.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h4 className="font-medium mb-2">Export preview</h4>
        <pre className="whitespace-pre-wrap rounded-lg bg-foreground/5 p-4 text-xs leading-relaxed max-h-96 overflow-auto">
          {output.exportMarkdown}
        </pre>
      </section>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium">{label}:</span>{" "}
      <span className="text-foreground/80">{value}</span>
    </p>
  );
}
