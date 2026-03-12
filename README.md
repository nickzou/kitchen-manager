# Kitchen Manager

A full-stack kitchen management app for organizing recipes, tracking pantry stock, planning meals, and generating shopping lists.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19 + SSR)
- **Routing:** [TanStack Router](https://tanstack.com/router) (file-based)
- **Data Fetching:** [TanStack Query](https://tanstack.com/query)
- **Database:** PostgreSQL with [Drizzle ORM](https://orm.drizzle.team)
- **Auth:** [Better Auth](https://www.better-auth.com) (email/password, email verification, password reset)
- **Email:** [Nodemailer](https://nodemailer.com) via SMTP
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com)
- **Linting:** [Biome](https://biomejs.dev)
- **Testing:** [Vitest](https://vitest.dev)

## Features

- **Recipes** — Create, edit, and browse recipes with ingredients and images
- **Pantry Stock** — Track inventory with quantity units and stock logs
- **Meal Planning** — Weekly calendar with configurable meal slots
- **Shopping Lists** — Auto-generated from meal plans with date range filtering
- **Categories** — Organize recipes and products
- **User Management** — Sign up, sign in, email verification, password reset, profile editing

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 18+
- npm

### Setup

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

3. Start the database (via Docker) and run migrations:

   ```bash
   docker compose up db -d
   npm run db:push
   ```

4. Start the dev server:

   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:changeme@localhost:5432/kitchen_manager` |
| `BETTER_AUTH_SECRET` | Auth session secret (generate with `npx @better-auth/cli secret`) | — |
| `APP_URL` | Public app URL (used in email links) | `http://localhost:3000` |
| `SMTP_HOST` | SMTP server host | `smtp.ethereal.email` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username | — |
| `SMTP_PASS` | SMTP password | — |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | `false` |
| `SMTP_FROM` | Sender email address | `noreply@example.com` |

### Email Providers by Environment

- **Local dev:** [Ethereal](https://ethereal.email) — fake inbox, no real emails sent
- **Staging:** [Mailtrap](https://mailtrap.io) — catches all emails for team review
- **Production:** [Resend](https://resend.com), Postmark, or Amazon SES

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run test` | Run tests |
| `npm run lint` | Lint with Biome |
| `npm run format` | Format with Biome |
| `npm run check` | Lint + format check |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |

## Deployment

The app is containerized with Docker and deployed to a VPS. Staging and production are separate Docker Compose stacks with their own databases.

- **Staging** deploys from the `staging` branch/tag
- **Production** deploys from `latest`
