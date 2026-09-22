# Shipwrights AMA

Anonymous "ask me anything" for the crew. Anyone can send a question with no
name or login. The team answers from a control room, signed with their own
name, and every answer shows up publicly in the log on the homepage.

## .env:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5442/shipwrights_ama"
ADMIN_PASSCODE="" (shared team passcode, only needed to join after the first account exists)
ADMIN_SESSION_SECRET="" (openssl rand -hex 32)
```

## structure

```
src/app/page.tsx - public homepage: ask form + the answered log
src/app/actions.ts - server actions: submit question, register/login, answer, moderate
src/app/admin/ - login, register, and the control room dashboard
src/lib/auth.ts - signed session cookies
src/lib/password.ts - scrypt password hashing
src/middleware.ts - guards /admin/dashboard
prisma/schema.prisma - db schema (Question, Answer, Admin)
```

## tech

```
- next.js 14 (app router, server actions)
- prisma + postgres
- tailwind
- typescript
```

## to run

```
just dev
```

Starts a local Postgres in Docker (port 5442), applies migrations, and runs
`next dev --port 3070`. Run `just` with no arguments for the full command
list (`db-up`, `db-down`, `db-reset`, `studio`, `migrate`, `build`, `check`).

## accounts

The **first** account created at `/admin/register` needs no passcode and
becomes the bootstrap admin. Everyone after that needs `ADMIN_PASSCODE` to
join — there's no separate admin role beyond that; anyone with an account can
answer questions under their own name.

## deploying

This is a plain Docker build (`Dockerfile`, standalone Next.js output,
listens on `$PORT`, defaults to 3070). It needs its own Postgres database —
unlike the rest of this repo, `DATABASE_URL` here is Postgres, not MySQL.
After the container's up, run `prisma migrate deploy` once against it to
apply `prisma/migrations/`, then open `/admin` — a fresh database sends you
straight to `/admin/register` to create the bootstrap account.
