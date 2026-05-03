import { useState, useEffect } from 'react';
import { getAllSubmissions, getProblemsBySlug } from '@/lib/db/repos';
import { computeProblemAreas, type ProblemArea } from '@/lib/scoring/problemAreas';
import { getSimilarProblems, type SimilarQuestion } from '@/lib/scoring/similarProblems';
import type { Submission, Difficulty } from '@/types';

const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: '#00b8a3',
  Medium: '#ffc01e',
  Hard: '#ef4743',
};

interface RevisitProblem {
  slug: string;
  title: string;
  difficulty: Difficulty;
  failCount: number;
}

function computeRevisit(failedSubmissions: Submission[]): RevisitProblem[] {
  const bySlug = new Map<string, RevisitProblem>();
  for (const sub of failedSubmissions) {
    const existing = bySlug.get(sub.problemSlug);
    if (!existing) {
      bySlug.set(sub.problemSlug, {
        slug: sub.problemSlug,
        title: sub.title,
        difficulty: sub.difficulty,
        failCount: 1,
      });
    } else {
      existing.failCount++;
    }
  }
  return Array.from(bySlug.values())
    .filter((p) => p.failCount >= 2)
    .sort((a, b) => b.failCount - a.failCount);
}

async function computePractice(
  failedSubmissions: Submission[],
  allSubmissions: Submission[],
): Promise<SimilarQuestion[]> {
  const slugs = [...new Set(failedSubmissions.map((s) => s.problemSlug))];
  const problems = await getProblemsBySlug(slugs);
  const seen = new Set<string>();
  const result: SimilarQuestion[] = [];
  for (const problem of problems) {
    const { unsolvedSimilar } = getSimilarProblems(problem, allSubmissions);
    for (const q of unsolvedSimilar) {
      if (!seen.has(q.titleSlug)) {
        seen.add(q.titleSlug);
        result.push(q);
      }
    }
  }
  return result;
}

function ProblemLink({ slug, title }: { slug: string; title: string }) {
  return (
    <a
      href={`https://leetcode.com/problems/${slug}/`}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-[#ffa116] transition-colors truncate"
    >
      {title}
    </a>
  );
}

const CAP = 10;

function SectionHeading({ children, count }: { children: string; count: number }) {
  if (count === 0) return null;
  return (
    <p className="text-[9px] uppercase tracking-widest text-white/25 font-semibold mb-1.5 px-4 mt-2">
      {children}
    </p>
  );
}

interface TopicRowProps {
  area: ProblemArea;
  allSubmissions: Submission[];
  isExpanded: boolean;
  onToggle: () => void;
}

function TopicRow({ area, allSubmissions, isExpanded, onToggle }: TopicRowProps) {
  const [practice, setPractice] = useState<SimilarQuestion[]>([]);
  const [revisit, setRevisit] = useState<RevisitProblem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [showMorePractice, setShowMorePractice] = useState(false);
  const [showMoreRevisit, setShowMoreRevisit] = useState(false);

  useEffect(() => {
    if (!isExpanded || loaded) return;
    void (async () => {
      const [p, r] = await Promise.all([
        computePractice(area.failedSubmissions, allSubmissions),
        Promise.resolve(computeRevisit(area.failedSubmissions)),
      ]);
      setPractice(p);
      setRevisit(r);
      setLoaded(true);
    })();
  }, [isExpanded, loaded, area, allSubmissions]);

  const visibleRevisit = showMoreRevisit ? revisit : revisit.slice(0, CAP);
  const visiblePractice = showMorePractice ? practice : practice.slice(0, CAP);

  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {/* Pain score badge */}
          <div className="w-8 h-8 rounded-lg bg-[#ffa116]/10 border border-[#ffa116]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[#ffa116]">{area.painScore}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#eff1f6] capitalize leading-tight">
              {area.topic.replace(/-/g, ' ')}
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">
              {area.uniqueProblemsFailed} problem{area.uniqueProblemsFailed !== 1 ? 's' : ''} failed
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-white/25 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable — CSS grid height animation */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden bg-[#1e1e1e]">
          <div className="pb-2 border-t border-white/[0.05]">
            {!loaded && (
              <p className="px-4 py-3 text-xs text-white/25 italic">Loading…</p>
            )}

            {loaded && revisit.length === 0 && practice.length === 0 && (
              <p className="px-4 py-3 text-xs text-white/25 italic">
                No similar problems found — try syncing more submissions.
              </p>
            )}

            {revisit.length > 0 && (
              <>
                <SectionHeading count={revisit.length}>Revisit these</SectionHeading>
                {visibleRevisit.map((p) => (
                  <div
                    key={p.slug}
                    className="flex items-center justify-between px-4 py-1.5 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="text-[10px] font-bold w-4 text-center shrink-0"
                        style={{ color: DIFF_COLOR[p.difficulty] }}
                      >
                        {p.difficulty[0]}
                      </span>
                      <span className="text-xs text-white/70 min-w-0">
                        <ProblemLink slug={p.slug} title={p.title} />
                      </span>
                    </div>
                    <span className="text-[10px] text-white/25 shrink-0 ml-2 tabular-nums">
                      {p.failCount}× failed
                    </span>
                  </div>
                ))}
                {revisit.length > CAP && (
                  <button
                    onClick={() => setShowMoreRevisit((v) => !v)}
                    className="px-4 py-1 text-[10px] text-[#ffa116]/60 hover:text-[#ffa116] transition-colors"
                  >
                    {showMoreRevisit ? 'Show less' : `+${revisit.length - CAP} more`}
                  </button>
                )}
              </>
            )}

            {practice.length > 0 && (
              <>
                <SectionHeading count={practice.length}>Practice these</SectionHeading>
                {visiblePractice.map((q) => {
                  const diff = (q.difficulty as Difficulty) in DIFF_COLOR
                    ? (q.difficulty as Difficulty)
                    : 'Medium';
                  return (
                    <div
                      key={q.titleSlug}
                      className="flex items-center gap-2 px-4 py-1.5 hover:bg-white/[0.04] transition-colors min-w-0"
                    >
                      <span
                        className="text-[10px] font-bold w-4 text-center shrink-0"
                        style={{ color: DIFF_COLOR[diff] }}
                      >
                        {diff[0]}
                      </span>
                      <span className="text-xs text-white/70 min-w-0">
                        <ProblemLink slug={q.titleSlug} title={q.title} />
                      </span>
                    </div>
                  );
                })}
                {practice.length > CAP && (
                  <button
                    onClick={() => setShowMorePractice((v) => !v)}
                    className="px-4 py-1 text-[10px] text-[#ffa116]/60 hover:text-[#ffa116] transition-colors"
                  >
                    {showMorePractice ? 'Show less' : `+${practice.length - CAP} more`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProblemAreasTab() {
  const [areas, setAreas] = useState<ProblemArea[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getAllSubmissions().then((subs) => {
      setAreas(computeProblemAreas(subs));
      setAllSubmissions(subs);
      setLoading(false);
    });
  }, []);

  const toggle = (topic: string) => {
    setExpanded((prev) => (prev === topic ? null : topic));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm">Loading…</div>
    );
  }

  if (areas.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm px-6 text-center">
        No failed submissions yet — keep grinding!
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <p className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-widest text-white/25 font-semibold">
        Topics sorted by pain score
      </p>
      {areas.map((area) => (
        <TopicRow
          key={area.topic}
          area={area}
          allSubmissions={allSubmissions}
          isExpanded={expanded === area.topic}
          onToggle={() => toggle(area.topic)}
        />
      ))}
    </div>
  );
}
