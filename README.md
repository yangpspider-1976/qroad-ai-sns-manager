# QROAD AI SNS Manager

Internal MVP dashboard for AI-assisted social media operations across Facebook, Instagram, and TikTok.

The app is built around a safe workflow: AI drafts content, humans review and approve it, then publishing runs through mock mode first. Live Meta and TikTok adapters are placeholders until OAuth, permissions, app review, and secure token storage are configured.

## Stack

- Next.js, React, TypeScript
- Tailwind CSS v4 design tokens copied from the provided operational dashboard standard
- Prisma with SQLite locally and Turso/libSQL for hosted deployments
- Zod validation
- Vitest tests
- Mock AI and mock publisher adapters

## Local Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:3000`.

## Database

Local development uses SQLite at `prisma/dev.db` because it can run without installing a database server on the workstation. Hosted deployments can use Turso/libSQL through Prisma's libSQL adapter.

```bash
npm run prisma:generate
npm run db:setup
npm run seed
```

The app now persists workspaces, brand profiles, content briefs, post drafts, approvals, publish jobs, publish logs, media assets, metrics, and audit logs in the local database.

For Turso, create a database in the Turso dashboard, then set these environment variables locally and in Vercel:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

After the variables are available, initialize and seed the hosted database:

```bash
npm run db:setup
npm run seed
```

Note: `prisma migrate dev` currently fails in this Windows/Node 24 environment with a Prisma schema-engine error even though `prisma validate` passes. `npm run db:setup` applies the equivalent schema from `scripts/setup-db.ts` to either local SQLite or Turso, depending on the environment variables.

## Useful Commands

```bash
npm run typecheck
npm test
npm run worker
npm run worker -- --watch
```

## Safety Defaults

- `MOCK_PUBLISHING=true`
- `REQUIRE_APPROVAL_BEFORE_PUBLISH=true`
- No plain-text tokens should be stored or logged.
- No password-based posting, browser automation, scraping, personal profile automation, or bulk DM automation.
- Meta and TikTok live publishing are disabled by placeholder adapters until official API setup is complete.

## Implemented MVP Surface

- Dashboard shell with mock mode warning
- Workspaces and brand profile settings
- AI Content Studio using structured mock JSON generation
- Editable draft cards with quality scores and risk warnings
- Approval queue
- Calendar scheduling guard
- Asset/designer brief previews
- Mock engagement inbox
- Reports with mock metrics and recommendations
- Health, AI generation, mock publish, OAuth placeholder, and webhook placeholder API routes
- Prisma schema covering required entities
- Seed and worker scripts
- Unit tests for AI output, approval guards, and mock publishing
