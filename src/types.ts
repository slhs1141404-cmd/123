/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CountryData {
  name: string;
  commonName: string;
  capital: string;
  population: number;
  languages: string[];
  region: string;
  subregion: string;
  flag: string;
  currency: string;
  latlng: [number, number];
  cca2: string;
  cca3: string;
  currencyCode?: string;
  currencyName?: string;
}

export interface GlobeGeoJSON {
  type: string;
  features: Array<{
    type: string;
    properties: {
      NAME: string;
      ISO_A2: string;
      ISO_A3: string;
    };
    geometry: any;
  }>;
}

export interface PlayerStats {
  highestTotalScore: number;
  bestAverageDistance: number; // minimum average distance
  longestCombo: number;
  playCount: number;
  totalCorrectGuesses: number;
  correctAsiaCount: number;
  correctEuropeCount: number;
  correctAfricaCount: number;
  correctAmericasCount: number;
  correctOceaniaCount: number;
  uniqueGuessedCca3s: string[]; // for collector achievements
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'region' | 'combo' | 'score' | 'play' | 'collector';
  targetValue: number;
  icon: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  totalScore: number;
  averageDistance: number;
  level: number;
  createdAt: string; // date string
  isUser?: boolean;
}
