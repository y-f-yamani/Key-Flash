'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { registry } from '@/content';
import { mastery, useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';

/** The learning path: one card per category with live mastery progress. */
export function CategoryGrid({ domainSlug }: { domainSlug: string }) {
  const { locale, dict } = useI18n();
  const { state } = useProgress();
  const domain = registry.getDomain(domainSlug);
  if (!domain) return null;

  const categories = [...domain.categories].sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const shortcuts = registry.shortcutsInCategory(domainSlug, category.id);
        const progress = mastery(
          state,
          shortcuts.map((s) => s.id),
        );
        return (
          <Link key={category.id} href={`/${locale}/learn/${category.id}`}>
            <Card className="h-full transition-colors hover:border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{category.name[locale]}</CardTitle>
                  <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" aria-hidden />
                </div>
                <CardDescription>{category.description[locale]}</CardDescription>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={progress} className="flex-1" label={dict.learn.masteredLabel} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {Math.round(progress * 100)}%
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {shortcuts.length} {dict.learn.shortcutsLabel}
                </span>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
