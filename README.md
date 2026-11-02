# Kanban Task Board

A Kanban-style task board built with React, TypeScript, and Supabase. Each visitor gets an anonymous guest account, and Row Level Security makes sure they only ever see their own tasks.

## Stack

- **Frontend:** Vite, React 19, TypeScript, Tailwind CSS v4, TanStack Query
- **Backend:** Supabase (Postgres, anonymous Auth, RLS). The browser talks to Supabase directly, with no custom API.
- **Hosting:** Vercel

## Run locally

1. `npm install`
2. `cp .env.example .env.local`, then fill in your Supabase project URL and **publishable (anon)** key.
3. Apply the schema in `supabase/migrations/` to your project, either with the SQL editor or `supabase db push`.
4. In the Supabase dashboard, open **Authentication → Sign In / Providers** and turn on **Allow anonymous sign-ins**.
5. `npm run dev`

## Database

The full schema, including RLS policies and activity-log triggers, is in [`supabase/migrations`](supabase/migrations).
