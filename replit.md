# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains **Recallify** — a mobile-first spaced repetition app built with Expo/React Native.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Build**: esbuild (CJS bundle)

## Mobile App (Recallify)

A spaced repetition study app at `artifacts/mobile/`.

### Features
- Create/edit/delete notes with multi-image support
- **Revision Modes**: 
  - Custom intervals: CLASSIC / AGGRESSIVE / RELAXED presets (25 steps each, starting at day 0)
  - Smart Learning (SM-2 algorithm): adapts to recall quality (Hard/Good/Easy ratings)
- Category-based organization (default categories seeded on first launch)
- Daily streak tracking + streak milestone bonuses (+50 XP at 3,7,14,30,60,90,100,180,365-day streaks)
- Revision session flow (complete/skip) with floating +XP animation
- **Scholar AI tutor**: GPT-4o powered, conversation memory (last 5 exchanges), text + image support, animated typing dots, structured JSON responses
- **Gamification (full system)**:
  - XP system, level progression (10 level names), share streak (+10 XP), category completion (+100 XP)
  - **17 Badges** across 4 rarities (common/rare/epic/legendary): First Step, On Fire, Week Warrior, Fortnight, Monthly Hero, Century Streak, Getting Started, Reviewer, Centurion, Dedication, Legend, Rising Scholar, Master Mind, Grandmaster, Perfect Day, XP Hunter, XP Legend
  - Badges awarded automatically after each review in `updateStreak()` via `checkNewBadges()` in `lib/badges.ts`
  - New badge toast banner on Home tab when badge is unlocked, dismissable
  - **Leaderboard** on Analytics tab: user ranked among 9 deterministic mock users sorted by total reviews (top 10), 🥇🥈🥉 medals for top 3
  - **Daily Progress Bar** on Home tab: shows today's reviews / daily goal (default 10)
  - **Deck Progress Bar** on Home tab: shows notes with revision plans / total notes
  - **Badges Grid** on Analytics tab: all 17 badges shown (earned highlighted with color, locked grayed)
- **Vacation Mode**: shift all revision dates by vacation duration to protect streak
- **Holiday Rest Mode**: push today's due cards to tomorrow (single rest day)
- **Custom Notification Time**: daily reminder at user-chosen time (default 9:00 AM)
- Push notifications via expo-notifications (default enabled on first launch)
- 14-day activity chart in Analytics tab
- Category breakdown analytics
- Offline-first with AsyncStorage only

### App Architecture
- State: React Context (`context/AppContext.tsx`) + AsyncStorage (`lib/storage.ts`)
- Navigation: Expo Router (file-based) with tab layout
- Tabs: Home (Dashboard), Review, Notes, Scholar, Analytics, Settings
- Modal screens: Revision session, Add Note, Note Detail

### Key Files
- `lib/storage.ts` — All data operations, SM-2 algorithm, vacation mode, XP/streak milestones
- `context/AppContext.tsx` — Global state, markCompleted returns XP earned
- `components/RevisionCard.tsx` — SM-2 rating UI (Hard/Good/Easy) + progress + custom mode
- `components/IntervalPicker.tsx` — Mode toggle (Simple/Smart) + CLASSIC/AGGRESSIVE/RELAXED presets
- `components/FloatingXP.tsx` — Animated +XP badge on revision complete
- `app/(tabs)/settings.tsx` — Categories, notifications, Breaks & Rest section
- `app/(tabs)/scholar.tsx` — AI tutor with conversation history + typing animation
- `lib/xp.ts` — XP thresholds, level names, progress calculation

### Design System — Premium Dark UI (always forced dark)
- Background: `#0F172A`, Card: `#1E293B`, Muted: `#162032`
- Primary: `#6366F1` (indigo), Accent/Success: `#22C55E`, Warning: `#F59E0B`, Destructive: `#EF4444`
- Text: `#F8FAFC`, Muted text: `#94A3B8`, Border: `#334155`
- Radius: 16px globally
- Gradients: `#6366F1 → #8B5CF6` (primary), `#22C55E → #16A34A` (success)
- Shadows use accent color as `shadowColor` for glow effect
- `hooks/useColors.ts` always returns the dark palette (forced dark mode)

### Reusable UI Components
- `components/ui/PremiumCard.tsx` — card with glow shadow + border
- `components/ui/PremiumButton.tsx` — gradient/solid/ghost/danger variants
- `components/StatCard.tsx` — icon + value + label card with colored shadow
- `components/NoteCard.tsx` — note preview with category accent bar, due badge, image strip
- `components/StreakBadge.tsx` — fire icon + count badge (orange)
- `components/EmptyState.tsx` — icon ring + title + description + gradient action button

## API Server

At `artifacts/api-server/`. Express server at port 8080.

- `POST /api/tutor/ask` — Scholar AI endpoint (ChatGPT gpt-5.2), accepts `{ question, imageBase64?, noteContext?, history? }`. Returns structured JSON with explanation, steps, summary, followUp questions.
- `GET /api/gamification/badges` — returns all 17 badge definitions
- `GET /api/gamification/leaderboard?totalReviews=&currentStreak=` — returns top-10 leaderboard with user injected
- `GET /api/gamification/progress?totalCompleted=&todayCompleted=&dailyGoal=&totalNotes=&scheduledNotes=` — returns daily + deck progress
- `POST /api/gamification/review` — accepts user stats, returns newly earned badges

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/mobile run dev` — run mobile app
