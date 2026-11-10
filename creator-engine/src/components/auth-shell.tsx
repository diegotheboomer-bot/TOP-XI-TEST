import { Logo } from './site-header';
import { Card } from './ui/card';

/** Centered card layout for sign-in, sign-up and password pages. */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className={wide ? 'w-full max-w-md' : 'w-full max-w-sm'}>
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-7">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
        <p className="mt-4 text-center text-xs text-zinc-500">
          By continuing you agree to the{' '}
          <a href="/terms" className="underline">
            Terms
          </a>{' '}
          and{' '}
          <a href="/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </main>
  );
}
