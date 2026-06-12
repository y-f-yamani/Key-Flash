import { notFound } from 'next/navigation';
import { SignInCard } from '@/features/auth/sign-in-card';
import { isLocale } from '@/lib/i18n';

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <div className="py-12">
      <SignInCard />
    </div>
  );
}
