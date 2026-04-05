# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a spaced repetition mobile app (StudyBrain) built with Expo.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (for API server)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Mobile App (StudyBrain)

A spaced repetition study app at `artifacts/mobile/`.

### Features
- Create/edit/delete notes with multi-image support
- Custom revision intervals (Classic: [1,3,7,15,30], Aggressive, Relaxed)
- Category-based organization (default categories seeded on first launch)
- Daily streak tracking
- Revision session flow (complete/skip)
- 14-day activity chart in Analytics tab
- Category breakdown analytics
- Offline-first with AsyncStorage

### App Architecture
- State: React Context (`context/AppContext.tsx`) + AsyncStorage (`lib/storage.ts`)
- Navigation: Expo Router (file-based) with tab layout
- Tabs: Home (Dashboard), Notes, Analytics, Settings
- Modal screens: Revision session, Add Note, Note Detail

### Colors (constants/colors.ts)
- Primary: `#4f46e5` (indigo) / dark: `#818cf8`
- Background: `#f8fafc` / dark: `#0f172a`
- Card: `#ffffff` / dark: `#1e293b`
- Success: `#10b981`, Warning: `#f59e0b`, Destructive: `#ef4444`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run mobile app

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
