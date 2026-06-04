import { PlayerStats, LeaderboardEntry, CountryData } from '../types';

// Haversine formula to compute geodesic distance in KM
export const getGeodesicDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's mean radius in KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Map each CCA3 of the standard clickable pool to a key continent for achievements tracking
const ASIA_CCA3 = [
  'TWN', 'JPN', 'KOR', 'CHN', 'IND', 'IDN', 'THA', 'VNM', 'MYS', 'PHL',
  'MNG', 'TUR', 'SAU', 'IRN', 'PAK', 'NPL', 'KHM', 'MMR', 'KAZ', 'BGD',
  'IRQ', 'YEM', 'OMN', 'SYR', 'UZB', 'LKA'
];

export const isAsiaCountry = (cca3: string): boolean => {
  return ASIA_CCA3.includes(cca3.toUpperCase());
};

// Main scoring calculation based on distance key decay curve
export const calculatePoints = (distanceKm: number, isCorrect: boolean): number => {
  if (isCorrect) return 1000;
  
  // Skip has a very large distance (usually >14000) and receives 0 points without deduction
  if (distanceKm > 14000) return 0;

  // If guess is too far away (> 3000 km), we apply a deduction (negative points)
  if (distanceKm > 3000) {
    // Penalty is scaled based on how far away and capped at -350
    const penalty = Math.min(350, 50 + Math.round((distanceKm - 3000) / 30));
    return -penalty;
  }

  // Under 3000 km: exponentially decay from 999 down to 0 positive points
  const score = Math.round(1000 * Math.exp(-distanceKm / 1500));
  return Math.max(0, Math.min(999, score));
};

// Experience points and Leveling progress detail logic
export const getLevelDetails = (totalXP: number) => {
  // Lv1: 0XP, Lv2: 500XP, Lv3: 1000XP, Lv4: 2000XP, Lv5: 3500XP, and so on (adds 2000 per level afterwards)
  const reqs = [0, 500, 1000, 2000, 3500, 5500, 8000, 11000, 14500, 18500, 23000, 28000, 34000, 41000, 49000, 58000];
  let level = 1;
  while (level < reqs.length && totalXP >= reqs[level]) {
    level++;
  }
  
  const currentLevelBaseXP = reqs[level - 1];
  const nextLevelBaseXP = reqs[level] || (currentLevelBaseXP + (level * 2000));
  const xpInCurrentLevel = totalXP - currentLevelBaseXP;
  const xpNeededForNextLevel = nextLevelBaseXP - currentLevelBaseXP;
  const percentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));

  return {
    level,
    currentLevelXP: xpInCurrentLevel,
    nextLevelXPNeeded: xpNeededForNextLevel,
    pct: percentage,
    totalXP
  };
};

// Default player parameters
export const DEFAULT_PLAYER_STATS: PlayerStats = {
  highestTotalScore: 0,
  bestAverageDistance: 999999,
  longestCombo: 0,
  playCount: 0,
  totalCorrectGuesses: 0,
  correctAsiaCount: 0,
  correctEuropeCount: 0,
  correctAfricaCount: 0,
  correctAmericasCount: 0,
  correctOceaniaCount: 0,
  uniqueGuessedCca3s: []
};

