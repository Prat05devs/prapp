import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';
import { ICON_FONT_URL } from '@/components/icon';
import { SiteFooter } from '@/components/site/footer';
import { SiteHeader } from '@/components/site/header';

// Type system from Stitch: Manrope headlines, Inter interface, JetBrains Mono labels.
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['600', '700'] });
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['500'],
});

export const metadata: Metadata = {
  title: 'NewsVio',
  description: 'Fact checker and self-serve PR publishing',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
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
