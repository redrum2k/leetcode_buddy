import Dexie, { type Table } from 'dexie';
import type { Submission, Problem, StudyPlan, ChatSession } from '@/types';

export class LeetcodeBuddyDB extends Dexie {
  submissions!: Table<Submission, string>;
  problems!: Table<Problem, string>;
  studyPlans!: Table<StudyPlan, string>;
  chatSessions!: Table<ChatSession, string>;

  constructor() {
    super('LeetcodeBuddy');
    this.version(1).stores({
      submissions: 'id, problemSlug, status, timestamp, difficulty',
      problems: 'slug, id, difficulty',
      studyPlans: 'slug, lastFetched',
    });
    this.version(2).stores({
      chatSessions: 'id, problemSlug, startedAt',
    });
  }
}

export const db = new LeetcodeBuddyDB();
