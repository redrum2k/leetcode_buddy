import type { Problem, Submission } from '@/types';

export interface SimilarQuestion {
  titleSlug: string;
  title: string;
  difficulty: string;
}

export interface SimilarProblemsResult {
  unsolvedSimilar: SimilarQuestion[];
  previouslyFailedSimilar: SimilarQuestion[];
}

export function getSimilarProblems(
  problem: Problem,
  userSubmissions: Submission[],
): SimilarProblemsResult {
  let similar: SimilarQuestion[];
  try {
    similar = JSON.parse(problem.similarQuestionsRaw) as SimilarQuestion[];
  } catch {
    return { unsolvedSimilar: [], previouslyFailedSimilar: [] };
  }

  const acceptedSlugs = new Set(
    userSubmissions.filter((s) => s.status === 'Accepted').map((s) => s.problemSlug),
  );
  // A slug is "previously failed" only if it has never been accepted
  const failedSlugs = new Set(
    userSubmissions
      .filter((s) => s.status !== 'Accepted' && !acceptedSlugs.has(s.problemSlug))
      .map((s) => s.problemSlug),
  );

  const unsolvedSimilar: SimilarQuestion[] = [];
  const previouslyFailedSimilar: SimilarQuestion[] = [];

  for (const q of similar) {
    if (acceptedSlugs.has(q.titleSlug)) continue;
    if (failedSlugs.has(q.titleSlug)) {
      previouslyFailedSimilar.push(q);
    } else {
      unsolvedSimilar.push(q);
    }
  }

  return { unsolvedSimilar, previouslyFailedSimilar };
}
