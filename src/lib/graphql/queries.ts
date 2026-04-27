import { gqlFetch } from './client';
import type { Submission, Problem, StudyPlan, SubmissionStatus, Difficulty } from '@/types';

// ── getUserProfile ────────────────────────────────────────────────────────────
// Query: globalData
// Response: { userStatus: { username: string, isSignedIn: boolean } }

const GET_USER_PROFILE = `
  query globalData {
    userStatus {
      username
      isSignedIn
    }
  }
`;

interface UserProfileData {
  userStatus: { username: string; isSignedIn: boolean };
}

export async function getUserProfile(): Promise<{ username: string }> {
  const data = await gqlFetch<UserProfileData>(GET_USER_PROFILE);
  if (!data.userStatus.isSignedIn) throw new Error('Not signed in to LeetCode');
  return { username: data.userStatus.username };
}

// ── getSubmissionList ─────────────────────────────────────────────────────────
// Query: submissionList
// Response: {
//   submissionList: {
//     hasNext: boolean,
//     submissions: [{ id, title, titleSlug, statusDisplay, lang, runtime, timestamp, memory }]
//   }
// }

const GET_SUBMISSION_LIST = `
  query submissionList($offset: Int!, $limit: Int!) {
    submissionList(offset: $offset, limit: $limit) {
      hasNext
      submissions {
        id
        title
        titleSlug
        statusDisplay
        lang
        runtime
        timestamp
        memory
      }
    }
  }
`;

interface RawSubmission {
  id: string;
  title: string;
  titleSlug: string;
  statusDisplay: string;
  lang: string;
  runtime: string;
  timestamp: string;
  memory: string;
}

interface SubmissionListData {
  submissionList: { hasNext: boolean; submissions: RawSubmission[] };
}

function normaliseStatus(display: string): SubmissionStatus {
  const map: Record<string, SubmissionStatus> = {
    'Accepted': 'Accepted',
    'Wrong Answer': 'Wrong Answer',
    'Time Limit Exceeded': 'Time Limit Exceeded',
    'Runtime Error': 'Runtime Error',
    'Compile Error': 'Compile Error',
    'Memory Limit Exceeded': 'Memory Limit Exceeded',
  };
  return map[display] ?? 'Other';
}

// Returns submissions without difficulty/topicTags/problemId (fetched via getProblemMetadata)
export async function getSubmissionList(
  offset: number,
  limit: number,
): Promise<{
  submissions: Omit<Submission, 'difficulty' | 'topicTags' | 'problemId'>[];
  hasNext: boolean;
}> {
  const data = await gqlFetch<SubmissionListData>(GET_SUBMISSION_LIST, { offset, limit });
  const submissions = data.submissionList.submissions.map((s) => ({
    id: s.id,
    problemSlug: s.titleSlug,
    title: s.title,
    status: normaliseStatus(s.statusDisplay),
    language: s.lang,
    timestamp: Number(s.timestamp) * 1000,
    runtime: s.runtime || undefined,
    memory: s.memory || undefined,
  }));
  return { submissions, hasNext: data.submissionList.hasNext };
}

// ── getProblemMetadata ────────────────────────────────────────────────────────
// Query: questionData
// Response: {
//   question: {
//     questionId, questionFrontendId, title, titleSlug, difficulty,
//     topicTags: [{ name, slug }],
//     similarQuestions: string  // JSON-encoded array from LeetCode
//   }
// }

const GET_PROBLEM_METADATA = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      questionId
      questionFrontendId
      title
      titleSlug
      difficulty
      topicTags {
        name
        slug
      }
      similarQuestions
    }
  }
`;

interface QuestionData {
  question: {
    questionId: string;
    questionFrontendId: string;
    title: string;
    titleSlug: string;
    difficulty: string;
    topicTags: Array<{ name: string; slug: string }>;
    similarQuestions: string;
  };
}

export async function getProblemMetadata(slug: string): Promise<Problem> {
  const data = await gqlFetch<QuestionData>(GET_PROBLEM_METADATA, { titleSlug: slug });
  const q = data.question;
  return {
    slug: q.titleSlug,
    id: Number(q.questionFrontendId),
    title: q.title,
    difficulty: q.difficulty as Difficulty,
    topicTags: q.topicTags.map((t) => t.slug),
    similarQuestionsRaw: q.similarQuestions,
    lastFetched: Date.now(),
  };
}

// ── getStudyPlanDetail ────────────────────────────────────────────────────────
// Query: studyPlanV2Detail (LeetCode's current study plan API as of 2024)
// Response: {
//   studyPlanV2Detail: {
//     slug, name,
//     planSubGroups: [{ questions: [{ titleSlug }] }]
//   }
// }

const GET_STUDY_PLAN_DETAIL = `
  query studyPlanV2Detail($slug: String!) {
    studyPlanV2Detail(slug: $slug) {
      slug
      name
      planSubGroups {
        questions {
          titleSlug
        }
      }
    }
  }
`;

interface StudyPlanDetailData {
  studyPlanV2Detail: {
    slug: string;
    name: string;
    planSubGroups: Array<{ questions: Array<{ titleSlug: string }> }>;
  };
}

export async function getStudyPlanDetail(slug: string): Promise<StudyPlan> {
  const data = await gqlFetch<StudyPlanDetailData>(GET_STUDY_PLAN_DETAIL, { slug });
  const plan = data.studyPlanV2Detail;
  const problemSlugs = plan.planSubGroups.flatMap((g) =>
    g.questions.map((q) => q.titleSlug),
  );
  return { slug: plan.slug, name: plan.name, problemSlugs, lastFetched: Date.now() };
}

// ── getUserStudyPlans ─────────────────────────────────────────────────────────
// Query: allStudyPlansV2
// Response: { allStudyPlansV2: [{ slug, name }] }
// Returns plan summaries only — use getStudyPlanDetail for the full problem list

const GET_ALL_STUDY_PLANS = `
  query allStudyPlansV2 {
    allStudyPlansV2 {
      slug
      name
    }
  }
`;

interface AllStudyPlansData {
  allStudyPlansV2: Array<{ slug: string; name: string }>;
}

export async function getUserStudyPlans(): Promise<StudyPlan[]> {
  const data = await gqlFetch<AllStudyPlansData>(GET_ALL_STUDY_PLANS);
  return data.allStudyPlansV2.map((p) => ({
    slug: p.slug,
    name: p.name,
    problemSlugs: [],
    lastFetched: Date.now(),
  }));
}
