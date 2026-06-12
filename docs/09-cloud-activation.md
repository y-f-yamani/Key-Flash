# 09 — Cloud Activation Checklist (Supabase + GitHub OAuth)

The code is cloud-ready; activation needs secrets only the project owner can
create. ~10 minutes, any browser (Edge is fine — "GitHub" here is the OAuth
*sign-in provider*, unrelated to which browser users run).

## 1. Create the Supabase project

1. <https://supabase.com/dashboard> → **New project** (free tier is fine).
2. Note the **Project URL** and **anon key** (Settings → API), and the
   **service_role key** (same page — keep secret, server-only).

## 2. Apply the schema

Either paste [`supabase/migrations/0001_initial.sql`](../supabase/migrations/0001_initial.sql)
into the dashboard **SQL Editor → Run**, or with the CLI:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

## 3. GitHub OAuth app

1. GitHub → Settings → Developer settings → **OAuth Apps** → New OAuth App.
2. Homepage URL: your site (locally `http://localhost:3000`).
3. **Authorization callback URL:** `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID + generate a Client Secret.
5. Supabase dashboard → **Authentication → Providers → GitHub** → enable,
   paste Client ID/Secret, save.
6. Authentication → URL Configuration → add site URL(s) and
   `http://localhost:3000/auth/callback` to redirect allow-list.

## 4. Environment variables

`.env.local` (and the same names in Vercel for deploys):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

## 5. Verify

`npm run dev` → header now shows **Sign in** → GitHub button → after the
redirect you're signed in; local progress uploads automatically; finish a
sprint and it appears on `/en/arena/leaderboard`.

No env vars set ⇒ everything cloud-related hides itself and the app stays
fully local-first. Email magic-link sign-in works out of the box (Supabase
ships a default SMTP for low volume).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 404 after GitHub authorize | App proxy intercepted `/auth/callback` | Fixed in code (proxy excludes `/auth`) |
| Lands on `/en` signed out, no error | GitHub OAuth App callback URL points at your app instead of Supabase | Set it to `https://<ref>.supabase.co/auth/v1/callback` |
| **"Unable to exchange external code: …"** | GitHub rejected Supabase's credential exchange — Client **Secret** in Supabase is wrong, stale, or from a different OAuth app | GitHub OAuth App → *Generate a new client secret* → copy it immediately → Supabase → Auth → Providers → GitHub → paste **both** Client ID and the new secret → Save. Watch for stray spaces; secrets are shown only once; make sure it's an *OAuth App*, not a *GitHub App* |
| Error after fixing secret | Old code reused | Always start a fresh sign-in attempt from `/sign-in` |
