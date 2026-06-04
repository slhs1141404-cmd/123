/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User as FirebaseUser } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc,
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { PlayerStats, LeaderboardEntry } from '../types';
import { getLevelDetails, checkAchievements } from '../utils/gamification';

export interface FirebaseUserProfile {
  username: string;
  email: string;
  level: number;
  xp: number;
  totalScore: number;
  highestScore: number;
  longestCombo: number;
  gamesPlayed: number;
  achievements: string[];
  createdAt: any;
  lastLogin: any;
}

/**
 * Synchronize the authenticated user with Firestore.
 * If the user's document does *not* exist in Firestore, initialize it with current local stats and name.
 * If it does exist, fetch and return the server data to keep local storage up-to-date.
 */
export async function syncUserProfile(
  user: FirebaseUser, 
  localStats: PlayerStats, 
  localXP: number, 
  localName: string
): Promise<FirebaseUserProfile> {
  const userPath = `users/${user.uid}`;
  try {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const serverData = docSnap.data() as FirebaseUserProfile;
      
      // Update the user's lastLogin field using serverTimestamp()
      await updateDoc(userDocRef, {
        lastLogin: serverTimestamp()
      });
      return {
        ...serverData,
        lastLogin: new Date()
      };
    } else {
      // First-time registration / creation of user profile on Firestore
      const initialAchievements = checkAchievements(localStats, localStats.highestTotalScore)
        .filter(a => a.status)
        .map(a => a.id);

      const resolvedName = localName && localName !== 'Guest 探險家' && localName !== '匿名的探險家' 
        ? localName 
        : (user.displayName || '新晉世界探險家');

      const initialProfile: FirebaseUserProfile = {
        username: resolvedName,
        email: user.email || '',
        level: getLevelDetails(localXP).level,
        xp: localXP,
        totalScore: 0,
        highestScore: localStats.highestTotalScore,
        longestCombo: localStats.longestCombo,
        gamesPlayed: localStats.playCount,
        achievements: initialAchievements,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };

      await setDoc(userDocRef, initialProfile);
      return initialProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
    throw error;
  }
}

/**
 * Update user specifications in Firestore when they modify their nickname or complete a game.
 */
export async function updateUserStatsAndXP(
  userId: string, 
  stats: PlayerStats, 
  xp: number, 
  username: string
): Promise<void> {
  const userPath = `users/${userId}`;
  try {
    const userDocRef = doc(db, 'users', userId);
    const unlockedAchievements = checkAchievements(stats, stats.highestTotalScore)
      .filter(a => a.status)
      .map(a => a.id);

    const levelDetails = getLevelDetails(xp);

    await updateDoc(userDocRef, {
      username,
      level: levelDetails.level,
      xp,
      highestScore: stats.highestTotalScore,
      longestCombo: stats.longestCombo,
      gamesPlayed: stats.playCount,
      achievements: unlockedAchievements,
      lastLogin: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

/**
 * Submit score directly to the global database collection.
 */
export async function submitLeaderboardScoreToFirebase(
  playerName: string, 
  totalScore: number, 
  averageDistance: number, 
  level: number
): Promise<void> {
  const collectionPath = 'leaderboard';
  try {
    await addDoc(collection(db, collectionPath), {
      playerName,
      totalScore,
      averageDistance: Math.round(averageDistance),
      level,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
}

/**
 * Retrieve the top 100 entries on the global leaderboard from Firebase.
 */
export async function getLeaderboardFromFirebase(): Promise<LeaderboardEntry[]> {
  const collectionPath = 'leaderboard';
  try {
    const q = query(
      collection(db, collectionPath),
      orderBy('totalScore', 'desc'),
      orderBy('averageDistance', 'asc'),
      limit(100)
    );
    const snap = await getDocs(q);
    const entries: LeaderboardEntry[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      let createdAtStr = new Date().toISOString();
      if (data.createdAt instanceof Timestamp) {
        createdAtStr = data.createdAt.toDate().toISOString();
      } else if (data.createdAt?.seconds) {
        createdAtStr = new Date(data.createdAt.seconds * 1000).toISOString();
      }
      entries.push({
        id: doc.id,
        playerName: data.playerName || '世界探險家',
        totalScore: data.totalScore || 0,
        averageDistance: data.averageDistance || 0,
        level: data.level || 1,
        createdAt: createdAtStr
      });
    });
    return entries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
    throw error;
  }
}
