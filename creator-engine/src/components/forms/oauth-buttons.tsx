import { oauthSignIn } from '@/actions/account';

export type OAuthProvider = 'google' | 'apple';

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.07.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.38-2.29v-3.1H1.27a12 12 0 0 0 0 10.78l4-3.1z" />
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.43-3.43A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.27 6.61l4 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
  </svg>
);

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden>
    <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.05 1.6 2.24 2.74 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.4 1.2-2.46-.03-.01-2.3-.88-2.3-3.53zM14.2 6.13c.6-.74 1.01-1.75.9-2.77-.87.04-1.93.58-2.55 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.96-.49 2.57-1.23z" />
  </svg>
);

/** "Continue with Google / Apple" buttons. `role` picks the side for a new account. */
export function OAuthButtons({ providers, role }: { providers: OAuthProvider[]; role?: string }) {
  if (!providers.length) return null;
  return (
    <div className="space-y-2">
      {providers.map((p) => (
        <form key={p} action={oauthSignIn}>
          <input type="hidden" name="provider" value={p} />
          {role && <input type="hidden" name="role" value={role} />}
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            {p === 'google' ? <GoogleLogo /> : <AppleLogo />} Continue with {p === 'google' ? 'Google' : 'Apple'}
          </button>
        </form>
      ))}
      <div className="flex items-center gap-3 py-1 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" /> or with email <span className="h-px flex-1 bg-zinc-200" />
      </div>
    </div>
  );
}

/** Which providers are switched on (AUTH_GOOGLE=true / AUTH_APPLE=true once set up in Supabase). */
export const enabledProviders = (): OAuthProvider[] =>
  (['google', 'apple'] as const).filter((p) => process.env[`AUTH_${p.toUpperCase()}`]?.trim() === 'true');
