import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Badge definitions (mirrors mobile lib/badges.ts)
const ALL_BADGES = [
  { id: "first_review", name: "First Step", description: "Complete your very first review", icon: "star", color: "#F59E0B", rarity: "common" },
  { id: "streak_3", name: "On Fire", description: "Achieve a 3-day study streak", icon: "zap", color: "#EF4444", rarity: "common" },
  { id: "streak_7", name: "Week Warrior", description: "Maintain a 7-day study streak", icon: "award", color: "#8B5CF6", rarity: "rare" },
  { id: "streak_14", name: "Fortnight", description: "Maintain a 14-day study streak", icon: "trending-up", color: "#06B6D4", rarity: "rare" },
  { id: "streak_30", name: "Monthly Hero", description: "Maintain a 30-day study streak", icon: "calendar", color: "#10B981", rarity: "epic" },
  { id: "streak_100", name: "Century Streak", description: "Maintain a 100-day study streak", icon: "shield", color: "#EC4899", rarity: "legendary" },
  { id: "reviews_10", name: "Getting Started", description: "Complete 10 reviews", icon: "check-circle", color: "#22C55E", rarity: "common" },
  { id: "reviews_50", name: "Reviewer", description: "Complete 50 reviews", icon: "repeat", color: "#6366F1", rarity: "common" },
  { id: "reviews_100", name: "Centurion", description: "Complete 100 reviews", icon: "target", color: "#F59E0B", rarity: "rare" },
  { id: "reviews_500", name: "Dedication", description: "Complete 500 reviews", icon: "book-open", color: "#8B5CF6", rarity: "epic" },
  { id: "reviews_1000", name: "Legend", description: "Complete 1000 reviews", icon: "cpu", color: "#EC4899", rarity: "legendary" },
  { id: "level_5", name: "Rising Scholar", description: "Reach level 5", icon: "user", color: "#22C55E", rarity: "common" },
  { id: "level_10", name: "Master Mind", description: "Reach level 10", icon: "feather", color: "#6366F1", rarity: "rare" },
  { id: "level_20", name: "Grandmaster", description: "Reach level 20", icon: "globe", color: "#EC4899", rarity: "legendary" },
  { id: "perfect_day", name: "Perfect Day", description: "Complete 10 reviews in a single day", icon: "sun", color: "#F59E0B", rarity: "rare" },
  { id: "xp_1000", name: "XP Hunter", description: "Earn 1,000 total XP", icon: "activity", color: "#6366F1", rarity: "common" },
  { id: "xp_5000", name: "XP Legend", description: "Earn 5,000 total XP", icon: "bar-chart-2", color: "#8B5CF6", rarity: "epic" },
];

// Mock leaderboard data
const MOCK_LEADERBOARD = [
  { id: "u1", name: "Priya S.", totalReviews: 312, currentStreak: 42, rank: 0 },
  { id: "u2", name: "James K.", totalReviews: 278, currentStreak: 31, rank: 0 },
  { id: "u3", name: "Meera R.", totalReviews: 245, currentStreak: 28, rank: 0 },
  { id: "u4", name: "David L.", totalReviews: 198, currentStreak: 19, rank: 0 },
  { id: "u5", name: "Ananya G.", totalReviews: 165, currentStreak: 15, rank: 0 },
  { id: "u6", name: "Tom H.", totalReviews: 142, currentStreak: 11, rank: 0 },
  { id: "u7", name: "Sarah W.", totalReviews: 118, currentStreak: 8, rank: 0 },
  { id: "u8", name: "Raj P.", totalReviews: 89, currentStreak: 6, rank: 0 },
  { id: "u9", name: "Emma B.", totalReviews: 64, currentStreak: 4, rank: 0 },
];

// GET /api/gamification/badges — return all badge definitions
router.get("/gamification/badges", (_req, res) => {
  res.json({ badges: ALL_BADGES });
});

// GET /api/gamification/leaderboard — top 10 leaderboard
// Accepts optional query: totalReviews & currentStreak to inject the real user
router.get("/gamification/leaderboard", (req, res) => {
  const userReviews = parseInt((req.query["totalReviews"] as string) ?? "0", 10);
  const userStreak = parseInt((req.query["currentStreak"] as string) ?? "0", 10);

  const withUser = [
    ...MOCK_LEADERBOARD,
    {
      id: "you",
      name: "You",
      totalReviews: userReviews,
      currentStreak: userStreak,
      rank: 0,
    },
  ]
    .sort((a, b) => b.totalReviews - a.totalReviews)
    .slice(0, 10)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

  res.json({ leaderboard: withUser });
});

// GET /api/gamification/progress — returns progress stats summary
router.get("/gamification/progress", (req, res) => {
  const totalCompleted = parseInt((req.query["totalCompleted"] as string) ?? "0", 10);
  const todayCompleted = parseInt((req.query["todayCompleted"] as string) ?? "0", 10);
  const dailyGoal = parseInt((req.query["dailyGoal"] as string) ?? "10", 10);
  const totalNotes = parseInt((req.query["totalNotes"] as string) ?? "0", 10);
  const scheduledNotes = parseInt((req.query["scheduledNotes"] as string) ?? "0", 10);

  res.json({
    daily: {
      completed: todayCompleted,
      goal: dailyGoal,
      pct: dailyGoal > 0 ? Math.min(todayCompleted / dailyGoal, 1) : 0,
      done: todayCompleted >= dailyGoal,
    },
    deck: {
      scheduled: scheduledNotes,
      total: totalNotes,
      pct: totalNotes > 0 ? Math.min(scheduledNotes / totalNotes, 1) : 0,
    },
    allTime: {
      totalCompleted,
    },
  });
});

// POST /api/gamification/review — update stats and return awarded badges
router.post("/gamification/review", (req, res) => {
  const { totalCompleted, currentStreak, todayCompleted, totalXp, level, earnedBadges } = req.body as {
    totalCompleted?: number;
    currentStreak?: number;
    todayCompleted?: number;
    totalXp?: number;
    level?: number;
    earnedBadges?: string[];
  };

  const stats = {
    totalCompleted: totalCompleted ?? 0,
    currentStreak: currentStreak ?? 0,
    todayCompleted: todayCompleted ?? 0,
    totalXp: totalXp ?? 0,
  };
  const currentLevel = level ?? 1;
  const earned = new Set(earnedBadges ?? []);

  const newBadges: typeof ALL_BADGES = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) {
      const badge = ALL_BADGES.find((b) => b.id === id);
      if (badge) newBadges.push(badge);
    }
  };

  check("first_review", stats.totalCompleted >= 1);
  check("streak_3", stats.currentStreak >= 3);
  check("streak_7", stats.currentStreak >= 7);
  check("streak_14", stats.currentStreak >= 14);
  check("streak_30", stats.currentStreak >= 30);
  check("streak_100", stats.currentStreak >= 100);
  check("reviews_10", stats.totalCompleted >= 10);
  check("reviews_50", stats.totalCompleted >= 50);
  check("reviews_100", stats.totalCompleted >= 100);
  check("reviews_500", stats.totalCompleted >= 500);
  check("reviews_1000", stats.totalCompleted >= 1000);
  check("level_5", currentLevel >= 5);
  check("level_10", currentLevel >= 10);
  check("level_20", currentLevel >= 20);
  check("perfect_day", stats.todayCompleted >= 10);
  check("xp_1000", stats.totalXp >= 1000);
  check("xp_5000", stats.totalXp >= 5000);

  res.json({ newBadges, newBadgeCount: newBadges.length });
});

export default router;
