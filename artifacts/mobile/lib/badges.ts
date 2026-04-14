export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const ALL_BADGES: BadgeDef[] = [
  {
    id: "first_review",
    name: "First Step",
    description: "Complete your very first review",
    icon: "star",
    color: "#F59E0B",
    rarity: "common",
  },
  {
    id: "streak_3",
    name: "On Fire",
    description: "Achieve a 3-day study streak",
    icon: "zap",
    color: "#EF4444",
    rarity: "common",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "award",
    color: "#8B5CF6",
    rarity: "rare",
  },
  {
    id: "streak_14",
    name: "Fortnight",
    description: "Maintain a 14-day study streak",
    icon: "trending-up",
    color: "#06B6D4",
    rarity: "rare",
  },
  {
    id: "streak_30",
    name: "Monthly Hero",
    description: "Maintain a 30-day study streak",
    icon: "calendar",
    color: "#10B981",
    rarity: "epic",
  },
  {
    id: "streak_100",
    name: "Century Streak",
    description: "Maintain a 100-day study streak",
    icon: "shield",
    color: "#EC4899",
    rarity: "legendary",
  },
  {
    id: "reviews_10",
    name: "Getting Started",
    description: "Complete 10 reviews",
    icon: "check-circle",
    color: "#22C55E",
    rarity: "common",
  },
  {
    id: "reviews_50",
    name: "Reviewer",
    description: "Complete 50 reviews",
    icon: "repeat",
    color: "#6366F1",
    rarity: "common",
  },
  {
    id: "reviews_100",
    name: "Centurion",
    description: "Complete 100 reviews",
    icon: "target",
    color: "#F59E0B",
    rarity: "rare",
  },
  {
    id: "reviews_500",
    name: "Dedication",
    description: "Complete 500 reviews",
    icon: "book-open",
    color: "#8B5CF6",
    rarity: "epic",
  },
  {
    id: "reviews_1000",
    name: "Legend",
    description: "Complete 1000 reviews",
    icon: "cpu",
    color: "#EC4899",
    rarity: "legendary",
  },
  {
    id: "level_5",
    name: "Rising Scholar",
    description: "Reach level 5",
    icon: "user",
    color: "#22C55E",
    rarity: "common",
  },
  {
    id: "level_10",
    name: "Master Mind",
    description: "Reach level 10",
    icon: "feather",
    color: "#6366F1",
    rarity: "rare",
  },
  {
    id: "level_20",
    name: "Grandmaster",
    description: "Reach level 20",
    icon: "globe",
    color: "#EC4899",
    rarity: "legendary",
  },
  {
    id: "perfect_day",
    name: "Perfect Day",
    description: "Complete 10 reviews in a single day",
    icon: "sun",
    color: "#F59E0B",
    rarity: "rare",
  },
  {
    id: "xp_1000",
    name: "XP Hunter",
    description: "Earn 1,000 total XP",
    icon: "activity",
    color: "#6366F1",
    rarity: "common",
  },
  {
    id: "xp_5000",
    name: "XP Legend",
    description: "Earn 5,000 total XP",
    icon: "bar-chart-2",
    color: "#8B5CF6",
    rarity: "epic",
  },
];

export function checkNewBadges(
  stats: {
    currentStreak: number;
    totalCompleted: number;
    todayCompleted: number;
    totalXp: number;
  },
  level: number,
  earnedBadges: string[]
): string[] {
  const earned = new Set(earnedBadges);
  const newBadges: string[] = [];

  const check = (id: string, condition: boolean) => {
    if (condition && !earned.has(id)) newBadges.push(id);
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
  check("level_5", level >= 5);
  check("level_10", level >= 10);
  check("level_20", level >= 20);
  check("perfect_day", stats.todayCompleted >= 10);
  check("xp_1000", stats.totalXp >= 1000);
  check("xp_5000", stats.totalXp >= 5000);

  return newBadges;
}

export function getBadgeDef(id: string): BadgeDef | undefined {
  return ALL_BADGES.find((b) => b.id === id);
}

export const RARITY_COLORS: Record<BadgeDef["rarity"], string> = {
  common: "#64748B",
  rare: "#6366F1",
  epic: "#8B5CF6",
  legendary: "#F59E0B",
};
