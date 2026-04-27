export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type SubmissionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Runtime Error'
  | 'Compile Error'
  | 'Memory Limit Exceeded'
  | 'Other';

export interface Submission {
  id: string;
  problemSlug: string;
  problemId: number;
  title: string;
  difficulty: Difficulty;
  topicTags: string[];
  status: SubmissionStatus;
  language: string;
  timestamp: number;
  runtime?: string;
  memory?: string;
}

export interface Problem {
  slug: string;
  id: number;
  title: string;
  difficulty: Difficulty;
  topicTags: string[];
  similarQuestionsRaw: string;
  lastFetched: number;
}

export interface StudyPlan {
  slug: string;
  name: string;
  problemSlugs: string[];
  lastFetched: number;
}

export interface UserPrefs {
  selectedModuleSlug: string | null;
  username: string | null;
  lastBackfill: number | null;
  backfillInProgress: boolean;
}
