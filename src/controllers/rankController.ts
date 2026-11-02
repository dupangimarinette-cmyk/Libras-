// rankController.ts - Gerenciamento de Progressão e Ranks no LibrasGo
import { RankConfig, RankId } from '../types/libras';
import { RANKS_CONFIG, RANKS_BY_ID } from '../data/ranksData';

export interface RankCalculationResult {
  currentRank: RankConfig;
  nextRank: RankConfig | null;
  isMaxRank: boolean;
  progressToNext: number; // 0 - 100%
  xpRemaining: number;
}

export interface RankUpgradeResult {
  upgraded: boolean;
  oldRank?: RankConfig;
  newRank?: RankConfig;
  rewards?: RankConfig['virtualRewards'];
  message?: string;
}

/**
 * Calcula o rank atual e próximo rank do usuário com base no XP total acumulado.
 * Bronze (0 - 99 XP)
 * Prata (100 - 499 XP)
 * Ouro (500 - 1.199 XP)
 * Safira (1.200 - 2.499 XP) - Novo!
 * Diamante (2.500+ XP) - Novo!
 */
export function calculateRank(xp: number): RankCalculationResult {
  const safeXp = Math.max(0, Number(xp) || 0);
  let currentRank = RANKS_CONFIG[0];
  let nextRank: RankConfig | null = RANKS_CONFIG[1] || null;

  for (let i = RANKS_CONFIG.length - 1; i >= 0; i--) {
    if (safeXp >= RANKS_CONFIG[i].minXP) {
      currentRank = RANKS_CONFIG[i];
      nextRank = RANKS_CONFIG[i + 1] || null;
      break;
    }
  }

  const isMaxRank = !nextRank;
  let progressToNext = 100;
  let xpRemaining = 0;

  if (nextRank) {
    const range = nextRank.minXP - currentRank.minXP;
    const earnedInRange = safeXp - currentRank.minXP;
    progressToNext = Math.min(100, Math.max(0, Math.round((earnedInRange / range) * 100)));
    xpRemaining = Math.max(0, nextRank.minXP - safeXp);
  }

  return {
    currentRank,
    nextRank,
    isMaxRank,
    progressToNext,
    xpRemaining,
  };
}

/**
 * Verifica se houve evolução de rank entre dois valores de XP.
 * Dispara comemoração e concede distintivos e recompensas virtuais automaticamente.
 */
export function checkRankUpgrade(previousXP: number, newXP: number): RankUpgradeResult {
  const oldRank = calculateRank(previousXP).currentRank;
  const newRank = calculateRank(newXP).currentRank;

  if (oldRank.id !== newRank.id && newRank.minXP > oldRank.minXP) {
    return {
      upgraded: true,
      oldRank,
      newRank,
      rewards: newRank.virtualRewards,
      message: `Parabéns! Você alcançou o rank ${newRank.name} no LibrasGo! 🎉`,
    };
  }

  return { upgraded: false };
}

export function getRankConfig(rankId: RankId | string): RankConfig {
  const normalized = (rankId || '').toLowerCase() as RankId;
  return RANKS_BY_ID[normalized] || RANKS_CONFIG[0];
}

export function getAllRanks(): RankConfig[] {
  return RANKS_CONFIG;
}
