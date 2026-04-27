import { describe, it, expect } from 'vitest';
import { computeProblemAreas } from '../scoring/problemAreas';
import type { Submission } from '@/types';

const make = (overrides: Partial<Submission>): Submission => ({
  id: 'x',
  problemSlug: 'test-problem',
  problemId: 1,
  title: 'Test Problem',
  difficulty: 'Medium',
  topicTags: ['array'],
  status: 'Wrong Answer',
  language: 'typescript',
  timestamp: Date.now(),
  ...overrides,
});

describe('computeProblemAreas', () => {
  it('returns empty array when no submissions', () => {
    expect(computeProblemAreas([])).toEqual([]);
  });

  it('ignores accepted submissions', () => {
    expect(computeProblemAreas([make({ status: 'Accepted' })])).toEqual([]);
  });

  it('assigns Easy failure +3 points per topic tag', () => {
    const result = computeProblemAreas([
      make({ difficulty: 'Easy', topicTags: ['array'], status: 'Wrong Answer' }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe('array');
    expect(result[0].painScore).toBe(3);
  });

  it('assigns Medium failure +2 points per topic tag', () => {
    const result = computeProblemAreas([
      make({ difficulty: 'Medium', topicTags: ['dp'], status: 'Time Limit Exceeded' }),
    ]);
    expect(result[0].painScore).toBe(2);
  });

  it('assigns Hard failure +1 point per topic tag', () => {
    const result = computeProblemAreas([
      make({ difficulty: 'Hard', topicTags: ['graph'], status: 'Runtime Error' }),
    ]);
    expect(result[0].painScore).toBe(1);
  });

  it('a submission with multiple tags contributes to each tag', () => {
    const result = computeProblemAreas([
      make({ difficulty: 'Easy', topicTags: ['array', 'hash-table'], status: 'Wrong Answer' }),
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.topic).sort()).toEqual(['array', 'hash-table'].sort());
    expect(result.every((r) => r.painScore === 3)).toBe(true);
  });

  it('accumulates pain score across multiple failures on same topic', () => {
    const result = computeProblemAreas([
      make({ id: '1', difficulty: 'Easy', topicTags: ['array'], status: 'Wrong Answer' }),
      make({ id: '2', difficulty: 'Easy', topicTags: ['array'], status: 'Wrong Answer' }),
    ]);
    expect(result[0].painScore).toBe(6);
  });

  it('counts unique problems failed, not total submissions', () => {
    const result = computeProblemAreas([
      make({ id: '1', problemSlug: 'p1', topicTags: ['dp'], status: 'Wrong Answer' }),
      make({ id: '2', problemSlug: 'p1', topicTags: ['dp'], status: 'Wrong Answer' }),
      make({ id: '3', problemSlug: 'p2', topicTags: ['dp'], status: 'Wrong Answer' }),
    ]);
    expect(result[0].uniqueProblemsFailed).toBe(2);
    expect(result[0].failedSubmissions).toHaveLength(3);
  });

  it('sorts by painScore descending', () => {
    const result = computeProblemAreas([
      make({ id: '1', difficulty: 'Hard', topicTags: ['graph'], status: 'Wrong Answer' }),
      make({ id: '2', difficulty: 'Easy', topicTags: ['array'], status: 'Wrong Answer' }),
      make({ id: '3', difficulty: 'Medium', topicTags: ['dp'], status: 'Wrong Answer' }),
    ]);
    expect(result.map((r) => r.topic)).toEqual(['array', 'dp', 'graph']);
  });
});
