# CheckIN

Arabic RTL visitor check-in dashboard built with React, Vite, Tailwind CSS, the Alexandria Arabic font, and Supabase realtime sync.

The responsive layout is optimized for iPad portrait and landscape, with tablet grids, large touch targets, and safe-area support.

The interface displays Arabic names only; email addresses are retained internally as stable Supabase record keys.

Reception staff can add an organization from the dashboard by entering its Arabic name, assessment date, and appointment time. Added organizations and their attendance state are stored in Supabase and synchronized across devices.

## Run locally

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env`.
3. Add your Supabase project URL and anon key to `.env`.
4. In Supabase SQL Editor, run `supabase/schema.sql`. It is safe to run again when upgrading an existing deployment; it creates the new `entities` table and refreshes the required policies.
5. Start the app: `npm run dev`

## Deploy

Deploy the folder to Vercel, Netlify, or Cloudflare Pages with:

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

Never put the Supabase service-role key in this frontend. The included RLS policies allow anyone with the deployed URL to read and change check-ins or add organizations, matching the original shared-dashboard behavior. Add authentication and tighten the policies before publishing the app to a broadly accessible URL.
