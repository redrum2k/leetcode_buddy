import { useState, useEffect } from 'react';
import { getAllSubmissions, getStudyPlan } from '@/lib/db/repos';
import { computeProblemAreas, type ProblemArea } from '@/lib/scoring/problemAreas';
import { PLAN_PROBLEMS } from '@/lib/studyPlans/data';
import type { Submission, StudyPlan } from '@/types';

export interface Stats {
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  problemAreas: ProblemArea[];
  activePlan: StudyPlan | null;
  planProgress: { solved: number; total: number } | null;
}

function countUniqueSolved(
  submissions: Submission[],
  difficulty: Submission['difficulty'],
): number {
  return new Set(
    submissions
      .filter((s) => s.status === 'Accepted' && s.difficulty === difficulty)
      .map((s) => s.problemSlug),
  ).size;
}

export function useStats(activePlanSlug: string | null, refreshKey = 0) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const submissions = await getAllSubmissions();
      let plan: StudyPlan | null = null;
      if (activePlanSlug) {
        const hardcoded = PLAN_PROBLEMS[activePlanSlug];
        if (hardcoded) {
          plan = {
            slug: activePlanSlug,
            name: hardcoded.name,
            problemSlugs: hardcoded.slugs as string[],
            lastFetched: 0,
          };
        } else {
          plan = (await getStudyPlan(activePlanSlug)) ?? null;
        }
      }
      if (cancelled) return;

      const solvedSlugs = new Set(
        submissions.filter((s) => s.status === 'Accepted').map((s) => s.problemSlug),
      );

      setStats({
        totalSubmissions: submissions.length,
        acceptedSubmissions: submissions.filter((s) => s.status === 'Accepted').length,
        acceptanceRate:
          submissions.length > 0
            ? Math.round(
                (submissions.filter((s) => s.status === 'Accepted').length /
                  submissions.length) *
                  100,
              )
            : 0,
        easySolved: countUniqueSolved(submissions, 'Easy'),
        mediumSolved: countUniqueSolved(submissions, 'Medium'),
        hardSolved: countUniqueSolved(submissions, 'Hard'),
        problemAreas: computeProblemAreas(submissions),
        activePlan: plan,
        planProgress: plan
          ? {
              solved: plan.problemSlugs.filter((s) => solvedSlugs.has(s)).length,
              total: plan.problemSlugs.length,
            }
          : null,
      });
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [activePlanSlug, refreshKey]);

  return { stats, loading };
}
