'use client';

import { useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n/provider';

/**
 * Shown while hosting a private room: the shareable link, a copy button, and
 * a spinner until the friend opens it (the match flips to active on join).
 */
export function RoomShare({ link, onCancel }: { link: string; onCancel: () => void }) {
  const { dict } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      // Clipboard blocked — the link is still visible to copy manually.
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
        <p className="max-w-sm font-semibold">{dict.duel.shareRoom}</p>
        <div className="flex w-full max-w-md items-center gap-2">
          <input
            readOnly
            value={link}
            dir="ltr"
            onFocus={(e) => e.currentTarget.select()}
            className="h-10 flex-1 rounded-lg border border-border bg-muted px-3 text-sm"
            data-testid="room-link"
          />
          <Button variant="outline" onClick={() => void copy()}>
            {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
            {copied ? dict.duel.copied : dict.duel.copyLink}
          </Button>
        </div>
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {dict.duel.waitingFriend}
        </p>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {dict.duel.cancelSearch}
        </Button>
      </CardContent>
    </Card>
  );
}
