import { db } from './schema';
import type { Submission, Problem, StudyPlan } from '@/types';

// ── Submissions ───────────────────────────────────────────────────────────────

export async function upsertSubmission(sub: Submission): Promise<void> {
  await db.submissions.put(sub);
}

export async function upsertSubmissions(subs: Submission[]): Promise<void> {
  await db.submissions.bulkPut(subs);
}

export async function getAllSubmissions(): Promise<Submission[]> {
  return db.submissions.toArray();
}

export async function getSubmissionsByProblem(slug: string): Promise<Submission[]> {
  return db.submissions.where('problemSlug').equals(slug).toArray();
}

export async function getSubmissionCount(): Promise<number> {
  return db.submissions.count();
}

// ── Problems ──────────────────────────────────────────────────────────────────

export async function upsertProblem(problem: Problem): Promise<void> {
  await db.problems.put(problem);
}

export async function upsertProblems(problems: Problem[]): Promise<void> {
  await db.problems.bulkPut(problems);
}

export async function getProblemBySlug(slug: string): Promise<Problem | undefined> {
  return db.problems.get(slug);
}

export async function getProblemsBySlug(slugs: string[]): Promise<Problem[]> {
  return db.problems.where('slug').anyOf(slugs).toArray();
}

export async function getAllProblems(): Promise<Problem[]> {
  return db.problems.toArray();
}

// ── Study Plans ───────────────────────────────────────────────────────────────

export async function upsertStudyPlan(plan: StudyPlan): Promise<void> {
  await db.studyPlans.put(plan);
}

export async function getStudyPlan(slug: string): Promise<StudyPlan | undefined> {
  return db.studyPlans.get(slug);
}

export async function getAllStudyPlans(): Promise<StudyPlan[]> {
  return db.studyPlans.toArray();
}
