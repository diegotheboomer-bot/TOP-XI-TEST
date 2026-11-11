'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Check } from 'lucide-react';
import { saveWelcome, skipWelcome } from '@/actions/profile';
import { cn } from '../ui/cn';
import { SubmitButton } from '../submit-button';

const CLIP_TOPICS = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Movies & TV', 'Brands & products', 'Podcasts'];
const BIZ_TOPICS = ['Gaming', 'IRL', 'Just Chatting', 'Esports', 'Music', 'Sports', 'Comedy', 'Education', 'Movies & TV', 'Brands & products', 'Podcasts'];
const POST_ON = ['TikTok', 'YouTube Shorts', 'Instagram Reels', 'X'];
const GOALS = ['More views', 'More followers', 'Launch something new', 'Sell products', 'Grow a song'];
const HEARD = ['TikTok', 'YouTube', 'Instagram', 'X (Twitter)', 'Discord', 'A friend', 'Google', 'ChatGPT or another AI', 'Other'];

function Chips({ name, options, picked, toggle, prefix = '' }: { name: string; options: string[]; picked: string[]; toggle: (v: string) => void; prefix?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const v = prefix + o;
        const on = picked.includes(v);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(v)}
            className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition', on ? 'border-transparent bg-brand font-medium text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300')}
          >
            {on && <Check className="size-3.5" strokeWidth={3} />}
            {o}
            {on && <input type="hidden" name={name} value={v} />}
          </button>
        );
      })}
    </div>
  );
}

/** A few quick questions after sign-up, so Discover can show campaigns that fit. Everything is optional. */
export function WelcomeForm({ clipper }: { clipper: boolean }) {
  const [state, action] = useFormState(saveWelcome, undefined);
  const [picked, setPicked] = useState<string[]>([]);
  const [heard, setHeard] = useState('');
  const toggle = (v: string) => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  return (
    <>
    <form action={action} className="space-y-8">
      <section>
        <h2 className="font-semibold tracking-tight">{clipper ? 'What do you like to clip?' : 'What are you promoting?'}</h2>
        <p className="mb-3 text-sm text-zinc-500">Pick as many as you like.</p>
        <Chips name="interests" options={clipper ? CLIP_TOPICS : BIZ_TOPICS} picked={picked} toggle={toggle} />
      </section>
      <section>
        <h2 className="font-semibold tracking-tight">{clipper ? 'Where do you post?' : 'What do you want most?'}</h2>
        <p className="mb-3 text-sm text-zinc-500">{clipper ? 'So we can show campaigns for your platforms.' : 'So we can point you to the right setup.'}</p>
        <Chips name="interests" options={clipper ? POST_ON : GOALS} picked={picked} toggle={toggle} prefix={clipper ? 'post:' : 'goal:'} />
      </section>
      <section>
        <h2 className="font-semibold tracking-tight">How did you hear about Atlas?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <input type="hidden" name="heard_from" value={heard} />
          {HEARD.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHeard(heard === h ? '' : h)}
              className={cn('rounded-full border px-3.5 py-2 text-sm transition', heard === h ? 'border-transparent bg-brand font-medium text-brand-ink' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300')}
            >
              {h}
            </button>
          ))}
        </div>
      </section>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <div className="border-t border-zinc-200/80 pt-6 sm:flex sm:justify-end">
        <SubmitButton pendingText="Saving…" className="h-11 w-full sm:w-auto">
          Continue
        </SubmitButton>
      </div>
    </form>
    <form action={skipWelcome} className="mt-3 text-center sm:text-left">
      <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">
        Skip for now
      </button>
    </form>
    </>
  );
}
