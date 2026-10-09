# AI Tutor Latvija

AI-first educational platform designed for Latvian schools, music schools, music high schools, teachers, and independent learners.

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
4. In the Supabase SQL Editor, run `supabase/schema.sql`.
5. For immediate signup-to-onboarding testing, disable email confirmation in Supabase Auth; otherwise users must confirm their email before signing in.
6. Start the app:
   npm run dev
7. Open http://localhost:3000

## Environment variables

See .env.example.

## Database setup

Run `supabase/schema.sql`, then `supabase/schema_chat_xp.sql`, then `supabase/schema_practice.sql`. These create profiles/auth setup, private chat history and XP awarding, and the private question bank plus secure one-time practice XP. Do not expose a Supabase service-role key in client code; the app uses the public anon/publishable key with RLS.

## Production deployment

### Vercel application deployment

Import the GitHub repository `Matissy8/chatbot` into Vercel and set the Vercel project's **Root Directory** to `ai-tutor-lv`. Enable deployments from the `main` branch. Configure the required environment variables in Vercel Project Settings (at minimum the Supabase URL and publishable/anon key; add a newly rotated Gemini/OpenAI/Anthropic key for AI features). Once connected, pushes to `main` trigger Vercel deployments automatically.

### Supabase database deployment

The repository includes `.github/workflows/supabase-schema.yml`. To enable automatic schema application when the SQL files change, add a repository Actions secret named `SUPABASE_DB_URL` containing the Supabase PostgreSQL **Session pooler** connection URI (use the connection details from the Supabase dashboard; do not commit it or use the service-role key). The workflow runs the three idempotent SQL files in order on pushes to `main` and can also be started manually from GitHub Actions. If the secret is not configured, the workflow skips database deployment.

Set Vercel environment variables separately in Vercel; GitHub Actions secrets are not automatically copied to Vercel.

## Notes

The app requires Supabase configuration for authentication. AI chat and material generation use Gemini, OpenAI, or Anthropic when a valid provider key is configured; otherwise educational text chat and teacher materials fall back to local templates. Homework photo analysis requires a valid provider key.
