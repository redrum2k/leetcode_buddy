import Dexie, { type Table } from 'dexie';
import type { Submission, Problem, StudyPlan } from '@/types';

export class LeetcodeBuddyDB extends Dexie {
  submissions!: Table<Submission, string>;
  problems!: Table<Problem, string>;
  studyPlans!: Table<StudyPlan, string>;

  constructor() {
    super('LeetcodeBuddy');
    this.version(1).stores({
      submissions: 'id, problemSlug, status, timestamp, difficulty',
      problems: 'slug, id, difficulty',
      studyPlans: 'slug, lastFetched',
    });
  }
}

export const db = new LeetcodeBuddyDB();
