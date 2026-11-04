import React from 'react';

const RANK_THEMES = {
  ouro: { color: '#FFD700', border: 'border-yellow-400', bg: 'bg-yellow-50' },
  safira: { color: '#0F52BA', border: 'border-blue-600', bg: 'bg-blue-50', glow: 'shadow-blue-500/50' },
  diamante: { color: '#B9F2FF', border: 'border-cyan-300', bg: 'bg-cyan-50', glow: 'shadow-cyan-400/50' }
};

export const RankBadge = ({ rankId, xp }) => {
  const theme = RANK_THEMES[rankId] || RANK_THEMES.ouro;

  return (
    <div className={`p-4 rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-lg transition-all duration-300 transform hover:scale-105`}>
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md">
          {rankId === 'safira' && <span className="text-2xl">💎</span>}
          {rankId === 'diamante' && <span className="text-2xl">✨</span>}
          {rankId === 'ouro' && <span className="text-2xl">🥇</span>}
        </div>
        <div>
          <h3 className="font-bold text-lg capitalize">{rankId}</h3>
          <p className="text-xs text-gray-600">{xp} XP acumulados</p>
        </div>
      </div>
    </div>
  );
};
