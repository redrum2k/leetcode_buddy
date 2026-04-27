import type { Submission, Difficulty } from '@/types';

export interface ProblemArea {
  topic: string;
  painScore: number;
  failedSubmissions: Submission[];
  uniqueProblemsFailed: number;
}

const PAIN_WEIGHTS: Record<Difficulty, number> = {
  Easy: 3,
  Medium: 2,
  Hard: 1,
};

export function computeProblemAreas(submissions: Submission[]): ProblemArea[] {
  const failed = submissions.filter((s) => s.status !== 'Accepted');

  const byTopic = new Map<
    string,
    { painScore: number; submissions: Submission[]; problemSlugs: Set<string> }
  >();

  for (const sub of failed) {
    const weight = PAIN_WEIGHTS[sub.difficulty] ?? 1;
    for (const tag of sub.topicTags) {
      if (!byTopic.has(tag)) {
        byTopic.set(tag, { painScore: 0, submissions: [], problemSlugs: new Set() });
      }
      const entry = byTopic.get(tag)!;
      entry.painScore += weight;
      entry.submissions.push(sub);
      entry.problemSlugs.add(sub.problemSlug);
    }
  }

  return Array.from(byTopic.entries())
    .map(([topic, data]) => ({
      topic,
      painScore: data.painScore,
      failedSubmissions: data.submissions,
      uniqueProblemsFailed: data.problemSlugs.size,
    }))
    .sort((a, b) => b.painScore - a.painScore);
}
