import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { THEME_BOOT_SCRIPT } from '../../tailwind.theme';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://atlasclipping.com'),
  title: { default: 'Atlas Clipping: get paid to clip streams', template: '%s · Atlas Clipping' },
  description:
    'Earn money clipping streams: post clips to TikTok, YouTube Shorts and Instagram Reels and get paid per 1,000 real views. Streamers fund campaigns and only pay for real views.',
  keywords: ['clipping', 'get paid to clip', 'clipping jobs', 'make money clipping', 'side income', 'streamer clips', 'TikTok clips', 'YouTube Shorts', 'Instagram Reels'],
  openGraph: {
    title: 'Atlas Clipping: get paid to clip streams',
    description: 'Clippers earn per 1,000 real views. Streamers only pay for real views.',
    url: 'https://atlasclipping.com',
    siteName: 'Atlas Clipping',
    images: [{ url: '/brand/app-icon-1024.png', width: 1024, height: 1024 }],
    type: 'website',
  },
  twitter: { card: 'summary', title: 'Atlas Clipping: get paid to clip streams', images: ['/brand/app-icon-1024.png'] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
