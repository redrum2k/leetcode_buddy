import { describe, it, expect } from 'vitest';
import { getSimilarProblems } from '../scoring/similarProblems';
import type { Problem, Submission } from '@/types';

const makeProblem = (overrides: Partial<Problem>): Problem => ({
  slug: 'test-problem',
  id: 1,
  title: 'Test Problem',
  difficulty: 'Medium',
  topicTags: ['array'],
  similarQuestionsRaw: '[]',
  lastFetched: Date.now(),
  ...overrides,
});

const makeSub = (overrides: Partial<Submission>): Submission => ({
  id: 'sub-1',
  problemSlug: 'test-problem',
  problemId: 1,
  title: 'Test Problem',
  difficulty: 'Medium',
  topicTags: ['array'],
  status: 'Accepted',
  language: 'typescript',
  timestamp: Date.now(),
  ...overrides,
});

describe('getSimilarProblems', () => {
  it('returns empty lists when no similar questions', () => {
    const result = getSimilarProblems(makeProblem({ similarQuestionsRaw: '[]' }), []);
    expect(result.unsolvedSimilar).toEqual([]);
    expect(result.previouslyFailedSimilar).toEqual([]);
  });

  it('classifies unsolved similar problems correctly', () => {
    const raw = JSON.stringify([{ titleSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' }]);
    const result = getSimilarProblems(makeProblem({ similarQuestionsRaw: raw }), []);
    expect(result.unsolvedSimilar).toHaveLength(1);
    expect(result.unsolvedSimilar[0].titleSlug).toBe('two-sum');
    expect(result.previouslyFailedSimilar).toHaveLength(0);
  });

  it('classifies previously-failed similar problems correctly', () => {
    const raw = JSON.stringify([{ titleSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' }]);
    const subs = [makeSub({ problemSlug: 'two-sum', status: 'Wrong Answer' })];
    const result = getSimilarProblems(makeProblem({ similarQuestionsRaw: raw }), subs);
    expect(result.previouslyFailedSimilar).toHaveLength(1);
    expect(result.previouslyFailedSimilar[0].titleSlug).toBe('two-sum');
    expect(result.unsolvedSimilar).toHaveLength(0);
  });

  it('excludes accepted similar problems from both lists', () => {
    const raw = JSON.stringify([{ titleSlug: 'two-sum', title: 'Two Sum', difficulty: 'Easy' }]);
    const subs = [makeSub({ problemSlug: 'two-sum', status: 'Accepted' })];
    const result = getSimilarProblems(makeProblem({ similarQuestionsRaw: raw }), subs);
    expect(result.unsolvedSimilar).toHaveLength(0);
    expect(result.previouslyFailedSimilar).toHaveLength(0);
  });

  it('handles malformed similarQuestionsRaw gracefully', () => {
    const result = getSimilarProblems(makeProblem({ similarQuestionsRaw: 'not-json' }), []);
    expect(result.unsolvedSimilar).toEqual([]);
    expect(result.previouslyFailedSimilar).toEqual([]);
  });
});
