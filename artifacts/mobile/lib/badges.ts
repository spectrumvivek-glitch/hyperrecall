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
    description: "Achieve a 5-day study streak",
    icon: "zap",
    color: "#EF4444",
    rarity: "common",
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintain a 10-day study streak",
    icon: "award",
    color: "#8B5CF6",
    rarity: "rare",
  },
  {
    id: "streak_14",
    name: "Fortnight",
    description: "Maintain a 21-day study streak",
    icon: "trending-up",
    color: "#06B6D4",
    rarity: "rare",
  },
  {
    id: "streak_30",
    name: "Monthly Hero",
    description: "Maintain a 45-day study streak",
    icon: "calendar",
    color: "#10B981",
    rarity: "epic",
  },
  {
    id: "streak_100",
    name: "Century Streak",
    description: "Maintain a 150-day study streak",
    icon: "shield",
    color: "#EC4899",
    rarity: "legendary",
  },
  {
    id: "reviews_10",
    name: "Getting Started",
    description: "Complete 25 reviews",
    icon: "check-circle",
    color: "#22C55E",
    rarity: "common",
  },
  {
    id: "reviews_50",
    name: "Reviewer",
    description: "Complete 100 reviews",
    icon: "repeat",
    color: "#6366F1",
    rarity: "common",
  },
  {
    id: "reviews_100",
    name: "Centurion",
    description: "Complete 250 reviews",
    icon: "target",
    color: "#F59E0B",
    rarity: "rare",
  },
  {
    id: "reviews_500",
    name: "Dedication",
    description: "Complete 750 reviews",
    icon: "book-open",
    color: "#8B5CF6",
    rarity: "epic",
  },
  {
    id: "reviews_1000",
    name: "Legend",
    description: "Complete 2,000 reviews",
    icon: "cpu",
    color: "#EC4899",
    rarity: "legendary",
  },
  {
    id: "level_5",
    name: "Rising Scholar",
    description: "Reach level 8",
    icon: "user",
    color: "#22C55E",
    rarity: "common",
  },
  {
    id: "level_10",
    name: "Master Mind",
    description: "Reach level 15",
    icon: "feather",
    color: "#6366F1",
    rarity: "rare",
  },
  {
    id: "level_20",
    name: "Grandmaster",
    description: "Reach level 30",
    icon: "globe",
    color: "#EC4899",
    rarity: "legendary",
  },
  {
    id: "perfect_day",
    name: "Perfect Day",
    description: "Complete 20 reviews in a single day",
    icon: "sun",
    color: "#F59E0B",
    rarity: "rare",
  },
  {
    id: "xp_1000",
    name: "XP Hunter",
    description: "Earn 2,500 total XP",
    icon: "activity",
    color: "#6366F1",
    rarity: "common",
  },
  {
    id: "xp_5000",
    name: "XP Legend",
    description: "Earn 10,000 total XP",
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
  check("streak_3", stats.currentStreak >= 5);
  check("streak_7", stats.currentStreak >= 10);
  check("streak_14", stats.currentStreak >= 21);
  check("streak_30", stats.currentStreak >= 45);
  check("streak_100", stats.currentStreak >= 150);
  check("reviews_10", stats.totalCompleted >= 25);
  check("reviews_50", stats.totalCompleted >= 100);
  check("reviews_100", stats.totalCompleted >= 250);
  check("reviews_500", stats.totalCompleted >= 750);
  check("reviews_1000", stats.totalCompleted >= 2000);
  check("level_5", level >= 8);
  check("level_10", level >= 15);
  check("level_20", level >= 30);
  check("perfect_day", stats.todayCompleted >= 20);
  check("xp_1000", stats.totalXp >= 2500);
  check("xp_5000", stats.totalXp >= 10000);

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
