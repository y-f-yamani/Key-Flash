import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { AuthProvider } from '@/features/auth/provider';
import { ProgressProvider } from '@/features/progress';
import { SiteHeader } from '@/features/shell/site-header';
import { THEME_INIT_SCRIPT } from '@/features/shell/theme-toggle';
import { LOCALES, dirFor, getDictionary, isLocale } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/provider';
import '../globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'KeyMaster — Master Windows 11 shortcuts', template: '%s · KeyMaster' },
  description:
    'Interactive lessons, spaced repetition and a competitive speed arena for Windows 11 keyboard shortcuts.',
  manifest: '/manifest.webmanifest',
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} dir={dirFor(locale)} suppressHydrationWarning>
      <head>
        {/* Applies the stored theme before first paint (no dark-mode flash). */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <I18nProvider locale={locale} dict={dict}>
          <AuthProvider>
            <ProgressProvider>
              <SiteHeader />
              <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
            </ProgressProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
