# Maestro

Personalized AI learning platform for Latvian schools, music schools, teachers, and independent learners.

## Features

- Chat-first learning experience
- User onboarding and profile setup
- XP, levels, streaks, and achievements
- Leaderboard and progress tracking
- Practice modules and teacher tools
- AI provider abstraction for OpenAI / Anthropic
- Responsive dark-light UI

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui patterns
- Supabase Auth with cookie-backed server sessions
- RLS-protected user profiles and first-run onboarding

## Local setup

1. Install dependencies:
   npm install
2. Copy environment variables:
   cp .env.example .env.local
3. Add the Supabase project URL and anon/publishable key to `.env.local`. For Gemini, create a key in Google AI Studio and set `GEMINI_API_KEY`; OpenAI and Anthropic are also supported.
   To temporarily enable a non-persistent guest preview, set `NEXT_PUBLIC_ENABLE_GUEST_MODE=true` and restart the dev server. Remove the flag or set it to `false` when ready for authenticated-only access. Guest chat uses the local response fallback, practice scores remain in the browser, and teacher tools use local templates; guest activity is not saved and earns no XP. Photo AI analysis requires an authenticated account.
4. In the Supabase SQL Editor, run `supabase/schema.sql`, `supabase/schema_chat_xp.sql`, `supabase/schema_practice.sql` and `supabase/schema_plans.sql` in that order.
5. For immediate signup-to-onboarding testing, disable email confirmation in Supabase Auth; otherwise users must confirm their email before signing in.
6. Start the app:
   npm run dev
7. Open http://localhost:3000

## Environment variables

See .env.example.

## Database setup

Run `supabase/schema.sql`, then `supabase/schema_chat_xp.sql`, then `supabase/schema_practice.sql`, then `supabase/schema_plans.sql`. These create profiles/auth setup, private chat history and XP awarding, the private question bank plus secure one-time practice XP, and subscription plans with the daily chat limit. Do not expose a Supabase service-role key in client code; the app uses the public anon/publishable key with RLS.

### Plans and daily limit

Free users get 10 AI chat questions per day (the day rolls over at midnight in Latvia); PRO users are unlimited. The limit is enforced atomically in the database (`consume_chat_credit()`) and checked in `/api/chat`, so it cannot be bypassed from the browser. Clients cannot change their own plan. Until payments are connected, set a user's plan manually in the Supabase SQL Editor: `update public.profiles set plan = 'pro' where id = '<user id>';`. To change the limit, edit `free_daily_chat_limit()` in `schema_plans.sql` and `FREE_DAILY_QUESTION_LIMIT` in `lib/plans.ts` (display copy only).

### Google sign-in

The "Turpināt ar Google" button appears automatically once Google is enabled in Supabase. Create an OAuth client in Google Cloud Console, then in Supabase go to Authentication > Providers > Google and enter its client ID and secret. Add `https://<your-supabase-project>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud, and add `http://localhost:3000/auth/callback` plus your production URL's `/auth/callback` under Supabase Authentication > URL Configuration > Redirect URLs.

## Production deployment

### Vercel application deployment

Import the GitHub repository `Matissy8/chatbot` into Vercel and set the Vercel project's **Root Directory** to `ai-tutor-lv`, with the **Next.js** framework preset. Enable deployments from `main`. Configure the required environment variables in Vercel Project Settings (at minimum the Supabase URL and publishable/anon key; add a newly rotated Gemini/OpenAI/Anthropic key for AI features). Once connected, pushes to `main` trigger Vercel deployments automatically.

For a manual production deploy, authenticate the Vercel CLI (`vercel login`) and run `./deploy.sh` from this project directory. To also add a custom domain to the linked Vercel project, pass its hostname, for example `./deploy.sh example.com`. The script never configures registrar DNS; use the records Vercel displays under **Settings → Domains**. Set `VERCEL_PROJECT_NAME` if the linked Vercel project is not named `chatbot`.

### Supabase database deployment

The repository includes `.github/workflows/supabase-schema.yml`. To enable automatic schema application when the SQL files change, add a repository Actions secret named `SUPABASE_DB_URL` containing the Supabase PostgreSQL **Session pooler** connection URI (use the connection details from the Supabase dashboard; do not commit it or use the service-role key). The workflow runs the four idempotent SQL files in order on pushes to `main` and can also be started manually from GitHub Actions. If the secret is not configured, the workflow skips database deployment.

Set Vercel environment variables separately in Vercel; GitHub Actions secrets are not automatically copied to Vercel.

## Notes

The app requires Supabase configuration for authentication. AI chat and material generation use Gemini, OpenAI, or Anthropic when a valid provider key is configured; otherwise educational text chat and teacher materials fall back to local templates. Homework photo analysis requires a valid provider key.
