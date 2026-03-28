// XP Rules for the gamified learning platform
export const XP_RULES = {
  correct_easy: 10,
  correct_medium: 18,
  correct_hard: 25,
  speed_bonus: 5,
  daily_streak_7: 100,
  topic_completed: 50,
  weak_topic_mastered: 150,
  perfect_test: 200
};

// Level thresholds - total XP needed for each level
export const LEVEL_THRESHOLDS = [0, 500, 1200, 2000, 3200, 5000, 8000, 12000, 18000];

// Helper function to calculate level based on XP
export function calculateLevel(xpTotal: number): number {
  const levelIndex = LEVEL_THRESHOLDS.findIndex(threshold => xpTotal < threshold);
  return levelIndex === -1 ? LEVEL_THRESHOLDS.length : levelIndex;
}

// Helper function to calculate XP for correct answer
export function calculateXp(difficulty: string, timeSpent: number): number {
  let baseXp = 0;
  
  switch (difficulty) {
    case 'easy':
      baseXp = XP_RULES.correct_easy;
      break;
    case 'medium':
    case 'intermediate':
      baseXp = XP_RULES.correct_medium;
      break;
    case 'hard':
    case 'advanced':
      baseXp = XP_RULES.correct_hard;
      break;
    default:
      baseXp = XP_RULES.correct_easy;
  }
  
  // Speed bonus: +5 XP if answered in less than 15 seconds
  if (timeSpent < 15) {
    baseXp += XP_RULES.speed_bonus;
  }
  
  return baseXp;
}
