# Pulse

A personal dashboard for work, development, and everyday life. Got tired of opening multiple apps every morning just to check GitHub, Steam, the weather, and other daily tools. So I decided to build one place for everything for myself, cause why not?

Pulse is built for one user which is me. It's not meant to be deployed or run by anyone else, though feel free to poke around the code.

## Live widgets

- GitHub activity and repository insights
- Steam recently played games
- Weather
- Tasks, Notes, Notebook
- Clock/Greeting/Quote

## How it's built

- Frontend: React 19, Next.js 16 (Turbopack), Tailwind CSS v4
- Auth: Auth.js v5 (database sessions, Supabase adapter)
- Data: Supabase (@supabase/supabase-js, no ORM), validated with Zod at the boundary
- Backend: Next.js Server Actions, plus a single /api/cron route
- Monorepo: Turborepo, with each widget shipped as a self-contained package
- Hosting: Vercel
- CI: GitHub Actions — lint/typecheck/test/build on every push, plus a 30-minute cron job that refreshes widget data

## About this project

I'm building Pulse in my spare time, using AI to help me along the way. AI helps me build faster, but it also occasionally suggests questionable ideas. Those usually don't make it into Pulse.

Every feature goes through plenty of "this looked better in my head" moments before making it into Pulse.

My goal isn't just to build an app, but to see what's possible when building software with AI.

Built with ☕, Next.js, React, TypeScript, Tailwind CSS, Auth.js, Supabase, Turborepo, Vercel, AI and the occasional existential debugging session.
