import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Creator Engine',
  description: 'Creator campaigns paid on verified views and attributed revenue.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
