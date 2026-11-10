export type ActionState = { error?: string; success?: string } | undefined;

export const DEMO_ERROR = 'Sign-in is off in demo mode. Add Supabase keys to .env.local to use real accounts.';

/** One line of the checklist shown while a clip is verified. */
export interface SubmitCheck {
  label: string;
  status: 'pass' | 'fail' | 'warn';
  detail?: string;
}
export type SubmitState = (NonNullable<ActionState> & { checks?: SubmitCheck[] }) | undefined;
