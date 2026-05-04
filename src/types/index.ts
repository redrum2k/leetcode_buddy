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

export type ThemePreference = 'auto' | 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

export interface UserPrefs {
  selectedModuleSlug: string | null;
  username: string | null;
  lastBackfill: number | null;
  backfillInProgress: boolean;
  theme: ThemePreference;
  highContrast: boolean;
  fontSize: FontSize;
}

// ── AI Chat ───────────────────────────────────────────────────────────────────

export interface ProblemContext {
  slug: string;
  title: string;
  difficulty: Difficulty;
  statement: string;
  topicTags: string[];
  currentCode?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  problemSlug: string | null;
  problemContext: ProblemContext | null;
  startedAt: number;
  messages: ChatMessage[];
}
