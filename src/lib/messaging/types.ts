import type { ProblemContext, StudyPlan, UserPrefs } from '@/types';

export interface ContentUrlChangedMsg {
  type: 'CONTENT_URL_CHANGED';
  url: string;
  detectedPlanSlug: string | null;
}

export interface ContentSubmissionDetectedMsg {
  type: 'CONTENT_SUBMISSION_DETECTED';
  submissionId: string;
  problemSlug: string;
}

export interface ContentOpenPopupMsg {
  type: 'CONTENT_OPEN_POPUP';
}

export interface ContentProblemContextMsg {
  type: 'CONTENT_PROBLEM_CONTEXT';
  context: ProblemContext;
}

export interface PopupTriggerBackfillMsg {
  type: 'POPUP_TRIGGER_BACKFILL';
}

export interface PopupGetStatusMsg {
  type: 'POPUP_GET_STATUS';
}

export interface PopupSetModuleMsg {
  type: 'POPUP_SET_MODULE';
  slug: string | null;
}

export interface PopupOpenChatMsg {
  type: 'POPUP_OPEN_CHAT';
  initialMessage: string;
}

export interface PopupGetContextMsg {
  type: 'POPUP_GET_CONTEXT';
}

export interface BgBackfillProgressMsg {
  type: 'BG_BACKFILL_PROGRESS';
  fetched: number;
  total: number | null;
  phase: 'submissions' | 'problems' | 'done' | 'error';
  error?: string;
}

export interface BgStatusMsg {
  type: 'BG_STATUS';
  prefs: UserPrefs;
  activePlanSlug: string | null;
  availablePlans: StudyPlan[];
}

export interface BgContextMsg {
  type: 'BG_CONTEXT';
  context: ProblemContext | null;
}

export interface BgContextUpdatedMsg {
  type: 'BG_CONTEXT_UPDATED';
  context: ProblemContext | null;
}

export type AppMessage =
  | ContentUrlChangedMsg
  | ContentSubmissionDetectedMsg
  | ContentOpenPopupMsg
  | ContentProblemContextMsg
  | PopupTriggerBackfillMsg
  | PopupGetStatusMsg
  | PopupSetModuleMsg
  | PopupOpenChatMsg
  | PopupGetContextMsg
  | BgBackfillProgressMsg
  | BgStatusMsg
  | BgContextMsg
  | BgContextUpdatedMsg;

export type MessageType = AppMessage['type'];
export type MessageOfType<T extends MessageType> = Extract<AppMessage, { type: T }>;
