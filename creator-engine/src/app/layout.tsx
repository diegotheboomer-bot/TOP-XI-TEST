import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { THEME_BOOT_SCRIPT } from '../../tailwind.theme';
import { isDemo } from '@/lib/env';
import { LogoPicker } from '@/components/logo-picker';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Creator Engine',
  description: 'Creator campaigns paid on verified views and attributed revenue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        {children}
        {isDemo && <LogoPicker />}
      </body>
    </html>
  );
}
