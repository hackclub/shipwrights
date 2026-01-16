# Hack Club Shipwrights Team's Crew list

The list of Shipwrights crew is automatically updated via fetching details from the main Shipwrights database.

## .env:

```
DATABASE_URL=""
DIRECT_DATABASE_URL="" (optional)
SLACK_BOT_TOKEN="xoxb-"
```

## structure

```
src/app/page.tsx - main page with crew list
src/lib/db.ts - prisma setup
src/lib/slack.ts - slack api stuff
prisma/schema.prisma - db schema
```

## tech

```
- next.js 15
- prisma & accelerate
- tailwind
- typescript
```

## to run:

```
pnpm dev
or
pnpm build && pnpm start
```
