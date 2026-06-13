'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import {
  BookOpen,
  Flag,
  Gamepad2,
  Lock,
  MapPin,
  Mountain,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { KeycapBuddy } from '@/components/shared/keycap-buddy';
import { registry } from '@/content';
import { useProgress } from '@/features/progress';
import { useI18n } from '@/lib/i18n/provider';
import { cn } from '@/lib/utils';
import {
  buildLearningPath,
  nodeMastery,
  nodeStatuses,
  type NodeStatus,
  type PathNode,
} from './path';

const NODE_ICON: Record<PathNode['kind'], LucideIcon> = {
  lesson: BookOpen,
  'capstone-sim': Gamepad2,
  'capstone-drill': Target,
};

/**
 * The unified Learning Path: one vertical climb from the basics at the bottom
 * to the summit at the top. Each category's lessons are capped by a capstone
 * that makes you apply the shortcuts (simulator mission or mastery challenge).
 * Linear unlock — the page auto-scrolls to wherever you are.
 */
export function LearningPath({ domainSlug }: { domainSlug: string }) {
  const { locale, dict } = useI18n();
  const { ready, state } = useProgress();
  const currentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready) currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [ready]);

  if (!ready) return <div className="h-96 animate-pulse rounded-xl bg-muted" />;

  const path = buildLearningPath(domainSlug);
  const statuses = nodeStatuses(path, state);
  const domain = registry.getDomain(domainSlug);

  // Climb reads bottom→top, so render summit-first: categories reversed, and
  // each category's capstone above its lessons.
  const groups = [...path].reverse().map((category) => ({
    categoryId: category.categoryId,
    name: domain?.categories.find((c) => c.id === category.categoryId)?.name[locale] ?? '',
    items: [...category.nodes].reverse(),
  }));

  return (
    <div className="mx-auto flex max-w-xl flex-col">
      <SummitBanner label={dict.path.summit} />

      {groups.map((group) => (
        <section key={group.categoryId}>
          <div className="relative ps-10 pt-6">
            <span className="absolute inset-y-0 start-4 w-0.5 bg-border" aria-hidden />
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              {group.name}
            </h2>
          </div>
          {group.items.map((node) => {
            const status = statuses.get(node.id) ?? 'locked';
            return (
              <PathNodeRow
                key={node.id}
                ref={status === 'current' ? currentRef : undefined}
                node={node}
                status={status}
                mastery={nodeMastery(node, state)}
                href={hrefFor(locale, node)}
                title={titleFor(dict, node)}
                hint={node.kind === 'lesson' ? undefined : dict.path.capstoneHint}
              />
            );
          })}
        </section>
      ))}

      <BaseBanner label={dict.path.base} />
    </div>
  );
}

interface RowProps {
  node: PathNode;
  status: NodeStatus;
  mastery: number;
  href: string;
  title: string;
  hint?: string;
  ref?: React.Ref<HTMLDivElement>;
}

function PathNodeRow({ node, status, mastery, href, title, hint, ref }: RowProps) {
  const { dict } = useI18n();
  const Icon = NODE_ICON[node.kind];
  const locked = status === 'locked';
  const isCapstone = node.kind !== 'lesson';

  return (
    <div ref={ref} className="relative ps-10">
      {/* rail */}
      <span className="absolute inset-y-0 start-4 w-0.5 bg-border" aria-hidden />
      {/* node marker */}
      <span
        className={cn(
          'absolute start-1.5 top-6 flex size-5 items-center justify-center rounded-full ring-4 ring-background',
          status === 'done' && 'bg-success',
          status === 'current' && 'animate-pulse bg-primary',
          locked && 'bg-muted',
        )}
        aria-hidden
      >
        {status === 'current' && <MapPin className="size-3 text-primary-foreground" />}
      </span>

      <Card
        className={cn(
          'my-2 transition-colors',
          status === 'current' && 'border-primary shadow-md',
          isCapstone && !locked && 'border-accent/50',
          locked && 'opacity-60',
        )}
      >
        <CardContent className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                isCapstone ? 'bg-accent/15 text-accent' : 'bg-primary/15 text-primary',
                locked && 'bg-muted text-muted-foreground',
              )}
            >
              {locked ? <Lock className="size-4" /> : <Icon className="size-5" />}
            </span>
            <div className="flex-1">
              <p className="font-bold leading-tight">{title}</p>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
            {status === 'current' && <Badge variant="default">{dict.path.youAreHere}</Badge>}
            {status === 'done' && (
              <Badge variant="success">{Math.round(mastery * 100)}%</Badge>
            )}
          </div>

          {!locked && (
            <ProgressBar value={mastery} className="h-1.5" />
          )}

          {locked ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> {dict.path.lockedHint}
            </span>
          ) : (
            <Link href={href} className="w-fit">
              <Button size="sm" variant={status === 'current' ? 'primary' : 'outline'}>
                {status === 'done' ? dict.path.review : dict.path.start}
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummitBanner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 pb-2 text-center">
      <Mountain className="size-8 text-primary" aria-hidden />
      <KeycapBuddy mood="cheer" size={72} />
      <p className="font-extrabold">{label}</p>
    </div>
  );
}

function BaseBanner({ label }: { label: string }) {
  return (
    <div className="relative ps-10 pt-2">
      <span className="absolute start-2.5 top-0 size-5 rounded-full bg-border ring-4 ring-background" aria-hidden />
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Flag className="size-4" /> {label}
      </span>
    </div>
  );
}

function hrefFor(locale: string, node: PathNode): string {
  switch (node.kind) {
    case 'lesson':
      return `/${locale}/learn/${node.categoryId}/${node.lessonIndex}`;
    case 'capstone-sim':
      return `/${locale}/learn/${node.categoryId}/mission`;
    case 'capstone-drill':
      return `/${locale}/learn/${node.categoryId}/challenge`;
  }
}

function titleFor(dict: ReturnType<typeof useI18n>['dict'], node: PathNode): string {
  switch (node.kind) {
    case 'lesson':
      return `${dict.path.lesson} ${(node.lessonIndex ?? 0) + 1}`;
    case 'capstone-sim':
      return dict.path.simCapstone;
    case 'capstone-drill':
      return dict.path.drillCapstone;
  }
}
