import type { Metadata } from 'next';
import { IBM_Plex_Mono, Public_Sans, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { ICON_FONT_URL } from '@/components/icon';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';
import { publicEnv } from '@/lib/env';
import { SITE_DESCRIPTION } from '@/lib/seo';

// Type system (docs/DESIGN.md): Source Serif 4 headlines, Public Sans interface and body,
// IBM Plex Mono only for data (order numbers, URLs, codes).
const sourceSerif = Source_Serif_4({
  variable: '--font-source-serif',
  subsets: ['latin'],
  weight: ['600', '700'],
});
const publicSans = Public_Sans({ variable: '--font-public-sans', subsets: ['latin'] });
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['500'],
});

// metadataBase makes share-card and canonical URLs absolute on the configured domain
// (NEXT_PUBLIC_SITE_URL: https://newsvio.in in production).
export const metadata: Metadata = {
  metadataBase: new URL(publicEnv().NEXT_PUBLIC_SITE_URL),
  title: 'NewsVio — Fact Checking & Self-Service PR in India',
  description: SITE_DESCRIPTION,
  applicationName: 'NewsVio',
  icons: { icon: '/brand-mark.png', apple: '/brand-mark.png' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} ${publicSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="stylesheet" href={ICON_FONT_URL} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
