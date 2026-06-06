/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Users, Globe as GlobeIcon, X, Info, Layers, 
  Navigation, Coins, Compass, Trophy, HelpCircle, RefreshCw, 
  Power, ArrowRight, Flame, Award, User, Calendar, TrendingUp,
  LogIn, UserPlus, Menu
} from 'lucide-react';
import Globe from './components/Globe';
import { useCountryData } from './services/countryService';
import { CountryData } from './types';
import { cn, formatNumber } from './lib/utils';
import { LANDMARKS } from './data/landmarks';
import {
  getGeodesicDistance,
  calculatePoints,
  getLevelDetails,
  getLeaderboard,
  submitLeaderboardScore,
  checkAchievements
} from './utils/gamification';

// Firebase Database & Authentication System
import { auth } from './services/firebase';
import { signOut, onAuthStateChanged, getRedirectResult, User as FirebaseUser } from 'firebase/auth';
import { 
  syncUserProfile, 
  updateUserStatsAndXP, 
  submitLeaderboardScoreToFirebase, 
  getLeaderboardFromFirebase 
} from './services/firebaseAuthSync';
import AuthModal from './components/AuthModal';


const normalizeChinese = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/臺/g, '台').trim();
};

export default function App() {
  const { countries, loading, error } = useCountryData();
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<any | null>(null);

  // === 🔑 MEMBERSHIP & BACKEND SYNC STATES ===
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalDefaultTab, setAuthModalDefaultTab] = useState<'login' | 'signup'>('login');
  const [playerAvatar, setPlayerAvatar] = useState<string>(() => localStorage.getItem('geo_player_avatar') || '🧭');

  const avatarsList = ['🧭', '🌏', '🚀', '🤠', '🦊', '🦁', '🦅', '🐼'];
  const [isNightMode, setIsNightMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Quiz Game States
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameCountries, setGameCountries] = useState<CountryData[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0); // This represents points in this round
  const [showResult, setShowResult] = useState(false);
  const [recentGameCountryCodes, setRecentGameCountryCodes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_game_country_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Gamification States
  const [playerName, setPlayerName] = useState<string>(() => localStorage.getItem('geo_player_name') || 'Guest 探險家');
  const [playerXP, setPlayerXP] = useState<number>(() => {
    const val = localStorage.getItem('geo_player_xp');
    return val ? parseInt(val, 10) : 0;
  });
  const [playerStats, setPlayerStats] = useState<any>(() => {
    const fallback = {
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
    try {
      const saved = localStorage.getItem('geo_player_stats');
      return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
    } catch {
      return fallback;
    }
  });

  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxComboInRound, setMaxComboInRound] = useState(0);
  const [correctHitsInRound, setCorrectHitsInRound] = useState(0);
  const [roundDistances, setRoundDistances] = useState<number[]>([]);
  const [hasSubmittedThisRound, setHasSubmittedThisRound] = useState(false);

  // Single Question Feedback States
  const [lastQuestionDistance, setLastQuestionDistance] = useState<number | null>(null);
  const [lastQuestionEarnedPoints, setLastQuestionEarnedPoints] = useState<number | null>(null);
  const [lastQuestionComboBonus, setLastQuestionComboBonus] = useState<number | null>(null);

  // Modular tab/overlay states
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'allTime'>('allTime');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');
  const [leaderboard, setLeaderboard] = useState<any[]>(() => getLeaderboard());

  // Highlighting feedback states for current question
  const [gameHighlightCca3, setGameHighlightCca3] = useState<string | null>(null);
  const [gameHighlightColor, setGameHighlightColor] = useState<'green' | 'red' | null>(null);
  const [isAnsweringLocked, setIsAnsweringLocked] = useState(false);
  const [gameToast, setGameToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showCorrectOverlay, setShowCorrectOverlay] = useState(false);
  const [lastGuessedCountry, setLastGuessedCountry] = useState<CountryData | null>(null);

  // Sync player parameters to localStorage
  useEffect(() => {
    localStorage.setItem('geo_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('geo_player_xp', playerXP.toString());
  }, [playerXP]);

  useEffect(() => {
    localStorage.setItem('geo_player_stats', JSON.stringify(playerStats));
  }, [playerStats]);

  useEffect(() => {
    localStorage.setItem('geo_player_avatar', playerAvatar);
  }, [playerAvatar]);

  // Listen to Firebase Authentication Status Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        try {
          const freshName = localStorage.getItem('geo_player_name') || playerName;
          const freshXP = parseInt(localStorage.getItem('geo_player_xp') || '0', 10);
          const parsedStats = JSON.parse(localStorage.getItem('geo_player_stats') || '{}');
          const freshStats = {
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
            uniqueGuessedCca3s: [],
            ...parsedStats
          };
          
          const serverProfile = await syncUserProfile(currentUser, freshStats, freshXP, freshName);
          
          setPlayerName(serverProfile.username || currentUser.displayName || '新晉世界探險家');
          setPlayerXP(serverProfile.xp);
          setPlayerStats((prev: any) => ({
            ...prev,
            highestTotalScore: serverProfile.highestScore,
            longestCombo: serverProfile.longestCombo,
            playCount: serverProfile.gamesPlayed,
          }));
          const savedAvatar = localStorage.getItem('geo_player_avatar') || '🧭';
          setPlayerAvatar(savedAvatar);
          setGameToast({ 
            message: `⚡ 帳號已同步：歡迎探險家【${serverProfile.username || currentUser.displayName || '世界探險家'}】登入！個人屬性已成功自雲端加載。`, 
            type: 'success' 
          });
        } catch (e) {
          console.error("Failed syncing player model on state change:", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Check for Google Auth Redirect login results on startup
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setGameToast({
            message: `⚡ 已成功透過 Google 網頁重導向 (Redirect) 載入您的探險者帳號！`,
            type: 'success'
          });
        }
      })
      .catch((error: any) => {
        console.error("Firebase auth redirect error:", error);
        let errorMsg = "⚠️ 載入 Google 重導向資料失敗。";
        if (error.code === 'auth/unauthorized-domain') {
          const currentDomain = window.location.hostname;
          errorMsg = `🚫 重導向登入網域未授權：目前網域 [${currentDomain}] 尚未及時登錄在您的 Firebase 【授權網域】中。`;
        } else if (error.message) {
          errorMsg = `⚠️ 登入錯誤：${error.message}`;
        }
        setGameToast({
          message: errorMsg,
          type: 'error'
        });
      });
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedCountry(null);
      setSelectedLandmark(null);
      setIsPlaying(false);
      setPlayerName('Guest 探險家');
      setPlayerXP(0);
      setPlayerAvatar('🧭');
      setPlayerStats({
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
      });
      localStorage.removeItem('geo_player_name');
      localStorage.removeItem('geo_player_xp');
      localStorage.removeItem('geo_player_stats');
      localStorage.removeItem('geo_player_avatar');
      
      setGameToast({ message: "🚪 您已安全登出探險家帳戶！清除登入狀態並已回到探索主頁。", type: 'success' });
    } catch (e) {
      console.error("Logout failure:", e);
    }
  };

  // Open and load Leaderboard from Firebase (sync server data) or local storage fallback
  const openLeaderboard = async () => {
    setIsLeaderboardOpen(true);
    try {
      const dbScores = await getLeaderboardFromFirebase();
      setLeaderboard(dbScores);
    } catch (e) {
      console.warn("Firestore leaderboard load failed, falling back to local:", e);
      setLeaderboard(getLeaderboard());
    }
  };

  // Unified stats calculator for current correct hits and regions
  const updateStatsOnCorrectAnswer = (cca3: string, region: string) => {
    setPlayerStats((prev: any) => {
      const updatedUnique = prev.uniqueGuessedCca3s.includes(cca3)
        ? prev.uniqueGuessedCca3s
        : [...prev.uniqueGuessedCca3s, cca3];
        
      let asiaInc = prev.correctAsiaCount || 0;
      let europeInc = prev.correctEuropeCount || 0;
      let africaInc = prev.correctAfricaCount || 0;
      let americasInc = prev.correctAmericasCount || 0;
      let oceaniaInc = prev.correctOceaniaCount || 0;

      if (region === 'Asia') asiaInc++;
      else if (region === 'Europe') europeInc++;
      else if (region === 'Africa') africaInc++;
      else if (region === 'Americas') americasInc++;
      else if (region === 'Oceania') oceaniaInc++;

      return {
        ...prev,
        totalCorrectGuesses: (prev.totalCorrectGuesses || 0) + 1,
        correctAsiaCount: asiaInc,
        correctEuropeCount: europeInc,
        correctAfricaCount: africaInc,
        correctAmericasCount: americasInc,
        correctOceaniaCount: oceaniaInc,
        uniqueGuessedCca3s: updatedUnique
      };
    });
  };


  // Google Earth style personalization states
  const [showClouds, setShowClouds] = useState(false);
  const [showAtmosphere, setShowAtmosphere] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showBorders, setShowBorders] = useState(true);
  const [activeTab, setActiveTab] = useState<'search' | 'layers' | 'voyager' | null>('search');

  // Game actions
  const startGame = () => {
    if (!countries || countries.length === 0) return;
    
    // Select highly recognizable & medium-difficulty countries that are easily clickable.
    // Small island nations and microstates (Brunei, Hong Kong, Singapore, Andorra, Bahrain, Vatican, Luxembourg) are completely excluded to guarantee perfect touch/click targets.
    const standardClickableCodes = [
      // Asia & Middle East
      'TWN', // 台灣
      'JPN', // 日本
      'KOR', // 韓國
      'CHN', // 中國
      'IND', // 印度
      'IDN', // 印尼
      'THA', // 泰國
      'VNM', // 越南
      'MYS', // 馬來西亞
      'PHL', // 菲律賓
      'MNG', // 蒙古
      'TUR', // 土耳其
      'SAU', // 沙烏地阿拉伯
      'IRN', // 伊朗
      'PAK', // 巴基斯坦
      'NPL', // 尼泊爾
      'KHM', // 柬埔寨
      'MMR', // 緬甸
      'KAZ', // 哈薩克
      'BGD', // 孟加拉
      'IRQ', // 伊拉克
      'YEM', // 葉門
      'OMN', // 阿曼
      'SYR', // 敘利亞
      'UZB', // 烏茲別克
      'LKA', // 斯里蘭卡
      
      // Europe
      'GBR', // 英國
      'FRA', // 法國
      'DEU', // 德國
      'ITA', // 義大利
      'ESP', // 西班牙
      'UKR', // 烏克蘭
      'POL', // 波蘭
      'SWE', // 瑞典
      'NOR', // 挪威
      'FIN', // 芬蘭
      'GRC', // 希臘
      'NLD', // 荷蘭
      'BEL', // 比利時
      'CHE', // 瑞士
      'AUT', // 奧地利
      'PRT', // 葡萄牙
      'DNK', // 丹麥
      'IRL', // 愛爾蘭
      'ROU', // 羅馬尼亞
      'CZE', // 捷克
      'HUN', // 匈牙利
      'RUS', // 俄羅斯
      'BLR', // 白俄羅斯
      'BGR', // 保加利亞
      'SRB', // 塞爾維亞
      'HRV', // 克羅埃西亞
      'ISL', // 冰島
      
      // Americas
      'USA', // 美國
      'CAN', // 加拿大
      'MEX', // 墨西哥
      'BRA', // 巴西
      'ARG', // 阿根廷
      'COL', // 哥倫比亞
      'PER', // 秘魯
      'CHL', // 智利
      'VEN', // 委內瑞拉
      'BOL', // 玻利維亞
      'CUB', // 古巴
      'ECU', // 厄瓜多
      'PRY', // 巴拉圭
      'URY', // 烏拉圭
      'GTM', // 瓜地馬拉
      'HND', // 宏都拉斯
      'NIC', // 尼加拉瓜
      'PAN', // 巴拿馬
      
      // Oceania
      'AUS', // 澳洲
      'NZL', // 紐西蘭
      'PNG', // 巴布亞紐幾內亞
      
      // Africa
      'EGY', // 埃及
      'ZAF', // 南非
      'KEN', // 肯亞
      'MAR', // 摩洛哥
      'NGA', // 奈及利亞
      'ETH', // 衣索比亞
      'DZA', // 阿爾及利亞
      'TZA', // 坦尚尼亞
      'SDN', // 蘇丹
      'AGO', // 安哥拉
      'MDG', // 馬達加斯加
      'GHA', // 迦納
      'CMR', // 喀麥隆
      'TUN', // 突尼西亞
      'LBY', // 利比亞
      'SSD', // 南蘇丹
      'TCD', // 查德
      'NER', // 尼日
      'MLI', // 馬利
      'MRT', // 茅利塔尼亞
      'SOM', // 索馬利亞
      'COD', // 民主剛果
      'COG', // 剛果共和國
      'ZMB', // 贊比亞
      'ZWE', // 辛巴威
      'BWA', // 波札那
      'NAM', // 納米比亞
      'MOZ', // 莫三比克
      'CIV', // 科特迪瓦
      'SEN', // 塞內加爾
    ];

    const filteredForGame = countries.filter(c => {
      if (!c.commonName || !c.cca3) return false;
      const code = c.cca3.toUpperCase();
      
      // Only keep countries from the standard highly-recognizable easily-clickable whitelist
      if (!standardClickableCodes.includes(code)) {
        return false;
      }
      
      // Ensure it has valid non-zero coordinates
      if (!c.latlng || c.latlng.length !== 2 || (c.latlng[0] === 0 && c.latlng[1] === 0)) {
        return false;
      }
      
      return true;
    });

    // Make sure we select different questions on consecutive matches
    // We prioritize countries not present in state-bound recentGameCountryCodes
    const uppercaseRecent = recentGameCountryCodes.map(code => code.toUpperCase());
    let unused = filteredForGame.filter(c => !uppercaseRecent.includes(c.cca3.toUpperCase()));
    
    // If not enough unused countries remain (threshold 12), purge half of the oldest saved histories to release them back
    if (unused.length < 12) {
      unused = filteredForGame;
    }

    const shuffledUnused = [...unused].sort(() => 0.5 - Math.random());
    let selected = shuffledUnused.slice(0, 10);
    
    // Fallback if somehow short of 10
    if (selected.length < 10) {
      const remainingCount = 10 - selected.length;
      const alreadyChosenCca3s = selected.map(s => s.cca3.toUpperCase());
      const secondaryPool = filteredForGame.filter(c => !alreadyChosenCca3s.includes(c.cca3.toUpperCase()));
      const shuffledSecondary = [...secondaryPool].sort(() => 0.5 - Math.random());
      selected = [...selected, ...shuffledSecondary.slice(0, remainingCount)];
    }
    
    // Add selected ones to the front of history, limiting window size to 35 so we have a wide available rotation pool
    const selectedCodes = selected.map(c => c.cca3.toUpperCase());
    const updatedRecent = [
      ...selectedCodes,
      ...recentGameCountryCodes.filter(code => !selectedCodes.includes(code.toUpperCase()))
    ].slice(0, 35);

    setRecentGameCountryCodes(updatedRecent);
    try {
      localStorage.setItem('recent_game_country_codes', JSON.stringify(updatedRecent));
    } catch {
      // safe fallback
    }

    setSelectedCountry(null);
    setSelectedLandmark(null);
    setSearchTerm('');
    
    setGameCountries(selected);
    setCurrentQuestionIdx(0);
    setScore(0);
    setShowResult(false);
    setGameHighlightCca3(null);
    setGameHighlightColor(null);
    setGameToast(null);
    setShowCorrectOverlay(false);
    setIsAnsweringLocked(false);
    setIsPlaying(true);
    setRoundDistances([]);
    setCurrentCombo(0);
    setMaxComboInRound(0);
    setCorrectHitsInRound(0);
    setLastQuestionDistance(null);
    setLastQuestionEarnedPoints(null);
    setLastQuestionComboBonus(null);
    setHasSubmittedThisRound(false);
    setLastGuessedCountry(null);
  };

  const quitGame = () => {
    setIsPlaying(false);
    setGameCountries([]);
    setCurrentQuestionIdx(0);
    setScore(0);
    setShowResult(false);
    setGameHighlightCca3(null);
    setGameHighlightColor(null);
    setGameToast(null);
    setShowCorrectOverlay(false);
    setIsAnsweringLocked(false);
    setRoundDistances([]);
    setCurrentCombo(0);
    setMaxComboInRound(0);
    setCorrectHitsInRound(0);
    setLastGuessedCountry(null);
  };

  const advanceGame = () => {
    setGameHighlightCca3(null);
    setGameHighlightColor(null);
    setGameToast(null);
    setShowCorrectOverlay(false);
    setLastGuessedCountry(null);
    
    if (currentQuestionIdx < 9) {
      setCurrentQuestionIdx(prev => prev + 1);
      setIsAnsweringLocked(false);
    } else {
      setShowResult(true);
      setIsAnsweringLocked(false);

      // Execute game calculation summarizing XP and statistical outputs
      const finalScore = score;
      const totalDist = roundDistances.reduce((a, b) => a + b, 0);
      const avgDistance = roundDistances.length > 0 ? totalDist / roundDistances.length : 999999;

      // Add XP: 100 XP per 1000 Points
      const gainedXP = Math.round(finalScore * 0.1);
      setPlayerXP(prev => prev + gainedXP);

      // Save to local profile statistics & automatically upload stats and scores to Cloud if logged in
      setPlayerStats((prev: any) => {
        const newPlayCount = (prev.playCount || 0) + 1;
        const newHighest = Math.max(prev.highestTotalScore || 0, finalScore);
        const prevBestDist = prev.bestAverageDistance !== undefined && prev.bestAverageDistance !== null ? prev.bestAverageDistance : 999999;
        const newBestAvgDist = avgDistance > 0 ? Math.min(prevBestDist, avgDistance) : prevBestDist;
        const newLongestCombo = Math.max(prev.longestCombo || 0, maxComboInRound);

        const updated = {
          ...prev,
          playCount: newPlayCount,
          highestTotalScore: newHighest,
          bestAverageDistance: newBestAvgDist === 999999 ? avgDistance : newBestAvgDist,
          longestCombo: newLongestCombo
        };

        // If authenticated on Firebase:
        if (auth.currentUser) {
          const freshXP = playerXP + gainedXP;
          const freshLvl = getLevelDetails(freshXP).level;
          
          updateUserStatsAndXP(auth.currentUser.uid, updated, freshXP, playerName);
          submitLeaderboardScoreToFirebase(playerName, finalScore, avgDistance, freshLvl);
        }

        return updated;
      });
    }
  };

  const handleSkipQuestion = () => {
    const currentTarget = gameCountries[currentQuestionIdx];
    if (!currentTarget || isAnsweringLocked) return;
    
    setIsAnsweringLocked(true);
    setGameHighlightCca3(currentTarget.cca3);
    setGameHighlightColor('green');
    
    // Skip penalty: 15,000 km, 0 score, resets combo multiplier
    setLastQuestionDistance(15000);
    setLastQuestionEarnedPoints(0);
    setLastQuestionComboBonus(0);
    setCurrentCombo(0);
    setRoundDistances(prev => [...prev, 15000]);

    setGameToast({
      message: `💡 答案在這裡！這就是【${currentTarget.commonName}】。請點擊「下一題」按鈕繼續。`,
      type: 'info'
    });
    setShowCorrectOverlay(true); // Pop up full question review panel so distance and score (0) are clear
  };

  const handleCountryClick = (country: CountryData) => {
    if (isPlaying) {
      if (isAnsweringLocked || showResult) return;
      
      const currentTarget = gameCountries[currentQuestionIdx];
      if (!currentTarget) return;
      
      setIsAnsweringLocked(true);
      setLastGuessedCountry(country);
      const isCorrect = (country.cca3 || '').toUpperCase() === (currentTarget.cca3 || '').toUpperCase();
      
      // Calculate real distance error in km
      const dist = isCorrect ? 0 : getGeodesicDistance(
        country.latlng[0],
        country.latlng[1],
        currentTarget.latlng[0],
        currentTarget.latlng[1]
      );
      
      // Track distance
      setRoundDistances(prev => [...prev, dist]);

      // Exponential decay score from 0 to 1000 limit
      const earnedPoints = calculatePoints(dist, isCorrect);
      
      let bonus = 0;
      let newCombo = 0;

      if (isCorrect) {
        newCombo = currentCombo + 1;
        setCurrentCombo(newCombo);
        setMaxComboInRound(prev => Math.max(prev, newCombo));
        setCorrectHitsInRound(prev => prev + 1);

        // Check Combo Milestone bonuses
        if (newCombo === 3) bonus = 200;
        else if (newCombo === 5) bonus = 500;
        else if (newCombo === 10) bonus = 1000;

        // Perform per-country stat counters update
        updateStatsOnCorrectAnswer(currentTarget.cca3, currentTarget.region);

        setScore(prev => Math.max(0, prev + earnedPoints + bonus));
        setGameHighlightCca3(currentTarget.cca3);
        setGameHighlightColor('green');

        let msg = `🎉 答對了！這就是【${currentTarget.commonName}】。距離誤差 0 公里，獲得 ${earnedPoints} 分！`;
        if (bonus > 0) {
          msg += ` 🔥 達成 ${newCombo} 連擊！額外加碼 +${bonus} 分！`;
        }
        setGameToast({
          message: msg,
          type: 'success'
        });
        setShowCorrectOverlay(true);
      } else {
        newCombo = 0;
        setCurrentCombo(0);

        setScore(prev => Math.max(0, prev + earnedPoints));
        setGameHighlightCca3(currentTarget.cca3);
        setGameHighlightColor('green'); // Target highlight color stays green to show correct answer on map

        const pointsMsg = earnedPoints < 0 
          ? `本題倒扣: ${Math.abs(earnedPoints)} 分` 
          : `本題得分: ${earnedPoints} 分`;

        setGameToast({
          message: `🚫 答錯囉！你點到的是【${country.commonName}】。正確位置應該是【${currentTarget.commonName}】（偏差距離: ${dist.toLocaleString()} 公里），${pointsMsg}。連擊已中斷為 0。`,
          type: 'error'
        });
        setShowCorrectOverlay(true);
      }

      setLastQuestionDistance(dist);
      setLastQuestionEarnedPoints(earnedPoints);
      setLastQuestionComboBonus(bonus);

    } else {
      setSelectedCountry(country);
      setSelectedLandmark(null);
    }
  };


  const handleRandomCountry = () => {
    if (countries && countries.length > 0) {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      setSelectedCountry(randomCountry);
      setSelectedLandmark(null);
    }
  };

  // Reset image loading state when selected country changes
  useEffect(() => {
    if (selectedCountry) {
      setIsImageLoading(true);
    }
  }, [selectedCountry?.cca3]);

  const countriesMap: Record<string, string> = {
    'All': '全部',
    'Africa': '非洲',
    'Americas': '美洲',
    'Asia': '亞洲',
    'Europe': '歐洲',
    'Oceania': '大洋洲',
    'Antarctic': '南極洲'
  };

  const subregionsMap: Record<string, string> = {
    'Eastern Asia': '東亞',
    'Western Asia': '西亞',
    'South-Eastern Asia': '東南亞',
    'Southern Asia': '南亞',
    'Central Asia': '中亞',
    'Western Europe': '西歐',
    'Northern Europe': '北歐',
    'Southern Europe': '南歐',
    'Eastern Europe': '東歐',
    'Northern Africa': '北非',
    'Western Africa': '西非',
    'Middle Africa': '中非',
    'Eastern Africa': '東非',
    'Southern Africa': '南非',
    'Northern America': '北美洲',
    'South America': '南美洲',
    'Central America': '中美洲',
    'Caribbean': '加勒比地區',
    'Australia and New Zealand': '紐澳地區',
    'Melanesia': '美拉尼西亞',
    'Micronesia': '密克羅尼西亞',
    'Polynesia': '玻里尼西亞',
    'South-Eastern Europe': '東南歐'
  };

  const languagesMap: Record<string, string> = {
    'English': '英語',
    'Chinese': '中文',
    'Mandarin Chinese': '國語/普通話',
    'Spanish': '西班牙語',
    'French': '法語',
    'Arabic': '阿拉伯語',
    'Portuguese': '葡萄牙語',
    'Russian': '俄語',
    'Japanese': '日語',
    'German': '德語',
    'Hindi': '印地語',
    'Bengali': '孟加拉語',
    'Korean': '韓語',
    'Vietnamese': '越南語',
    'Italian': '義大利語',
    'Turkish': '土耳其語',
    'Thai': '泰語',
    'Dutch': '荷蘭語',
    'Greek': '希臘語',
    'Indonesian': '印尼語',
    'Malay': '馬來語',
    'Polish': '波蘭語',
    'Swedish': '瑞典語',
    'Finnish': '芬蘭語',
    'Norwegian': '挪威語',
    'Danish': '丹麥語',
    'Hebrew': '希伯來語',
    'Hinglish': '印地英語',
    'Fijian': '斐濟語',
    'Urdu': '烏爾都語',
    'Persian': '波斯語',
    'Amharic': '阿姆哈拉語',
    'Somali': '索馬利亞語',
    'Swahili': '斯瓦希里語',
    'Yoruba': '約魯巴語',
    'Zulu': '祖魯語',
    'Tagalog': '塔加洛語',
    'Filipino': '菲律賓語',
    'Lao': '寮語',
    'Khmer': '高棉語',
    'Burmese': '緬甸語',
    'Sinhala': '僧伽羅語',
    'Tamil': '坦米爾語'
  };

  const capitalsMap: Record<string, string> = {
    'Washington, D.C.': '華盛頓特區',
    'London': '倫敦',
    'Paris': '巴黎',
    'Tokyo': '東京',
    'Beijing': '北京',
    'Taipei': '台北',
    'Seoul': '首爾',
    'Bangkok': '曼谷',
    'Singapore': '新加坡',
    'Ottawa': '渥太華',
    'Canberra': '坎培拉',
    'Berlin': '柏林',
    'Rome': '羅馬',
    'Madrid': '馬德里',
    'Moscow': '莫斯科',
    'New Delhi': '新德里',
    'Jakarta': '雅加達',
    'Manila': '馬尼拉',
    'Hanoi': '河內',
    'Kuala Lumpur': '吉隆坡',
    'Vatican City': '梵蒂岡',
    'Pyongyang': '平壤',
    'Athens': '雅典',
    'Cairo': '開羅',
    'Brasília': '巴西利亞',
    'Buenos Aires': '布宜諾斯艾利斯',
    'Mexico City': '墨西哥城',
    'Stockholm': '斯德哥爾摩',
    'Oslo': '奧斯陸',
    'Copenhagen': '哥本哈根',
    'Amsterdam': '阿姆斯特丹',
    'Brussels': '布魯塞爾',
    'Vienna': '維也納',
    'Prague': '布拉格',
    'Jerusalem': '耶路撒冷',
    'Abu Dhabi': '阿布達比',
    'Riyadh': '利雅德',
    'Ankara': '安卡拉',
    'Lisbon': '里斯本',
    'Warsaw': '華沙',
    'Kyiv': '基輔',
    'Bern': '伯恩',
    'Helsinki': '赫爾辛基',
    'Dublin': '都柏林',
    'Budapest': '布達佩斯',
    'Bucharest': '布加勒斯特',
    'Sofia': '索非亞',
    'Belgrade': '貝爾格勒',
    'Zagreb': '札格瑞布',
    'Wellington': '威靈頓',
    'Islamabad': '伊斯蘭馬巴德',
    'Tehran': '德黑蘭',
    'Baghdad': '巴格達',
    'Damascus': '大馬士革',
    'Beirut': '貝魯特',
    'Amman': '安曼',
    'Kuwait City': '科威特城',
    'Doha': '杜哈',
    'Manama': '麥納瑪',
    'Muscat': '馬斯喀特',
    'Sanaa': '沙那',
    'Kabul': '喀布爾',
    'Nairobi': '奈洛比',
    'Addis Ababa': '阿迪斯阿貝巴',
    'Pretoria': '普利托里亞',
    'Cape Town': '開普敦',
    'Johannesburg': '約翰尼斯堡',
    'Lagos': '拉哥斯',
    'Accra': '阿克拉',
    'Casablanca': '卡薩布蘭卡',
    'Marrakesh': '馬拉喀什',
    'Tunis': '突尼斯',
    'Algiers': '阿爾及爾',
    'Triopli': '的黎波里',
    'Khartoum': '喀土穆',
    'Santiago': '聖地牙哥',
    'Lima': '利馬',
    'Bogotá': '波哥大',
    'Quito': '基多',
    'Caracas': '加拉加斯',
    'Montevideo': '蒙特維多',
    'Asunción': '亞松森',
    'La Paz': '拉巴斯',
    'Panama City': '巴拿馬城',
    'San José': '聖荷西',
    'San Salvador': '聖薩爾瓦多',
    'Managua': '馬拿瓜',
    'Tegucigalpa': '德古斯加巴',
    'Guatemala City': '瓜地馬拉市',
    'Havana': '哈瓦那',
    'Kingston': '京斯敦',
    'Nassau': '拿索',
    'Port-au-Prince': '太子港',
    'Santo Domingo': '聖多明哥',
    'San Juan': '聖胡安',
    'Port of Spain': '西班牙港',
    'Castries': '卡斯特里',
    'Saint George\'s': '聖喬治',
    'Kingstown': '金斯敦',
    'Basseterre': '巴斯特爾',
    'St. John\'s': '聖約翰',
    'Roseau': '羅索',
    'Belmopan': '貝爾墨潘'
  };

  const regions = ['All', 'Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

  const filteredCountries = useMemo(() => {
    const query = normalizeChinese(searchTerm);
    if (!query) return [];
    return countries.filter(c => {
      // Get the translated capital name for the country (e.g., 'Washington, D.C.' matches '華盛頓特區')
      const zhCapital = capitalsMap[c.capital] || '';
      const normCommonName = normalizeChinese(c.commonName || '');
      const normOfficialName = normalizeChinese(c.name || '');
      const normCapital = normalizeChinese(c.capital || '');
      const normZhCapital = normalizeChinese(zhCapital);
      
      const matchesSearch = 
        normCommonName.includes(query) ||
        normOfficialName.includes(query) ||
        (c.cca2 && c.cca2.toLowerCase().includes(query)) ||
        (c.cca3 && c.cca3.toLowerCase().includes(query)) ||
        normCapital.includes(query) ||
        normZhCapital.includes(query) ||
        (c.region && countriesMap[c.region] && normalizeChinese(countriesMap[c.region]).includes(query)) ||
        (c.subregion && subregionsMap[c.subregion] && normalizeChinese(subregionsMap[c.subregion]).includes(query));
      
      return matchesSearch;
    });
  }, [countries, searchTerm]);

  const filteredLandmarks = useMemo(() => {
    const query = normalizeChinese(searchTerm);
    if (!query) return [];
    return LANDMARKS.filter(landmark => {
      const normName = normalizeChinese(landmark.name || '');
      const normChineseName = normalizeChinese(landmark.chineseName || '');
      const normCountry = normalizeChinese(landmark.country || '');
      const normDescription = normalizeChinese(landmark.description || '');
      return (
        normName.includes(query) ||
        normChineseName.includes(query) ||
        normCountry.includes(query) ||
        normDescription.includes(query)
      );
    });
  }, [searchTerm]);

  const handleSearchSelect = (country: CountryData) => {
    setSelectedCountry(country);
    setSelectedLandmark(null);
    setSearchTerm('');
  };

  const handleSearchSelectLandmark = (landmark: any) => {
    setSelectedLandmark(landmark);
    // Auto-select the corresponding country so the panel opens and provides local context,
    // and also allows the camera to smoothly target the landmark on the globe!
    const parentCountry = countries.find(c => {
      const normCountryOfLandmark = normalizeChinese(landmark.country || '');
      const normCommonName = normalizeChinese(c.commonName || '');
      const normName = normalizeChinese(c.name || '');
      return (
        normCommonName.includes(normCountryOfLandmark) ||
        normCountryOfLandmark.includes(normCommonName) ||
        normName.includes(normCountryOfLandmark)
      );
    });
    if (parentCountry) {
      setSelectedCountry(parentCountry);
    }
    setSearchTerm('');
  };

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden font-sans selection:bg-blue-500/30">
      {/* 3D Globe Section - Only render when parent is ready */}
      <div className="absolute inset-0 z-0 bg-neutral-950 font-sans">
        {!loading && countries.length > 0 && (
          <Globe 
            countries={countries}
            onCountryClick={handleCountryClick}
            selectedCountry={selectedCountry}
            searchTerm={searchTerm}
            regionFilter={regionFilter}
            showClouds={showClouds}
            showAtmosphere={showAtmosphere}
            showGrid={showGrid}
            showBorders={showBorders}
            selectedLandmark={selectedLandmark}
            isNightMode={isNightMode}
            setIsNightMode={setIsNightMode}
            isGameActive={isPlaying}
            gameHighlightCca3={gameHighlightCca3}
            gameHighlightColor={gameHighlightColor}
            guessCountry={lastGuessedCountry}
            correctCountry={showCorrectOverlay ? gameCountries[currentQuestionIdx] : null}
            showGameConnection={showCorrectOverlay && lastGuessedCountry !== null}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 p-10 text-center">
            <p>地球系統初始化錯誤: {error}</p>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center text-white font-sans"
          >
            <div className="relative w-24 h-24 mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-blue-800 border-l-transparent rounded-full"
              />
              <div className="absolute inset-4 bg-neutral-900 rounded-full flex items-center justify-center">
                <GlobeIcon className="w-8 h-8 text-blue-400 animate-pulse" />
              </div>
            </div>
            <p className="text-sm font-medium tracking-widest text-neutral-400 animate-pulse text-center px-6">
              正在初始化地球數據...<br/>
              <span className="text-[10px] opacity-50 block mt-2">正在建立地理空間鏈接...</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Original Centered Question Score Modal removed to keep Globe 100% visible */}

      {/* 📊 Left Top Unified Info Panel & Game Status Stack (Non-blocking) */}
      <div className="absolute top-6 left-6 z-30 pointer-events-none select-none font-sans flex flex-col gap-3 max-w-sm w-80 max-h-[85vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Main Stats HUD Panel */}
        <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-700/80 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] w-full pointer-events-auto flex flex-col gap-2.5">
          {/* Header Row: Profiling/Name & Level */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 pr-1">
              <div 
                onClick={() => {
                  setNewNameInput(playerName);
                  setIsRenameOpen(true);
                }}
                className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-md cursor-pointer hover:bg-blue-500 hover:scale-105 transition-all select-none"
                title="修改個人檔案（名稱與頭像）"
              >
                <span>{playerAvatar}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span 
                  onClick={() => {
                    setNewNameInput(playerName);
                    setIsRenameOpen(true);
                  }}
                  className="text-xs font-black text-white hover:text-blue-400 cursor-pointer truncate tracking-tight transition-colors"
                  title="修改個人檔案（名稱與頭像）"
                >
                  {playerName}
                </span>
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">等級 LV.{getLevelDetails(playerXP).level}</span>
              </div>
            </div>
            {/* Active Level Badge */}
            <div className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold text-[11px] rounded-lg tracking-wider border border-blue-500/20 shadow-md">
              LV.{getLevelDetails(playerXP).level}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline text-[9px] text-neutral-400 font-black tracking-widest">
              <span>XP 進度系統</span>
              <span>{getLevelDetails(playerXP).currentLevelXP} / {getLevelDetails(playerXP).nextLevelXPNeeded} XP</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-855">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 transition-all duration-500" 
                style={{ width: `${getLevelDetails(playerXP).pct}%` }} 
              />
            </div>
          </div>

          {/* If Game Active, Show Live Game Stats inside HUD */}
          {isPlaying && (
            <div className="mt-1 pt-2.5 border-t border-neutral-800/80 grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-neutral-950/40 border border-neutral-800/50 p-1.5 rounded-xl flex flex-col justify-center">
                <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider block font-sans">題數</span>
                <span className="text-sm font-black text-white tracking-widest">{currentQuestionIdx + 1} <span className="text-[9px] text-neutral-500 font-normal">/ 10</span></span>
              </div>
              <div className="bg-neutral-950/40 border border-neutral-800/50 p-1.5 rounded-xl flex flex-col justify-center">
                <span className="text-[8px] text-neutral-300 font-bold uppercase tracking-wider block font-sans">總分</span>
                <span className="text-sm font-black text-amber-400 truncate">{score} <span className="text-[8px] text-neutral-500 font-normal">pt</span></span>
              </div>
              <div className="bg-neutral-950/40 border border-neutral-800/50 p-1.5 rounded-xl flex items-center justify-center gap-0.5">
                <div className="flex flex-col">
                  <span className="text-[8px] text-neutral-400 font-bold uppercase tracking-wider block font-sans">Combo</span>
                  <div className="flex items-center justify-center gap-0.5">
                    {currentCombo > 0 && <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />}
                    <span className={cn(
                      "text-sm font-black tracking-widest",
                      currentCombo > 0 ? "text-rose-500 font-black animate-bounce" : "text-neutral-500"
                    )}>{currentCombo}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 🔍 Top Center Fixed Search Panel */}
      {!isPlaying && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-80 sm:w-96 font-sans">
          <div className="bg-neutral-900/90 backdrop-blur-2xl border border-neutral-700/80 rounded-2xl overflow-visible shadow-[0_10px_35px_rgba(0,0,0,0.65)] pointer-events-auto flex flex-col">
            {/* Search View layout */}
            <div className="p-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 group-focus-within:text-blue-400 transition-colors" />
                <input 
                  type="text"
                  placeholder="搜尋城市、國家、區域..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (filteredLandmarks.length > 0) {
                        handleSearchSelectLandmark(filteredLandmarks[0]);
                        (e.target as HTMLInputElement).blur();
                      } else if (filteredCountries.length > 0) {
                        handleSearchSelect(filteredCountries[0]);
                        (e.target as HTMLInputElement).blur();
                      }
                    }
                  }}
                  className="w-full bg-neutral-800/80 border border-neutral-700 text-white pl-11 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all placeholder:text-neutral-400 text-sm font-medium shadow-inner"
                />
                
                {/* Search Suggestions List */}
                {searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-700/95 rounded-2xl overflow-hidden max-h-56 overflow-y-auto z-40 shadow-2xl custom-scrollbar">
                    {filteredLandmarks.length > 0 || filteredCountries.length > 0 ? (
                      <>
                        {/* Landmarks matches */}
                        {filteredLandmarks.map(landmark => (
                          <button 
                            key={landmark.id}
                            onClick={() => handleSearchSelectLandmark(landmark)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 text-left text-neutral-200 hover:text-white transition-colors border-b border-neutral-800 cursor-pointer"
                          >
                            <div className="w-7 h-4.5 bg-neutral-800 rounded border border-neutral-700 flex items-center justify-center flex-shrink-0 text-amber-500">
                              <MapPin className="w-3 h-3" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs truncate font-medium text-amber-400">{landmark.chineseName}</span>
                              <span className="text-[9px] text-neutral-400 truncate">{landmark.name} · {landmark.country}</span>
                            </div>
                            <span className="ml-auto text-[9px] text-amber-400/90 uppercase tracking-widest font-black">地標景點</span>
                          </button>
                        ))}

                        {/* Countries matches */}
                        {filteredCountries.map(c => (
                          <button 
                            key={c.cca3}
                            onClick={() => handleSearchSelect(c)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-800 text-left text-neutral-200 hover:text-white transition-colors border-b border-neutral-800 cursor-pointer"
                          >
                            <img src={c.flag} className="w-7 h-4.5 object-cover rounded shadow-sm flex-shrink-0" alt="" />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs truncate font-semibold text-white">{c.commonName}</span>
                              {c.capital && c.capital !== '無' && (
                                <span className="text-[9px] text-neutral-400 truncate">
                                  首都: {capitalsMap[c.capital] || c.capital}
                                </span>
                              )}
                            </div>
                            <span className="ml-auto text-[9px] text-neutral-400 uppercase tracking-widest font-medium">{countriesMap[c.region] || c.region}</span>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="px-4 py-6 text-center text-xs text-neutral-400 italic">找不到匹配的結果</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Country Detail Panel - Right Side */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div 
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 bottom-0 z-30 w-full sm:w-96 bg-neutral-950/95 backdrop-blur-3xl border-l border-neutral-800 shadow-2xl flex flex-col"
          >
            {/* Header with Flag Background */}
            <div className="relative h-48 overflow-hidden">
              <img 
                src={selectedCountry.flag} 
                className="w-full h-full object-cover blur-sm opacity-20 scale-110"
                alt=""
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-neutral-950" />
              
              <button 
                onClick={() => setSelectedCountry(null)}
                className="absolute top-6 right-6 z-10 p-2 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all backdrop-blur-md border border-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-6 right-6">
                <div className="flex items-end gap-5">
                  <div className="w-24 h-16 rounded-lg overflow-hidden shadow-2xl border-2 border-white/10 flex-shrink-0">
                    <img src={selectedCountry.flag} className="w-full h-full object-cover" alt="Flag" />
                  </div>
                  <div className="pb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 block">國家檔案館</span>
                    <h2 className="text-2xl font-bold text-white leading-tight">{selectedCountry.commonName}</h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 flex-grow overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-neutral-500">
                        <Users className="w-5 h-5 text-blue-400" />
                        <span className="text-xs font-black uppercase tracking-widest">2026年 總人口數量</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-3xl font-black text-white tracking-tighter flex items-baseline gap-1">
                          {selectedCountry.population !== undefined && selectedCountry.population !== null ? formatNumber(selectedCountry.population) : '無資料'}
                          <span className="text-[10px] text-blue-500 font-bold">人</span>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.15em] flex items-center gap-1">
                          <span className="w-1 to-1.5 h-1 to-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" style={{ width: '4px', height: '4px' }}></span>
                          2026年 最新預測數據
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/50">
                      <div className="flex items-center gap-2 mb-2 text-neutral-500">
                        <Navigation className="w-4 h-4 text-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">國家首都</span>
                      </div>
                      <div className="text-md font-bold text-white truncate">{capitalsMap[selectedCountry.capital] || selectedCountry.capital}</div>
                    </div>

                    <div className="bg-neutral-900/40 p-4 rounded-2xl border border-neutral-800/50">
                      <div className="flex items-center gap-2 mb-2 text-neutral-500">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">法定貨幣</span>
                      </div>
                      <div className="text-md font-bold text-white truncate">{selectedCountry.currencyName || selectedCountry.currency}</div>
                    </div>
                  </div>
                </div>

                {/* Regional Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-neutral-900/20 rounded-xl border border-neutral-800/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-neutral-800 rounded-lg">
                        <MapPin className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">所屬大洲</div>
                        <div className="text-sm font-semibold text-neutral-200">{countriesMap[selectedCountry.region] || selectedCountry.region}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">次分區</div>
                       <div className="text-sm font-semibold text-neutral-400">{subregionsMap[selectedCountry.subregion] || selectedCountry.subregion}</div>
                    </div>
                  </div>



                  <div>
                    <h3 className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <div className="w-1 h-1 bg-blue-500 rounded-full" />
                       語言基礎
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCountry.languages.length > 0 ? selectedCountry.languages.map(lang => (
                        <span key={lang} className="px-3 py-1.5 bg-neutral-900/80 rounded-full text-xs text-neutral-300 border border-neutral-800 hover:border-blue-500/30 transition-colors cursor-default">
                          {languagesMap[lang] || lang}
                        </span>
                      )) : <span className="text-neutral-600 text-xs italic">無可用數據</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 mt-auto border-t border-neutral-900 bg-black/40 backdrop-blur-md">
              <button 
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-600/10 active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
                onClick={() => window.open(`https://zh.wikipedia.org/wiki/${selectedCountry.commonName}`, '_blank')}
              >
                <span>維基百科情報庫</span>
                <Info className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎮 Bottom Left Game-style Action Navigation Panel */}
      <div className="absolute bottom-6 left-6 z-30 pointer-events-auto select-none font-sans">
        {/* Desktop View: Vertical stack of buttons */}
        <div className="hidden sm:flex flex-col gap-2">
          {user ? (
            <>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="w-36 py-2.5 px-4 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 text-sky-400" />
                <span>個人資料</span>
              </button>
              <button
                onClick={async () => { await openLeaderboard(); }}
                className="w-36 py-2.5 px-4 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>排行榜</span>
              </button>
              <button
                onClick={() => setIsAchievementsOpen(true)}
                className="w-36 py-2.5 px-4 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4 text-blue-400" />
                <span>成就牆</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-36 py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/40 hover:border-rose-900/60 text-rose-300 hover:text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Power className="w-4 h-4 text-rose-500" />
                <span>登出</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthModalDefaultTab('login');
                  setIsAuthModalOpen(true);
                }}
                className="w-36 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-505 text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer border border-blue-500/20"
              >
                <LogIn className="w-4 h-4 text-blue-200" />
                <span>登入</span>
              </button>
              <button
                onClick={async () => { await openLeaderboard(); }}
                className="w-36 py-2.5 px-4 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>排行榜</span>
              </button>
              <button
                onClick={() => setIsAchievementsOpen(true)}
                className="w-36 py-2.5 px-4 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl shadow-xl hover:scale-105 transition-all text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <Award className="w-4 h-4 text-blue-400" />
                <span>成就牆</span>
              </button>
            </>
          )}
        </div>

        {/* Mobile View: Collapsible Menu Block */}
        <div className="flex sm:hidden flex-col items-start gap-2">
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex flex-col gap-2"
              >
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        setIsProfileOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-32 py-2 px-3.5 bg-neutral-900/95 border border-neutral-800 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-sky-400" />
                      <span>個人資料</span>
                    </button>
                    <button
                      onClick={async () => {
                        await openLeaderboard();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-32 py-2 px-3.5 bg-neutral-900/95 border border-neutral-800 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      <span>排行榜</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAchievementsOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-32 py-2 px-3.5 bg-neutral-900/95 border border-neutral-800 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <Award className="w-3.5 h-3.5 text-blue-400" />
                      <span>成就牆</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-32 py-2 px-3.5 bg-rose-950/40 border border-rose-900/40 text-rose-300 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Power className="w-3.5 h-3.5 text-rose-500" />
                      <span>登出</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setAuthModalDefaultTab('login');
                        setIsAuthModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-32 py-2 px-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      <LogIn className="w-3.5 h-3.5 text-blue-200" />
                      <span>登入</span>
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-32 py-2.5 px-4 bg-neutral-900/95 border border-neutral-800 hover:border-neutral-750 text-white rounded-xl shadow-2xl text-xs font-extrabold flex items-center justify-between cursor-pointer active:scale-95 transition-transform"
          >
            <span className="flex items-center gap-1.5 pt-0.5">
              <Menu className="w-3.5 h-3.5 text-indigo-400" />
              <span>選單</span>
            </span>
            <span className="text-[9px] text-neutral-400 font-mono transition-transform duration-200">
              {isMobileMenuOpen ? '▲' : '▼'}
            </span>
          </button>
        </div>
      </div>

      {/* 「國家位置猜謎遊戲」按鍵與模式 HUD */}
      {!isPlaying ? (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
          <button
            onClick={startGame}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-[0.98] flex items-center gap-2.5 cursor-pointer group border border-blue-500/20"
          >
            <Trophy className="w-5 h-5 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
            <span className="tracking-wider">開始遊戲</span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-4 pointer-events-auto items-end max-w-sm w-full font-sans">
          <div className="w-80 sm:w-96 bg-neutral-900/95 backdrop-blur-2xl border border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            {showResult ? (
              // Phase C: Round Completion Scoreboard
              <>
                <div className="text-center py-2 space-y-3">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                    <Trophy className="w-7 h-7" />
                  </div>
                  
                  <div className="space-y-0.5">
                    <h3 className="text-lg font-black text-white">探險賽事結算</h3>
                    <p className="text-[10px] text-neutral-400">你已順利解鎖 10 題國家位置探索</p>
                  </div>

                  <div className="bg-neutral-950/80 border border-neutral-850 rounded-2xl p-3 text-left space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-neutral-400 text-[10px] font-bold uppercase">最終累積分數：</span>
                      <span className="text-xl font-black text-amber-400 tracking-tight">
                        {score} <span className="text-[10px] text-neutral-500 font-semibold">pt</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-850">
                        <span className="text-neutral-500 text-[8px] font-black uppercase tracking-wider block">歷史回報 XP</span>
                        <span className="font-extrabold text-blue-400">+{Math.round(score * 0.1)} XP</span>
                      </div>
                      <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-850">
                        <span className="text-neutral-500 text-[8px] font-black uppercase tracking-wider block">平均偏差距離</span>
                        <span className="font-extrabold text-sky-400 text-[11px] truncate">
                          {roundDistances.length > 0 
                            ? `${Math.round(roundDistances.reduce((a, b) => a + b, 0) / roundDistances.length).toLocaleString()} km` 
                            : '0 km'}
                        </span>
                      </div>
                      <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-850">
                        <span className="text-neutral-500 text-[8px] font-black uppercase tracking-wider block">最高連擊紀錄</span>
                        <span className="font-extrabold text-rose-500 flex items-center gap-0.5">
                          <Flame className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0 animate-pulse" />
                          {maxComboInRound}
                        </span>
                      </div>
                      <div className="bg-neutral-900/60 p-2 rounded-xl border border-neutral-850">
                        <span className="text-neutral-500 text-[8px] font-black uppercase tracking-wider block">探索得分率</span>
                        <span className="font-extrabold text-emerald-400">{correctHitsInRound} / 10 題</span>
                      </div>
                    </div>
                  </div>

                  {/* Leaderboard Submission Block */}
                  {user ? (
                    <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-2xl p-3 text-left flex items-center justify-between gap-1.5 shadow-sm">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest block">👑 雲端大賽自動同步</span>
                        <span className="text-white text-xs font-black block truncate mt-0.5">名號：{playerName}</span>
                        <span className="text-[9.5px] text-neutral-400 font-bold block mt-0.5">本局成績已自動上傳並寫入您的會員紀錄！</span>
                      </div>
                      <button
                        onClick={async () => {
                          await openLeaderboard();
                        }}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[9px] font-black rounded-lg transition-all cursor-pointer shadow border border-blue-500/15 shrink-0"
                      >
                        查看排行
                      </button>
                    </div>
                  ) : (
                    <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-3 text-left space-y-2">
                      <div className="flex items-start gap-1.5 pt-0.5">
                        <span className="text-amber-400 text-xs shrink-0 pt-0.5">⚠️</span>
                        <div className="min-w-0">
                          <span className="text-neutral-305 text-[10px] font-semibold block leading-normal">
                            目前以 <strong className="text-amber-300 font-black">Guest 訪客</strong> 身份進行遊戲，成績將無法寫入雲端排行榜！
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          onClick={() => {
                            setAuthModalDefaultTab('login');
                            setIsAuthModalOpen(true);
                          }}
                          className="py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer shadow border border-blue-500/10"
                        >
                          登入會員
                        </button>
                        <button
                          onClick={() => {
                            setAuthModalDefaultTab('signup');
                            setIsAuthModalOpen(true);
                          }}
                          className="py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold rounded-xl transition-all cursor-pointer border border-neutral-700"
                        >
                          註冊帳號
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={startGame}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer border border-blue-500/20"
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                      再次挑戰
                    </button>
                    
                    <button
                      onClick={quitGame}
                      className="py-2.5 px-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition-all border border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      回到探索
                    </button>
                  </div>
                </div>
              </>
            ) : showCorrectOverlay ? (
              // Phase B: Single Question Results Feedback Overlay
              <>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                  <span className="text-[11px] text-neutral-300 font-extrabold uppercase tracking-widest flex items-center gap-1">
                    📊 本題結果統計
                  </span>
                  <span className="text-[10px] font-black bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-blue-400">
                    題數 {currentQuestionIdx + 1} / 10
                  </span>
                </div>

                {/* Score and Distance Info */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  <div className="bg-neutral-950/60 border border-neutral-850 p-2.5 rounded-xl flex flex-col justify-center">
                    <span className="text-neutral-500 text-[8px] font-black uppercase tracking-wider block mb-0.5">本題得分</span>
                    <span className={cn(
                      "text-sm font-black",
                      lastQuestionEarnedPoints !== null && lastQuestionEarnedPoints < 0 
                        ? "text-rose-500" 
                        : "text-amber-400"
                    )}>
                      {lastQuestionEarnedPoints !== null && lastQuestionEarnedPoints < 0 
                        ? `${lastQuestionEarnedPoints} pt` 
                        : `+${lastQuestionEarnedPoints || 0} pt`}
                    </span>
                  </div>
                  <div className="bg-neutral-950/60 border border-neutral-850 p-2.5 rounded-xl flex flex-col justify-center">
                    <span className="text-neutral-500 text-[8px] font-black uppercase tracking-wider block mb-0.5">距離誤差</span>
                    <span className="text-xs font-black text-neutral-200">
                      {lastQuestionDistance !== null 
                        ? lastQuestionDistance > 14000 
                          ? '已跳過' 
                          : `${Math.round(lastQuestionDistance).toLocaleString()} 公里`
                        : '0 公里'}
                    </span>
                  </div>
                </div>

                {/* Simplified Guessed vs Correct details - 2 Lines showing only country name */}
                <div className="bg-neutral-950/80 border border-neutral-850 p-2.5 rounded-xl text-[11.5px] space-y-1.5 text-left leading-relaxed">
                  <div>
                    <span className="text-neutral-400 block sm:inline">玩家猜測：</span>
                    <span className="text-white font-black text-xs">
                      {lastGuessedCountry ? lastGuessedCountry.commonName : '（跳過未猜測）'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block sm:inline">正確答案：</span>
                    <span className="text-emerald-400 font-black text-xs">
                      {gameCountries[currentQuestionIdx]?.commonName}
                    </span>
                  </div>
                </div>

                {/* Toast Message inside box if exists */}
                {gameToast && (
                  <div className={cn(
                    "p-3 rounded-xl border text-xs font-semibold leading-relaxed tracking-wide flex items-start gap-2 shadow-sm",
                    gameToast.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                    gameToast.type === 'error' && "bg-rose-500/10 border-rose-500/20 text-rose-300",
                    gameToast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  )}>
                    <span className="text-sm leading-none shrink-0">
                      {gameToast.type === 'success' ? '🎉' : gameToast.type === 'error' ? '📍' : '💡'}
                    </span>
                    <div className="text-[10.5px]">
                      {gameToast.message}
                    </div>
                  </div>
                )}

                <div className="text-[9.5px] text-neutral-500 font-bold text-center leading-normal">
                  💡 地圖未鎖定！可任意拖曳與縮放查看正確位置。
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={advanceGame}
                    className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow border border-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 animate-pulse"
                  >
                    <span>{currentQuestionIdx < 9 ? '下一題' : '查看最終統計'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={quitGame}
                    className="py-2.5 px-3.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-450 text-xs font-bold rounded-xl transition-all border border-rose-900/30 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    退出
                  </button>
                </div>
              </>
            ) : (
              // Phase A: Active Answering Game Mode
              <>
                <div className="flex items-center justify-between border-b border-neutral-800/60 pb-3">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
                    <span className="text-xs font-black uppercase tracking-widest text-neutral-300">位置猜謎遊戲 中</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full text-[11px] text-blue-400 font-bold">
                    題數 {currentQuestionIdx + 1} / 10
                  </div>
                </div>

                <div className="space-y-1.5 py-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">請在地球上找出此國家：</span>
                  <h3 className="text-2xl font-black text-white tracking-wide flex items-center gap-2.5">
                    <MapPin className="w-6 h-6 text-red-500 animate-bounce" />
                    {gameCountries[currentQuestionIdx]?.commonName}
                  </h3>
                </div>

                <div className="flex items-center justify-between bg-neutral-950/60 border border-neutral-850 p-3 rounded-xl">
                  <span className="text-xs text-neutral-400">目前累積總分：</span>
                  <span className="text-sm font-black text-emerald-400">{score} 分</span>
                </div>

                {gameToast && (
                  <div className={cn(
                    "p-3 rounded-xl border text-xs font-semibold leading-relaxed tracking-wide flex items-start gap-2.5 shadow-sm",
                    gameToast.type === 'success' && "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                    gameToast.type === 'error' && "bg-rose-500/10 border-rose-500/20 text-rose-300",
                    gameToast.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  )}>
                    <span className="text-base leading-none">
                      {gameToast.type === 'success' ? '🎉' : gameToast.type === 'error' ? '📍' : '💡'}
                    </span>
                    <div>
                      {gameToast.message}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 mt-1">
                  <button
                    onClick={handleSkipQuestion}
                    disabled={isAnsweringLocked}
                    className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-neutral-700/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-neutral-400" />
                    跳過此題
                  </button>
                  
                  <button
                    onClick={quitGame}
                    className="py-3 px-4 bg-rose-950/30 hover:bg-rose-900/40 text-rose-450 text-xs font-bold rounded-xl transition-all border border-rose-900/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Power className="w-4 h-4" />
                    退出
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}



      {/* ✏️ Player Name & Avatar Edit Modal */}
      <AnimatePresence>
        {isRenameOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -10 }}
              className="bg-neutral-900 border border-neutral-750 p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-white font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5">🧭 編輯自訂個人檔案</span>
                <button onClick={() => setIsRenameOpen(false)} className="text-neutral-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Edit Nickname Text */}
              <div className="space-y-1.5 flex flex-col text-left">
                <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">探險名號 / 稱號</span>
                <input
                  type="text"
                  value={newNameInput !== '' ? newNameInput : playerName}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="輸入您的世界稱號..."
                  className="w-full bg-neutral-950 border border-neutral-750 hover:border-neutral-700 px-4 py-2.5 rounded-2xl text-white font-bold text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Choose Avatar Badge Emoji */}
              <div className="space-y-1.5 flex flex-col text-left">
                <span className="text-neutral-400 text-[10px] font-bold uppercase tracking-wider">選擇世界徽章角色（頭像）</span>
                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  {avatarsList.map((emoji) => {
                    const isSelected = playerAvatar === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setPlayerAvatar(emoji)}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all cursor-pointer border hover:scale-110",
                          isSelected 
                            ? "bg-blue-600/20 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)] text-3xlScale" 
                            : "bg-neutral-950 border-neutral-800 hover:border-neutral-700"
                        )}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <button
                onClick={() => {
                  const rawName = newNameInput !== '' ? newNameInput : playerName;
                  const cleaned = rawName.trim();
                  if (cleaned) {
                    setPlayerName(cleaned);
                    localStorage.setItem('geo_player_name', cleaned);
                    localStorage.setItem('geo_player_avatar', playerAvatar);

                    if (user) {
                      // Trigger atomic update to Firestore
                      updateUserStatsAndXP(user.uid, playerStats, playerXP, cleaned);
                    }

                    setIsRenameOpen(false);
                    setGameToast({ 
                      message: `📝 已更新探險家檔案：名號為【${cleaned}】、世界徽章為【${playerAvatar}】。`, 
                      type: 'success' 
                    });
                  }
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all cursor-pointer text-xs shadow-md border border-blue-500/10"
              >
                保存修改
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 👤 Explorer Profile & Statistics Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -15 }}
              className="bg-neutral-900 border border-neutral-750 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/60 backdrop-blur">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span className="text-white font-black text-md">國家地理個人紀錄</span>
                </div>
                <button onClick={() => setIsProfileOpen(false)} className="text-neutral-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                {/* Profile Header Card */}
                <div className="bg-gradient-to-br from-neutral-950 to-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white hover:text-blue-400 cursor-pointer flex items-center gap-1" onClick={() => { setNewNameInput(playerName); setIsRenameOpen(true); }}>
                      {playerName}
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-extrabold uppercase tracking-widest mt-0.5 animate-pulse">專業地理探險家</p>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 text-xs font-black rounded-xl shadow-inner">
                    LV.{getLevelDetails(playerXP).level}
                  </div>
                </div>

                {/* Level Details */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs text-neutral-400 font-bold">
                    <span>等級 XP 成長池</span>
                    <span>{getLevelDetails(playerXP).currentLevelXP} / {getLevelDetails(playerXP).nextLevelXPNeeded} XP</span>
                  </div>
                  <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-[1px]">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-full transition-all duration-300" 
                      style={{ width: `${getLevelDetails(playerXP).pct}%` }} 
                    />
                  </div>
                </div>

                {/* Lifetime Core stats */}
                <div className="space-y-2.5">
                  <h4 className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    冒險生涯綜合指標
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-neutral-950/60 p-3 rounded-2xl border border-neutral-850">
                      <span className="text-neutral-500 text-[8px] font-black uppercase block">最高單局累算得分</span>
                      <span className="text-md font-black text-amber-500">{(playerStats.highestTotalScore || 0).toLocaleString()} pt</span>
                    </div>
                    <div className="bg-neutral-950/60 p-3 rounded-2xl border border-neutral-850">
                      <span className="text-neutral-500 text-[8px] font-black uppercase block">歷史最佳平均誤差</span>
                      <span className="text-md font-black text-sky-400">
                        {playerStats.bestAverageDistance && playerStats.bestAverageDistance !== 999999 
                          ? `${Math.round(playerStats.bestAverageDistance).toLocaleString()} km` 
                          : '無紀錄'}
                      </span>
                    </div>
                    <div className="bg-neutral-950/60 p-3 rounded-2xl border border-neutral-850">
                      <span className="text-neutral-500 text-[8px] font-black uppercase block">最高連擊紀錄</span>
                      <span className="text-md font-black text-rose-500 flex items-center gap-0.5">
                        <Flame className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
                        {playerStats.longestCombo || 0} 連擊
                      </span>
                    </div>
                    <div className="bg-neutral-950/60 p-3 rounded-2xl border border-neutral-850">
                      <span className="text-neutral-500 text-[8px] font-black uppercase block">參賽回數統計</span>
                      <span className="text-md font-black text-neutral-200">{(playerStats.playCount || 0).toLocaleString()} 次</span>
                    </div>
                  </div>
                </div>

                {/* Country Explorer Collections Stats */}
                <div className="space-y-2.5">
                  <h4 className="text-neutral-500 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <GlobeIcon className="w-4 h-4 text-emerald-400" />
                    地理風貌解鎖成就度
                  </h4>
                  <div className="bg-neutral-950/40 border border-neutral-850 rounded-2xl p-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-neutral-500 text-[9px] block">解答正確率：</span>
                      <span className="font-extrabold text-neutral-200">{(playerStats.totalCorrectGuesses || 0).toLocaleString()} 次命中</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[9px] block">特色主權國家：</span>
                      <span className="font-extrabold text-neutral-200">已發現 {(playerStats.uniqueGuessedCca3s || []).length} / 105 國</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 text-center">
                <button
                  onClick={() => setIsProfileOpen(false)}
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all border border-neutral-700 cursor-pointer"
                >
                  確認關閉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏆 Leaderboard Modal */}
      <AnimatePresence>
        {isLeaderboardOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -15 }}
              className="bg-neutral-900 border border-neutral-750 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] select-none"
            >
              <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/60">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span className="text-white font-black text-md">全球探險家英雄榜</span>
                </div>
                <button onClick={() => setIsLeaderboardOpen(false)} className="text-neutral-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Weekly / AllTime Sub Filter Tabs */}
              <div className="bg-neutral-950/60 p-1 flex border-b border-neutral-800/80 grid grid-cols-2">
                <button
                  onClick={() => setLeaderboardTab('allTime')}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                    leaderboardTab === 'allTime' 
                      ? "bg-neutral-800 text-white shadow font-black" 
                      : "text-neutral-400 hover:text-white font-semibold"
                  )}
                >
                  歷史成就排行 (Top 100)
                </button>
                <button
                  onClick={() => setLeaderboardTab('weekly')}
                  className={cn(
                    "py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer",
                    leaderboardTab === 'weekly' 
                      ? "bg-neutral-800 text-white shadow font-black" 
                      : "text-neutral-400 hover:text-white font-semibold"
                  )}
                >
                  本週實時爭霸 (最後 7 天)
                </button>
              </div>

              {/* Rows List */}
              <div className="flex-grow p-4 overflow-y-auto custom-scrollbar bg-neutral-950/20 max-h-[50vh]">
                <div className="space-y-2">
                  {(() => {
                    // Filter weekly
                    const list = [...leaderboard];
                    let filtered = list;
                    if (leaderboardTab === 'weekly') {
                      const sevenDaysAgo = Date.now() - 7 * 86400 * 1000;
                      filtered = list.filter(entry => new Date(entry.createdAt).getTime() >= sevenDaysAgo);
                    }
                    
                    // Sort by totalScore desc, then by distance error asc
                    const sorted = filtered.sort((a, b) => {
                      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
                      return a.averageDistance - b.averageDistance;
                    }).slice(0, 100);

                    if (sorted.length === 0) {
                      return (
                        <div className="py-12 text-center text-xs text-neutral-500 font-bold">
                          本時段尚無任何冒險家挑戰！趕緊開啟猜謎大挑戰！
                        </div>
                      );
                    }

                    return sorted.map((entry, idx) => {
                      const rank = idx + 1;
                      const isMe = entry.playerName === playerName;
                      return (
                        <div 
                          key={idx}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border transition-all",
                            isMe 
                              ? "bg-blue-900/10 border-blue-500/50 shadow-[0_4px_12px_rgba(59,130,246,0.1)]" 
                              : "bg-neutral-900 border-neutral-800/80 hover:border-neutral-750"
                          )}
                        >
                          <div className="flex items-center gap-3.5 min-w-0 pr-2">
                            {/* Rank Badge */}
                            <div className="w-7 h-7 flex items-center justify-center font-black text-xs">
                              {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                            </div>

                            <div className="min-w-0 flex flex-col">
                              <span className={cn(
                                "font-black text-xs truncate flex items-center gap-1.5",
                                isMe ? "text-blue-400" : "text-white"
                              )}>
                                {entry.playerName}
                                {isMe && <span className="text-[8px] bg-blue-600/25 px-1 py-0.5 border border-blue-500/30 rounded text-blue-400 font-extrabold uppercase">我</span>}
                              </span>
                              <span className="text-[9px] text-neutral-500 font-bold">級別 LV.{entry.level || 1} · {new Date(entry.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-amber-100 font-mono tracking-tight">{entry.totalScore.toLocaleString()} pt</span>
                            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">平均精準: {Math.round(entry.averageDistance).toLocaleString()} km</span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 text-center flex items-center justify-between">
                <span className="text-[10px] text-neutral-500 font-bold">排行榜最多顯示 100 筆成員數據</span>
                <button
                  onClick={() => setIsLeaderboardOpen(false)}
                  className="px-5 py-2 bg-neutral-800 hover:bg-neutral-750 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-neutral-700"
                >
                  確認關閉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🏅 Achievements Medal Wall Modal */}
      <AnimatePresence>
        {isAchievementsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -15 }}
              className="bg-neutral-900 border border-neutral-750 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] select-none"
            >
              <div className="p-5 border-b border-neutral-800 flex justify-between items-center bg-neutral-900/60">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-black text-md">地理挑戰勳章牆</span>
                </div>
                <button onClick={() => setIsAchievementsOpen(false)} className="text-neutral-500 hover:text-white cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              {/* Achievements Grid Box */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex-grow bg-neutral-950/20 space-y-3 max-h-[50vh]">
                {(() => {
                  const items = checkAchievements(playerStats, playerStats.highestTotalScore || 0);
                  const unlockedCount = items.filter(a => a.status).length;
                  const getBadgeIcon = (category: string) => {
                    switch (category) {
                      case 'region': return "🌍";
                      case 'combo': return "🔥";
                      case 'score': return "⭐";
                      case 'play': return "🎮";
                      case 'collector': return "👑";
                      default: return "🏅";
                    }
                  };
                  return (
                    <>
                      {/* Summary Header */}
                      <div className="bg-gradient-to-br from-blue-950/10 to-indigo-950/15 border border-indigo-900/30 rounded-2xl p-4 flex items-center justify-between gap-4 mb-2 shadow-sm">
                        <div className="space-y-1">
                          <span className="text-white text-md font-extrabold block">成就里程碑進度</span>
                          <span className="text-xs text-neutral-400 block tracking-tight">解鎖珍貴世界級別勳章與典藏標記</span>
                        </div>
                        <div className="text-center grow shrink-0 max-w-[80px]">
                          <span className="text-2xl font-black text-indigo-400 tracking-tight leading-none">{unlockedCount}</span>
                          <span className="text-neutral-500 text-[9px] font-bold block mt-1 uppercase tracking-widest leading-none">/ {items.length} 解鎖</span>
                        </div>
                      </div>

                      {/* Medal Grid Cards */}
                      <div className="space-y-2.5">
                        {items.map((medal) => {
                          const [currStr, targetStr] = medal.progress.split(' / ');
                          const curr = parseFloat(currStr) || 0;
                          const target = parseFloat(targetStr) || 1;
                          const progressPct = Math.min(100, (curr / target) * 100);

                          return (
                            <div 
                              key={medal.id}
                              className={cn(
                                "p-3.5 rounded-2xl border flex gap-3.5 transition-all",
                                medal.status 
                                  ? "bg-neutral-900 border-indigo-500/50 shadow-[0_4px_12px_rgba(99,102,241,0.1)]" 
                                  : "bg-neutral-900/40 border-neutral-850 opacity-60"
                              )}
                            >
                              {/* Glowing Icon indicator */}
                              <div className={cn(
                                "w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-xl shadow-inner border transition-all",
                                medal.status 
                                  ? "bg-indigo-600/20 border-indigo-500/40 text-rose-450 animate-pulse" 
                                  : "bg-neutral-950 border-neutral-800 text-neutral-600 grayscale"
                              )}>
                                {medal.status ? getBadgeIcon(medal.category) : "🔒"}
                              </div>

                              <div className="flex-1 min-w-0 space-y-1 text-left">
                                <div className="flex justify-between items-baseline">
                                  <span className={cn(
                                    "font-black text-xs truncate",
                                    medal.status ? "text-indigo-300" : "text-neutral-400"
                                  )}>
                                    {medal.title}
                                  </span>
                                  {medal.status ? (
                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">解鎖完成</span>
                                  ) : (
                                    <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-wider">進度鎖定</span>
                                  )}
                                </div>
                                <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">{medal.description}</p>
                                
                                {/* Inner Micro Progress Bar for locked items */}
                                {!medal.status && (
                                  <div className="space-y-1 block pt-1">
                                    <div className="flex justify-between text-[8px] text-neutral-500 font-bold">
                                      <span>挑戰進度</span>
                                      <span>{medal.progress}</span>
                                    </div>
                                    <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden">
                                      <div className="h-full bg-neutral-700" style={{ width: `${progressPct}%` }} />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="p-4 border-t border-neutral-800 bg-neutral-950/40 text-center">
                <button
                  onClick={() => setIsAchievementsOpen(false)}
                  className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition-all border border-neutral-700 cursor-pointer text-center"
                >
                  確認關閉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔑 Auth Modal (Login/Signup/Forgot) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(msg) => setGameToast({ message: msg, type: 'success' })}
        defaultTab={authModalDefaultTab}
      />

      {/* Decorative Gradient Overlays */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-40 z-0" />
    </div>
  );
}