// Seeded high scores to construct a competitive simulated global database
const INITIAL_LEADERBOARD_SEED: LeaderboardEntry[] = [
  { id: 'bot_1', playerName: '地圖之皇·郭神', totalScore: 11200, averageDistance: 45, level: 8, createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'bot_2', playerName: '臺灣地理大仙', totalScore: 10600, averageDistance: 78, level: 7, createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
  { id: 'bot_3', playerName: 'GeoManiac_2026', totalScore: 9850, averageDistance: 130, level: 6, createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: 'bot_4', playerName: '地球觀測站一號', totalScore: 9550, averageDistance: 180, level: 5, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: 'bot_5', playerName: 'Snoopy_888', totalScore: 8900, averageDistance: 240, level: 5, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { id: 'bot_6', playerName: 'Emma_Traveler', totalScore: 7800, averageDistance: 310, level: 4, createdAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { id: 'bot_7', playerName: '北極圈探險家', totalScore: 6400, averageDistance: 550, level: 3, createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
];

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const saved = localStorage.getItem('geo_global_leaderboard');
    if (!saved) {
      localStorage.setItem('geo_global_leaderboard', JSON.stringify(INITIAL_LEADERBOARD_SEED));
      return INITIAL_LEADERBOARD_SEED;
    }
    return JSON.parse(saved);
  } catch {
    return INITIAL_LEADERBOARD_SEED;
  }
};

export const submitLeaderboardScore = (playerName: string, totalScore: number, averageDistance: number, level: number): LeaderboardEntry[] => {
  const currentList = getLeaderboard();
  const entry: LeaderboardEntry = {
    id: 'user_' + Date.now(),
    playerName: playerName.trim() || '未命名極速玩家',
    totalScore,
    averageDistance: Math.round(averageDistance),
    level,
    createdAt: new Date().toISOString(),
    isUser: true
  };
  
  const updated = [...currentList, entry].sort((a, b) => b.totalScore - a.totalScore);
  localStorage.setItem('geo_global_leaderboard', JSON.stringify(updated));
  return updated;
};

// Checking achievements state
export function checkAchievements(stats: PlayerStats, highscore: number) {
  const list = [
    {
      id: 'asia_clean',
      title: '🏆 亞洲全對',
      description: '歷史上正確猜中所有 26 個亞洲國家/區域至少一次',
      category: 'region' as const,
      status: stats.uniqueGuessedCca3s.filter(code => ASIA_CCA3.includes(code.toUpperCase())).length >= 26,
      progress: `${stats.uniqueGuessedCca3s.filter(code => ASIA_CCA3.includes(code.toUpperCase())).length} / 26`
    },
    {
      id: 'europe_expert',
      title: '🏆 歐洲專家',
      description: '歐洲國家答對超過 50 次',
      category: 'region' as const,
      status: stats.correctEuropeCount >= 50,
      progress: `${stats.correctEuropeCount} / 50`
    },
    {
      id: 'africa_explorer',
      title: '🏆 非洲探索者',
      description: '非洲國家答對超過 30 次',
      category: 'region' as const,
      status: stats.correctAfricaCount >= 30,
      progress: `${stats.correctAfricaCount} / 30`
    },
    {
      id: 'americas_master',
      title: '🏆 美洲達人',
      description: '北美與南美聯邦對抗答對超過 50 次',
      category: 'region' as const,
      status: stats.correctAmericasCount >= 50,
      progress: `${stats.correctAmericasCount} / 50`
    },
    {
      id: 'oceania_pro',
      title: '🏆 大洋洲專家',
      description: '大洋洲群島答對超過 20 次',
      category: 'region' as const,
      status: stats.correctOceaniaCount >= 20,
      progress: `${stats.correctOceaniaCount} / 20`
    },
    
    // Combo
    {
      id: 'combo_10',
      title: '🔥 10連擊',
      description: '連續答對 10 題國家位置考驗',
      category: 'combo' as const,
      status: stats.longestCombo >= 10,
      progress: `${stats.longestCombo} / 10`
    },
    {
      id: 'combo_25',
      title: '🔥 25連擊',
      description: '連續答對 25 題國家位置考驗',
      category: 'combo' as const,
      status: stats.longestCombo >= 25,
      progress: `${stats.longestCombo} / 25`
    },
    {
      id: 'combo_50',
      title: '🔥 50連擊',
      description: '連續答對 50 題國家位置考驗',
      category: 'combo' as const,
      status: stats.longestCombo >= 50,
      progress: `${stats.longestCombo} / 50`
    },
    {
      id: 'combo_100',
      title: '🔥 100連擊',
      description: '連續答對 100 題國家位置考驗',
      category: 'combo' as const,
      status: stats.longestCombo >= 100,
      progress: `${stats.longestCombo} / 100`
    },

    // Scores
    {
      id: 'score_10k',
      title: '⭐ 首次破萬分',
      description: '在單場問答考驗中累計分數突破 10,000 分',
      category: 'score' as const,
      status: highscore >= 10000,
      progress: `${highscore} / 10000`
    },
    {
      id: 'score_30k',
      title: '⭐ 首次三萬分',
      description: '在單場問答考驗中累計分數突破 30,000 分',
      category: 'score' as const,
      status: highscore >= 30000,
      progress: `${highscore} / 30000`
    },
    {
      id: 'score_50k',
      title: '⭐ 首次五萬分',
      description: '在單場問答考驗中累計分數突破 50,000 分',
      category: 'score' as const,
      status: highscore >= 50000,
      progress: `${highscore} / 50000`
    },

    // Plays
    {
      id: 'play_10',
      title: '🎮 遊玩10場',
      description: '完成累積 10 場國家位置猜謎遊戲',
      category: 'play' as const,
      status: stats.playCount >= 10,
      progress: `${stats.playCount} / 10`
    },
    {
      id: 'play_50',
      title: '🎮 遊玩50場',
      description: '完成累積 50 場國家位置猜謎遊戲',
      category: 'play' as const,
      status: stats.playCount >= 50,
      progress: `${stats.playCount} / 50`
    },
    {
      id: 'play_100',
      title: '🎮 遊玩100場',
      description: '完成累積 100 場國家位置猜謎遊戲',
      category: 'play' as const,
      status: stats.playCount >= 100,
      progress: `${stats.playCount} / 100`
    },

    // Collector
    {
      id: 'collect_100',
      title: '🌍 猜中100個不同國家',
      description: '在探索與測驗中累計猜對超過 100 個不同的國家',
      category: 'collector' as const,
      status: stats.uniqueGuessedCca3s.length >= 100,
      progress: `${stats.uniqueGuessedCca3s.length} / 100`
    },
    {
      id: 'collect_all',
      title: '🌍 猜中所有國家至少一次',
      description: '主動正確猜中題庫中全部 115 個以上的精選國家',
      category: 'collector' as const,
      status: stats.uniqueGuessedCca3s.length >= 115,
      progress: `${stats.uniqueGuessedCca3s.length} / 115`
    },
  ];

  return list;
}
