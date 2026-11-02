// RankController.js - Gerenciamento de Progressão no LibrasGo

const RANKS = [
  { id: 'bronze', name: 'Bronze', minXP: 0 },
  { id: 'prata', name: 'Prata', minXP: 100 },
  { id: 'ouro', name: 'Ouro', minXP: 500 },
  { id: 'safira', name: 'Safira', minXP: 1200 },
  { id: 'diamante', name: 'Diamante', minXP: 2500 }
];

export function calculateRank(xp) {
  let currentRank = RANKS[0];
  let nextRank = RANKS[1];

  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      currentRank = RANKS[i];
      nextRank = RANKS[i + 1] || null;
      break;
    }
  }

  return {
    currentRank,
    nextRank,
    isMaxRank: !nextRank,
    progressToNext: nextRank ? ((xp - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100 : 100
  };
}

export function checkRankUpgrade(previousXP, newXP) {
  const oldRank = calculateRank(previousXP).currentRank;
  const newRank = calculateRank(newXP).currentRank;

  if (oldRank.id !== newRank.id) {
    return {
      upgraded: true,
      oldRank: oldRank.name,
      newRank: newRank.name,
      message: `Parabéns! Você alcançou o rank ${newRank.name} no LibrasGo! 🎉`
    };
  }

  return { upgraded: false };
}
