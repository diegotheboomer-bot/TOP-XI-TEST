'use client';

import { useFormState } from 'react-dom';
import { answerTicket } from '@/actions/support';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';

type T = { id: string; email: string | null; role: string; category: string; subject: string; message: string; transcript: { role: string; text: string }[]; status: string; reply: string | null; created_at: string };

export function AdminTicket({ ticket: t }: { ticket: T }) {
  const [state, action] = useFormState(answerTicket.bind(null, t.id), undefined);
  return (
    <li className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>
          {t.email ?? 'no email'} · {t.role} · {t.category}
        </span>
        <span>{new Date(t.created_at).toLocaleString('en-GB')}</span>
      </div>
      <p className="mt-2 font-semibold">{t.subject}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-zinc-700">{t.message}</p>
      {t.transcript?.length > 0 && (
        <details className="mt-3 text-xs text-zinc-500">
          <summary className="cursor-pointer">Assistant chat ({t.transcript.length})</summary>
          <ul className="mt-2 space-y-1">
            {t.transcript.map((m, i) => (
              <li key={i}>
                <b>{m.role}:</b> {m.text}
              </li>
            ))}
          </ul>
        </details>
      )}
      <form action={action} className="mt-4 space-y-2">
        <textarea name="reply" defaultValue={t.reply ?? ''} rows={3} placeholder="Reply (they see it on their Support page)" className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="resolve" defaultChecked={t.status === 'resolved'} /> Mark resolved
        </label>
        <FormMessage state={state} />
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
      </form>
    </li>
  );
}
