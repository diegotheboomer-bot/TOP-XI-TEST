'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import {
  ArrowLeft,
  Bot,
  Check,
  Clapperboard,
  Dumbbell,
  Ellipsis,
  Eye,
  Footprints,
  Gamepad2,
  GraduationCap,
  Laugh,
  MessageCircle,
  Mic,
  Music,
  Music4,
  Rocket,
  ShoppingBag,
  ShoppingCart,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-react';
import { saveWelcome, skipWelcome } from '@/actions/profile';
import { PlatformIcon } from '../platform-icon';
import { cn } from '../ui/cn';
import { SubmitButton } from '../submit-button';

// Logos from Simple Icons (CC0), for the few brands lucide doesn't have.
const LOGO = {
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  discord:
    'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
  google:
    'M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z',
};
const logo = (k: keyof typeof LOGO) =>
  function Logo({ className }: { className?: string }) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
        <path d={LOGO[k]} />
      </svg>
    );
  };
const platform = (p: 'tiktok' | 'youtube' | 'instagram') =>
  function P({ className }: { className?: string }) {
    return <PlatformIcon platform={p} className={className} />;
  };

type Option = [label: string, icon: React.ElementType];

const TOPICS: Option[] = [
  ['Gaming', Gamepad2],
  ['IRL', Footprints],
  ['Just Chatting', MessageCircle],
  ['Esports', Trophy],
  ['Music', Music],
  ['Sports', Dumbbell],
  ['Comedy', Laugh],
  ['Education', GraduationCap],
  ['Movies & TV', Clapperboard],
  ['Brands & products', ShoppingBag],
  ['Podcasts', Mic],
];
const POST_ON: Option[] = [
  ['TikTok', platform('tiktok')],
  ['YouTube Shorts', platform('youtube')],
  ['Instagram Reels', platform('instagram')],
  ['X', logo('x')],
];
const GOALS: Option[] = [
  ['More views', Eye],
  ['More followers', UserPlus],
  ['Launch something new', Rocket],
  ['Sell products', ShoppingCart],
  ['Grow a song', Music4],
];
const HEARD: Option[] = [
  ['TikTok', platform('tiktok')],
  ['YouTube', platform('youtube')],
  ['Instagram', platform('instagram')],
  ['X (Twitter)', logo('x')],
  ['Discord', logo('discord')],
  ['A friend', Users],
  ['Google', logo('google')],
  ['ChatGPT or another AI', Bot],
  ['Other', Ellipsis],
];

/** Same-size tiles with an icon, in a grid. */
function Tiles({ options, isOn, onPick }: { options: Option[]; isOn: (label: string) => boolean; onPick: (label: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map(([label, Icon]) => {
        const on = isOn(label);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(label)}
            className={cn(
              'relative flex h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border px-1.5 text-center text-xs font-medium leading-tight transition active:scale-[0.97]',
              on ? 'border-transparent bg-brand text-brand-ink shadow-[0_6px_18px_-8px_rgb(var(--brand-b)/0.8)]' : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
            )}
          >
            {on && (
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.18)' }}>
                <Check className="size-2.5" strokeWidth={3.5} />
              </span>
            )}
            <Icon className={cn('size-6 shrink-0', !on && 'text-[rgb(var(--brand-ta))]')} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** A few quick questions after sign-up, one per step, so Discover can show campaigns that fit. Everything is optional. */
export function WelcomeForm({ clipper }: { clipper: boolean }) {
  const [state, action] = useFormState(saveWelcome, undefined);
  const [step, setStep] = useState(0);
  const [topics, setTopics] = useState<string[]>([]);
  const [second, setSecond] = useState<string[]>([]);
  const [heard, setHeard] = useState('');
  const toggle = (set: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) => set((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const prefix = clipper ? 'post:' : 'goal:';

  const steps = [
    {
      title: clipper ? 'What do you like to clip?' : 'What are you promoting?',
      hint: 'Pick as many as you like.',
      body: <Tiles options={TOPICS} isOn={(l) => topics.includes(l)} onPick={toggle(setTopics)} />,
      done: topics.length > 0,
    },
    {
      title: clipper ? 'Where do you post?' : 'What do you want most?',
      hint: clipper ? 'So we can show campaigns for your platforms.' : 'So we can point you to the right setup.',
      body: <Tiles options={clipper ? POST_ON : GOALS} isOn={(l) => second.includes(l)} onPick={toggle(setSecond)} />,
      done: second.length > 0,
    },
    {
      title: 'How did you hear about Atlas?',
      hint: 'Pick one.',
      body: <Tiles options={HEARD} isOn={(l) => heard === l} onPick={(l) => setHeard(heard === l ? '' : l)} />,
      done: !!heard,
    },
  ];
  const last = step === steps.length - 1;
  const cur = steps[step];

  return (
    <>
      <form action={action}>
        {/* Answers from every step go with the final submit. */}
        {topics.map((t) => (
          <input key={t} type="hidden" name="interests" value={t} />
        ))}
        {second.map((t) => (
          <input key={t} type="hidden" name="interests" value={prefix + t} />
        ))}
        <input type="hidden" name="heard_from" value={heard} />

        <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
          <span>
            Step {step + 1} of {steps.length}
          </span>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 hover:text-zinc-900">
              <ArrowLeft className="size-3.5" /> Back
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={i} className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <span className="block h-full rounded-full bg-brand transition-[width] duration-500 ease-out" style={{ width: i < step || (i === step && s.done) ? '100%' : i === step ? '35%' : '0%' }} />
            </span>
          ))}
        </div>

        <div key={step} className="step-stagger mt-6">
          <h2 className="text-lg font-semibold tracking-tight">{cur.title}</h2>
          <p className="mb-4 text-sm text-zinc-500">{cur.hint}</p>
          {cur.body}
        </div>

        {state?.error && <p className="mt-4 text-sm text-rose-600">{state.error}</p>}
        <div className="mt-6">
          {last ? (
            <SubmitButton pendingText="Saving…" className="h-11 w-full">
              Finish
            </SubmitButton>
          ) : (
            <button type="button" onClick={() => setStep(step + 1)} className="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-brand-ink transition hover:brightness-110">
              {cur.done ? 'Next' : 'Skip this one'}
            </button>
          )}
        </div>
      </form>
      <form action={skipWelcome} className="mt-3 text-center">
        <button type="submit" className="text-sm text-zinc-500 hover:text-zinc-900">
          Skip for now
        </button>
      </form>
    </>
  );
}
