# Warung-Astro

Lightweight e-commerce for a warung makan built with Astro + React, Supabase (Postgres + Auth + Storage), and Midtrans (QRIS). Ready to deploy on Vercel.

## Overview
- Frontend: Astro (React components)
- Backend & DB: Supabase (Postgres + Realtime + Storage)
- Payments: Midtrans (QRIS)
- Hosting: Vercel

## Prerequisites
- Node.js 18+ (or compatible)
- A Supabase project with database and Storage enabled
- Midtrans account (server key)
- Vercel account for deployment

## Environment variables
Create these env vars in your local `.env` and in Vercel project settings.

- `PUBLIC_SUPABASE_URL` — Supabase project URL (eg. https://xyz.supabase.co)
- `PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service_role key (server only)
- `MIDTRANS_SERVER_KEY` — Midtrans server key (secret)

Optional (local testing):
- `NODE_ENV` — `development` or `production`

Notes:
- Do NOT commit `SUPABASE_SERVICE_ROLE_KEY` or `MIDTRANS_SERVER_KEY` to source control.

## Quick local setup
1. Install dependencies

```bash
npm install
```

2. Create `.env` in project root with the vars above (use Vercel values).

3. Run dev server

```bash
npm run dev
```

The dev server serves Astro pages and API routes under `src/pages/api`.

## Database migration
Run the SQL migration file to create initial schema. You can run it in Supabase SQL Editor or via `psql`.

Using Supabase SQL Editor:
- Open your Supabase project → SQL Editor → New Query
- Paste the contents of `supabase/migrations/001_init.sql` and run.

Using `psql` (example):

```bash
# replace <DATABASE_URL> with your Supabase connection string
pSQL <DATABASE_URL> -f supabase/migrations/001_init.sql
```

## Create Supabase Storage bucket
1. In Supabase dashboard → Storage → Create bucket
2. Name: `menu-images`
3. Public: Yes (or No and use signed URLs in your app)

## Create an admin user
1. In Supabase dashboard → Authentication → Users → Create User
2. Set email/password for the admin account.

## Midtrans setup
1. Get your `MIDTRANS_SERVER_KEY` (server key) from Midtrans dashboard.
2. Configure Midtrans webhook to point to:

```
https://<YOUR_DOMAIN>/api/midtrans/webhook
```

Notes: webhook implementation currently expects `order_id` formatted as `pesanan-<id>`.

## Storage and image uploads
- Admin `menu` page uploads images via `/api/upload-image` which stores to `menu-images` bucket using the service role key. Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel.

## Deploy to Vercel
1. Push this repo to GitHub (or connect to Vercel via Git).
2. Create a new project in Vercel and link the repo.
3. Add the environment variables in Vercel (use the names above). Make sure `SUPABASE_SERVICE_ROLE_KEY` and `MIDTRANS_SERVER_KEY` are set as protected/secret values.
4. Deploy. Vercel will build the Astro site and expose API routes at `/api/*`.

## Post-deploy
- In Midtrans dashboard, set webhook to `https://<YOUR_VERCEL_DOMAIN>/api/midtrans/webhook`.
- Run the SQL migration (if not done).
- Create the `menu-images` bucket and adjust public rules.

## Useful endpoints
- Create payment: `POST /api/midtrans/create-payment`
- Webhook: `POST /api/midtrans/webhook`
- Payment status: `GET /api/midtrans/status?id=<pesananId>`
- Upload image: `POST /api/upload-image` (expects JSON `{ filename, base64 }`)
- Orders CSV export: `GET /api/reports/orders?from=YYYY-MM-DD&to=YYYY-MM-DD`

## Next recommended tasks
- Add Midtrans signature verification in `src/pages/api/midtrans/webhook.js` for security.
- Implement `meja/[id]` public page (QR entry to catalog).
- Add unit tests / E2E tests for payments and webhook flows.

## Support
If you want, I can:
- Add Midtrans signature verification to the webhook.
- Implement the public `meja/[id]` page.
- Create a CI/CD workflow for migrations.

# Astro Starter Kit: Basics

```sh
npm create astro@latest -- --template basics
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   └── favicon.svg
├── src
│   ├── assets
│   │   └── astro.svg
│   ├── components
│   │   └── Welcome.astro
│   ├── layouts
│   │   └── Layout.astro
│   └── pages
│       └── index.astro
└── package.json
```

To learn more about the folder structure of an Astro project, refer to [our guide on project structure](https://docs.astro.build/en/basics/project-structure/).

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
