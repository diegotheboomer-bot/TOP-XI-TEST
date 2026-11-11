'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { Bot, LifeBuoy, Loader2, Send, UserRound } from 'lucide-react';
import { createTicket, sendSupportMessage } from '@/actions/support';
import type { ChatTurn } from '@/lib/support-ai';
import { cn } from '../ui/cn';
import { Field, Input } from '../ui/field';
import { FormMessage } from '../form-message';
import { SubmitButton } from '../submit-button';

const STARTERS = ['Where is my money?', 'Why was my clip flagged?', 'How do tiers work?', 'How do I get a refund?', 'Problem with a clipper or campaign'];

/** Assistant first; a ticket to a person when it can't help or they ask. */
export function SupportChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([
    { role: 'assistant', text: 'Hi! I’m the Atlas assistant. Ask me anything about campaigns, clips, payouts or tiers.' },
  ]);
  const [options, setOptions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [human, setHuman] = useState(false);
  const [suggest, setSuggest] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [turns, human]);

  const ask = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...turns, { role: 'user' as const, text: q }];
    setTurns(next);
    setInput('');
    setOptions([]);
    setBusy(true);
    try {
      const r = await sendSupportMessage(next);
      setTurns([...next, { role: 'assistant', text: String(r?.answer ?? 'Sorry, something went wrong.') }]);
      setOptions(Array.isArray(r?.options) ? r.options.map(String) : []);
      setSuggest(!!r?.suggestHuman);
    } catch {
      setTurns([...next, { role: 'assistant', text: 'Sorry, I couldn’t reach the assistant. Reload the page and try again, or talk to a person.' }]);
      setSuggest(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card">
      <div className="max-h-[55vh] min-h-[16rem] space-y-3 overflow-y-auto p-4 sm:p-5">
        {turns.map((t, i) => (
          <div key={i} className={cn('flex gap-2.5', t.role === 'user' && 'flex-row-reverse')}>
            <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', t.role === 'user' ? 'bg-zinc-100 text-zinc-600' : 'bg-brand text-brand-ink')}>
              {t.role === 'user' ? <UserRound className="size-4" /> : <Bot className="size-4" />}
            </span>
            <p className={cn('max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', t.role === 'user' ? 'bg-zinc-100' : 'border border-zinc-200/80')}>
              {t.text}
            </p>
          </div>
        ))}
        {busy && (
          <p className="flex items-center gap-2 pl-10 text-xs text-zinc-500">
            <Loader2 className="size-3.5 animate-spin" /> Thinking…
          </p>
        )}
        {!busy && options.length > 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            {options.map((o, i) => (
              <button key={`${i}-${o}`} type="button" onClick={() => ask(o)} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50">
                {o}
              </button>
            ))}
          </div>
        )}
        {human && <TicketForm transcript={turns} onCancel={() => setHuman(false)} />}
        <div ref={end} />
      </div>
      <div className="border-t border-zinc-100 p-3 sm:p-4">
        {!human && (
          <button
            type="button"
            onClick={() => setHuman(true)}
            className={cn(
              'mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition sm:w-auto',
              suggest ? 'border-transparent bg-brand text-brand-ink' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
            )}
          >
            <LifeBuoy className="size-4" /> Talk to a person
          </button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
          className="flex gap-2"
        >
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question…" maxLength={2000} aria-label="Your question" />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand text-brand-ink transition disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

function TicketForm({ transcript, onCancel }: { transcript: ChatTurn[]; onCancel: () => void }) {
  const [state, action] = useFormState(createTicket.bind(null, transcript), undefined);
  if (state?.success) return <p className="rounded-xl bg-brand-a/10 px-4 py-3 text-sm ring-1 ring-inset ring-brand-a/30">{state.success}</p>;
  return (
    <form action={action} className="space-y-3 rounded-2xl border border-zinc-200 p-4">
      <p className="text-sm font-semibold">Open a ticket</p>
      <p className="text-xs text-zinc-500">A person from the Atlas team will look at it. This chat is attached so you don’t have to repeat yourself.</p>
      <Field label="What’s it about?">
        <select name="category" defaultValue="payment" className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm">
          <option value="payment">Payment or cash-out</option>
          <option value="clip">A clip (flagged, rejected, views)</option>
          <option value="campaign">A campaign or budget</option>
          <option value="dispute">Dispute with a clipper or campaign owner</option>
          <option value="account">My account</option>
          <option value="other">Something else</option>
        </select>
      </Field>
      <Field label="Subject">
        <Input name="subject" required minLength={3} maxLength={120} placeholder="e.g. Cash-out not in my bank" />
      </Field>
      <Field label="Details">
        <textarea name="message" required minLength={10} maxLength={4000} rows={4} className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" placeholder="Campaign name, clip link, amounts, dates…" />
      </Field>
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton pendingText="Sending…">Send ticket</SubmitButton>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 text-sm text-zinc-500 hover:text-zinc-900">
          Cancel
        </button>
      </div>
    </form>
  );
}
