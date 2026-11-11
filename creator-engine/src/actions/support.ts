'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getViewer } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase/admin';
import { isDemo } from '@/lib/env';
import { askAssistant, type AssistantReply, type ChatTurn } from '@/lib/support-ai';
import type { ActionState } from './result';

export async function sendSupportMessage(history: ChatTurn[]): Promise<AssistantReply> {
  if (!isDemo && !(await getViewer())) return { answer: 'Please sign in first.', options: [], suggestHuman: false };
  const clean = history.filter((t) => t.text.trim()).slice(-12);
  return askAssistant(clean);
}

const TicketSchema = z.object({
  category: z.enum(['payment', 'clip', 'campaign', 'account', 'dispute', 'other']),
  subject: z.string().trim().min(3, 'Add a short subject').max(120),
  message: z.string().trim().min(10, 'Tell us a bit more (10+ characters)').max(4000),
});

export async function createTicket(transcript: ChatTurn[], _prev: ActionState, form: FormData): Promise<ActionState> {
  if (isDemo) return { error: 'Tickets are off in the demo.' };
  const viewer = await getViewer();
  if (!viewer) return { error: 'Please sign in first.' };
  const parsed = TicketSchema.safeParse({ category: form.get('category'), subject: form.get('subject'), message: form.get('message') });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { error } = await createAdminClient()
    .from('support_tickets')
    .insert({ ...parsed.data, user_id: viewer.userId, email: viewer.email, role: viewer.brandId ? 'campaign owner' : viewer.creatorId ? 'clipper' : 'user', transcript: transcript.slice(-20) });
  if (error) return { error: 'Couldn’t open the ticket. Try again.' };
  revalidatePath('/support');
  return { success: 'Ticket sent. We’ll reply by email and here, usually within a day.' };
}

/** Atlas team only: emails listed in ADMIN_EMAILS (comma-separated). */
export async function isSupportAdmin(): Promise<boolean> {
  const viewer = await getViewer();
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return !!viewer?.email && admins.includes(viewer.email.toLowerCase());
}

export async function answerTicket(id: string, _prev: ActionState, form: FormData): Promise<ActionState> {
  if (!(await isSupportAdmin())) return { error: 'Not allowed.' };
  const reply = String(form.get('reply') ?? '').trim().slice(0, 4000);
  const resolve = form.get('resolve') === 'on';
  if (!reply && !resolve) return { error: 'Write a reply or mark it resolved.' };
  const { error } = await createAdminClient()
    .from('support_tickets')
    .update({ ...(reply ? { reply } : {}), ...(resolve ? { status: 'resolved', resolved_at: new Date().toISOString() } : {}) })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/support');
  return { success: resolve ? 'Resolved.' : 'Reply saved.' };
}
