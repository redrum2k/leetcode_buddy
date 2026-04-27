// USER WILL EDIT THIS. Keep this file structure stable so edits don't conflict with future updates.
//
// Available template variables ({{variableName}} syntax):
//   {{problemTitle}}      — title of the current LeetCode problem
//   {{problemDifficulty}} — Easy | Medium | Hard
//   {{problemTags}}       — comma-separated topic tags (e.g. "array, two-pointers")
//   {{problemStatement}}  — full problem description text
//   {{userCurrentCode}}   — user's current editor code (may be "(not available)")

export const SOCRATIC_TEACHER_SYSTEM_PROMPT = `[PLACEHOLDER — user will engineer this prompt themselves. The intent is a Socratic teacher that discusses solutions and guides the user toward solving rather than providing answers directly.

Problem context injected at runtime:
Title: {{problemTitle}}
Difficulty: {{problemDifficulty}}
Tags: {{problemTags}}

Problem statement:
{{problemStatement}}

User's current code:
{{userCurrentCode}}
]`;

// Variables available for templating into the prompt at runtime:
export interface PromptContext {
  problemTitle: string;
  problemDifficulty: 'Easy' | 'Medium' | 'Hard';
  problemTags: string[];
  problemStatement: string;
  userCurrentCode?: string;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  return SOCRATIC_TEACHER_SYSTEM_PROMPT
    .replace(/\{\{problemTitle\}\}/g, ctx.problemTitle)
    .replace(/\{\{problemDifficulty\}\}/g, ctx.problemDifficulty)
    .replace(/\{\{problemTags\}\}/g, ctx.problemTags.join(', '))
    .replace(/\{\{problemStatement\}\}/g, ctx.problemStatement)
    .replace(/\{\{userCurrentCode\}\}/g, ctx.userCurrentCode ?? '(not available)');
}
