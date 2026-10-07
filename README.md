AI Tutor Latvija
AI-first educational platform designed for Latvian schools, music schools, music high schools, teachers, and independent learners.

Features
Chat-first learning experience
User onboarding and profile setup
XP, levels, streaks, and achievements
Leaderboard and progress tracking
Practice modules and teacher tools
AI provider abstraction for OpenAI / Anthropic
Responsive dark-light UI
Stack
Next.js 16
React 19
TypeScript
Tailwind CSS
shadcn/ui patterns
Supabase Auth with cookie-backed server sessions
RLS-protected user profiles and first-run onboarding
Local setup
Install dependencies: npm install
Copy environment variables: cp .env.example .env.local
Add the Supabase project URL and anon/publishable key to .env.local. For Gemini, create a key in Google AI Studio and set GEMINI_API_KEY; OpenAI and Anthropic are also supported.
In the Supabase SQL Editor, run supabase/schema.sql.
For immediate signup-to-onboarding testing, disable email confirmation in Supabase Auth; otherwise users must confirm their email before signing in.
Start the app: npm run dev
Open http://localhost:3000
Environment variables
See .env.example.

Database setup
Run supabase/schema.sql, then supabase/schema_chat_xp.sql, then supabase/schema_practice.sql. These create profiles/auth setup, private chat history and XP awarding, and the private question bank plus secure one-time practice XP. Do not expose a Supabase service-role key in client code; the app uses the public anon/publishable key with RLS.

Production deployment
Deploy to Vercel and configure the Supabase environment variables in project settings.

Notes
The app requires Supabase configuration for authentication. AI chat and material generation use Gemini, OpenAI, or Anthropic when a valid provider key is configured; otherwise educational text chat and teacher materials fall back to local templates. Homework photo analysis requires a valid provider key.
