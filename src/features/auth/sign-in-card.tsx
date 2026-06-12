'use client';

import { useState, type FormEvent } from 'react';
import { Mail } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { useI18n } from '@/lib/i18n/provider';

type Status = 'idle' | 'sending' | 'sent' | 'error';

/** Email magic-link + OAuth sign-in. Rendered only when cloud is enabled. */
export function SignInCard() {
  const { locale, dict } = useI18n();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = () => `${window.location.origin}/auth/callback?next=/${locale}`;

  async function sendMagicLink(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setStatus('sending');
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (sendError) {
      setError(sendError.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  async function oauthGitHub() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: callbackUrl() },
    });
    if (oauthError) {
      setError(oauthError.message);
      setStatus('error');
    }
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>{dict.auth.signInTitle}</CardTitle>
        <CardDescription>{dict.auth.signInSubtitle}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={sendMagicLink} className="flex flex-col gap-3">
          <label className="text-sm font-semibold" htmlFor="email">
            {dict.auth.emailLabel}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={dict.auth.emailPlaceholder}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
            dir="ltr"
          />
          <Button type="submit" disabled={status === 'sending' || status === 'sent'}>
            <Mail className="size-4" />
            {dict.auth.sendLink}
          </Button>
        </form>

        {status === 'sent' && <Badge variant="success">{dict.auth.linkSent}</Badge>}
        {status === 'error' && error && <Badge variant="danger">{error}</Badge>}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          {dict.auth.orContinueWith}
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" onClick={() => void oauthGitHub()}>
          GitHub
        </Button>
        <p className="text-xs text-muted-foreground">{dict.auth.localNote}</p>
      </CardContent>
    </Card>
  );
}
