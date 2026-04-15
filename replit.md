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
- **Custom Notification Time**: daily reminder at user-chosen time (default 9:00 AM)
- Push notifications via expo-notifications (default enabled on first launch)
- 14-day activity chart in Analytics tab
- Category breakdown analytics
- Offline-first with AsyncStorage; Firebase for cloud auth + notes

### Firebase Integration
- **Auth**: Email/password signup/login via Firebase Authentication; persistent sessions via AsyncStorage
- **Google Sign-In**: Implemented via `expo-web-browser` OAuth flow; requires `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` env var set to the Firebase project's Web OAuth 2.0 client ID
- **Firestore**: collections — `users/{uid}`, `notes/{noteId}`, `reviews/{reviewId}`
- **Security**: Firestore Security Rules enforce `request.auth.uid == resource.data.userId`
- **API key**: `GOOGLE_API_KEY` secret forwarded as `EXPO_PUBLIC_FIREBASE_API_KEY` in the dev script
- **Config**: `app.config.js` (replaces `app.json`); `lib/firebase.ts`; `lib/firestore.ts`
- **Auth Context**: `context/AuthContext.tsx` — provides `user`, `signIn`, `signUp`, `signInWithGoogle`, `signOut`
- **Auth Gate**: `app/(auth)/login.tsx` shown when user is not logged in; `app/_layout.tsx` handles redirect

### Firestore Schema (subcollection architecture — designed for 20M+ users)
```
users/{uid}                    — profile doc (upsertUserProfile)
users/{uid}/notes/{noteId}     — notes (real-time via subscribeToNotes)
users/{uid}/reviews/{reviewId} — review schedules
users/{uid}/stats              — aggregated stats (syncStats / getCloudStats)
```
All data is scoped under the user's UID: no cross-user queries, no composite indexes, trivial security rules.

### Firestore API (lib/firestore.ts)
- `upsertUserProfile(uid, email, displayName?)` — merge upsert, safe on every login
- `subscribeToNotes(uid, onData, onError)` — real-time onSnapshot, returns unsubscribe fn; limited to 200 most-recent docs
- `addCloudNote(uid, {title, content, categoryId})` — returns new doc ID
- `updateCloudNote(uid, noteId, updates)` — partial update with updatedAt
- `deleteCloudNote(uid, noteId)` — hard delete
- `getNotesPage(uid, pageSize, cursor?)` — cursor-based pagination for large collections
- `batchSyncNotes(uid, notes[])` — bulk upsert in 490-op Firestore batches
- `scheduleReview(uid, noteId, date)` — add review doc
- `syncStats(uid, stats)` / `getCloudStats(uid)` — cloud stats persistence
- `deleteUserProfile(uid)` — delete profile doc (subcollections cleaned by Cloud Function in prod)

### Hooks (lib/hooks/)
- `useCloudNotes(userId)` — subscribes to real-time Firestore notes; returns `{notes, isLoading, error}` with friendly error messages
- `useConnectionState()` — browser online/offline events on web; returns boolean

### Security Rules (firestore.rules)
Deploy with: `firebase deploy --only firestore:rules`
All paths require `request.auth.uid == userId`. Note writes validated for `title`, `content`, `updatedAt` shape.

### App Architecture
- Auth: `AuthProvider` wraps everything; redirects unauthenticated users to `/(auth)/login`
- State: React Context (`context/AppContext.tsx`) + AsyncStorage (`lib/storage.ts`)
- Navigation: Expo Router (file-based) with tab layout
- Tabs: Home (Dashboard), Revise, Notes, Exam Mode, Analytics, Settings
- Modal screens: Revision session, Add Note, Note Detail

### Key Files
- `lib/storage.ts` — All local data operations, XP/streak milestones
- `lib/firebase.ts` — Firebase app + auth + Firestore initialization
- `lib/firestore.ts` — Cloud CRUD: createUserProfile, saveNote, getUserNotes, scheduleReview
- `context/AuthContext.tsx` — Firebase auth state, signIn/signUp/signInWithGoogle/signOut
- `context/AppContext.tsx` — Global local state, markCompleted returns XP earned
- `app/(auth)/login.tsx` — Login + Sign Up screen (tab-toggled, single file)
- `app/(tabs)/settings.tsx` — Account section (signed-in email + Sign Out), categories, notifications
- `components/FloatingXP.tsx` — Animated +XP badge on revision complete
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
