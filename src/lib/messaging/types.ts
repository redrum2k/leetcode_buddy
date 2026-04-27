import type { StudyPlan, UserPrefs } from '@/types';

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

export type AppMessage =
  | ContentUrlChangedMsg
  | ContentSubmissionDetectedMsg
  | ContentOpenPopupMsg
  | PopupTriggerBackfillMsg
  | PopupGetStatusMsg
  | PopupSetModuleMsg
  | BgBackfillProgressMsg
  | BgStatusMsg;

export type MessageType = AppMessage['type'];
export type MessageOfType<T extends MessageType> = Extract<AppMessage, { type: T }>;
