# Maestro

Personalized AI learning platform for Latvian schools, music schools, teachers, and independent learners.

## Features

- Chat-first learning experience
- User onboarding and profile setup
- XP, levels, streaks, and achievements
- Quick music-theory quizzes with server-verified answers and XP
- Music flashcards, a sequential learning path, and in-chat note/chord playback
- Leaderboard and progress tracking
- Practice modules and teacher tools
- Latvian, English, and Russian interface with a profile-saved language preference
- Teaching-material analysis for images, PDF, DOCX, TXT, and Markdown files
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
3. Add the Supabase project URL, anon/publishable key, and server-only `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`. For Gemini, create a key in Google AI Studio and set `GEMINI_API_KEY`; OpenAI and Anthropic are also supported.
   To temporarily enable a non-persistent guest preview, set `NEXT_PUBLIC_ENABLE_GUEST_MODE=true` and restart the dev server. Remove the flag or set it to `false` when ready for authenticated-only access. Guest chat uses the local response fallback, practice scores remain in the browser, and teacher tools use local templates; guest activity is not saved and earns no XP. Photo AI analysis requires an authenticated account.
4. In the Supabase SQL Editor, run `supabase/schema_full.sql`, `supabase/schema_chat_compat.sql`, `supabase/schema_learning_features.sql`, then `supabase/schema_leaderboard.sql`. The reservation RPCs `try_reserve_daily_usage`, `confirm_daily_usage`, and `cancel_daily_usage` must also be installed.
5. For immediate signup-to-onboarding testing, disable email confirmation in Supabase Auth; otherwise users must confirm their email before signing in.
6. Start the app:
   npm run dev
7. Open http://localhost:3000

## Environment variables

See .env.example.

## Database setup

For manual setup or to update an existing database, run `supabase/schema_full.sql`, `supabase/schema_chat_compat.sql`, `supabase/schema_learning_features.sql`, then `supabase/schema_leaderboard.sql` in the Supabase SQL Editor. The compatibility migration adds the `chats.subject`, `chats.updated_at`, and `profiles.plan` fields without deleting existing chat or usage data. Chat requests use the server-only `SUPABASE_SERVICE_ROLE_KEY` to reserve usage through `try_reserve_daily_usage`, then confirm or cancel each reservation; configure that key in `.env.local` and the Vercel server environment. Never expose or commit it or use a `NEXT_PUBLIC_` name. Free users have 20 questions per day; failed usage lookups display an unavailable count rather than zero. The learning schema installs protected quiz attempts, per-answer XP awards, Latvia-time-zone activity streaks, flashcard progress, and sequential learning-path progress. The leaderboard schema returns only ranked display names, XP, and streaks; the page refreshes these rankings every 60 seconds. The GitHub Actions workflow applies the schema files individually in dependency order.

### Interface language

Users can switch the interface between Latvian, English, and Russian from the sidebar or Settings page. The choice updates immediately, is saved in browser storage for signed-out/guest sessions, and is saved to `profiles.language` for signed-in users. Run `supabase/schema_full.sql` against an existing project so the profile language constraint accepts all three values.

### Plans and daily limit

Free users get 20 AI chat questions per day (the day rolls over at midnight in Latvia); PRO users are unlimited. The server reserves a question before contacting Gemini, confirms it only after a successful response, and cancels it on failure. Clients cannot change their own plan. Until payments are connected, set a user's plan manually in the Supabase SQL Editor: `update public.profiles set plan = 'pro' where id = '<user id>';`. Keep the reservation RPC's limit and `FREE_DAILY_QUESTION_LIMIT` in `lib/plans.ts` aligned.

### Google sign-in

The "Turpināt ar Google" button appears automatically once Google is enabled in Supabase. Create an OAuth client in Google Cloud Console, then in Supabase go to Authentication > Providers > Google and enter its client ID and secret. Add `https://<your-supabase-project>.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud, and add `http://localhost:3000/auth/callback` plus your production URL's `/auth/callback` under Supabase Authentication > URL Configuration > Redirect URLs.

## Production deployment

### Vercel application deployment

Import the GitHub repository `Matissy8/chatbot` into Vercel and set the Vercel project's **Root Directory** to `ai-tutor-lv`, with the **Next.js** framework preset. Enable deployments from `main`. Configure the required environment variables in Vercel Project Settings (Supabase URL and publishable/anon key, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` for Gemini). Never prefix the service-role key with `NEXT_PUBLIC_` or commit it. Once connected, pushes to `main` trigger Vercel deployments automatically.

For a manual production deploy, authenticate the Vercel CLI (`vercel login`) and run `./deploy.sh` from this project directory. To also add a custom domain to the linked Vercel project, pass its hostname, for example `./deploy.sh example.com`. The script never configures registrar DNS; use the records Vercel displays under **Settings → Domains**. Set `VERCEL_PROJECT_NAME` if the linked Vercel project is not named `chatbot`.

### Supabase database deployment

The repository includes `.github/workflows/supabase-schema.yml`. To enable automatic schema application when the SQL files change, add a repository Actions secret named `SUPABASE_DB_URL` containing the Supabase PostgreSQL **Session pooler** connection URI (use the connection details from the Supabase dashboard; do not commit it or use the service-role key). The workflow applies the schema files in dependency order on pushes to `main` and can also be started manually from GitHub Actions. If the secret is not configured, the workflow skips database deployment.

Set Vercel environment variables separately in Vercel; GitHub Actions secrets are not automatically copied to Vercel.

## Notes

The app requires Supabase configuration for authentication. AI chat and material generation use Gemini, OpenAI, or Anthropic when a valid provider key is configured; otherwise educational text chat and teacher materials fall back to local templates. Uploaded learning materials (images, PDF, DOCX, TXT, or Markdown) are sent to the configured AI provider for analysis and are not persisted by the app; the provider's own data-handling policy applies.
