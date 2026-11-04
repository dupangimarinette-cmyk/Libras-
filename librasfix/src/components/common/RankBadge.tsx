import React from 'react';
import { Sparkles, Trophy, Award, Crown, Gem, ChevronRight } from 'lucide-react';
import { RankId } from '../../types/libras';
import { getRankConfig, calculateRank } from '../../controllers/rankController';

interface RankBadgeProps {
  rankId: RankId | string;
  xp?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'card' | 'badge' | 'compact' | 'glow';
  showProgress?: boolean;
  onClick?: () => void;
  className?: string;
}

export const RankBadge: React.FC<RankBadgeProps> = ({
  rankId,
  xp,
  size = 'md',
  variant = 'card',
  showProgress = false,
  onClick,
  className = '',
}) => {
  const rank = getRankConfig(rankId);
  const safeXp = xp !== undefined ? xp : rank.minXP;
  const progressInfo = calculateRank(safeXp);

  // Variant: Badge pill (minimal for headers & tags)
  if (variant === 'badge' || variant === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-black shadow-sm transition-all ${rank.borderClass} ${rank.bgClass} ${
          onClick ? 'cursor-pointer hover:scale-105' : ''
        } ${className}`}
        style={{
          boxShadow: rank.id === 'safira' || rank.id === 'diamante' || rank.id === 'ouro'
            ? `0 0 12px ${rank.color}35`
            : undefined,
        }}
      >
        <span className="text-sm">{rank.badgeEmoji}</span>
        <span className="capitalize" style={{ color: rank.color }}>
          {rank.name}
        </span>
        {xp !== undefined && (
          <span className="text-[10px] text-slate-300 font-bold ml-0.5">
            ({xp} XP)
          </span>
        )}
      </div>
    );
  }

  // Variant: Card (Matches User's RankBadge specification with LibrasGo dark modern polish)
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border-2 transition-all duration-300 transform ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${rank.borderClass} ${rank.bgClass} ${rank.glowColor} shadow-xl relative overflow-hidden ${className}`}
      style={{
        boxShadow: `0 8px 24px ${rank.color}25`,
      }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-20"
        style={{ backgroundColor: rank.color }}
      />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3.5">
          {/* Rank Icon with Badge Glow */}
          <div
            className="w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg border border-white/20 flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${rank.color}30, #0f172a)`,
              borderColor: `${rank.color}80`,
            }}
          >
            <span className="text-2xl drop-shadow-md">{rank.badgeEmoji}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-lg capitalize text-white flex items-center gap-1.5">
                <span style={{ color: rank.color }}>{rank.name}</span>
                {rank.id === 'diamante' && <Sparkles className="w-4 h-4 text-cyan-300 animate-spin-slow" />}
                {rank.id === 'safira' && <Gem className="w-3.5 h-3.5 text-blue-400" />}
                {rank.id === 'ouro' && <Trophy className="w-3.5 h-3.5 text-yellow-400" />}
              </h3>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-black/40 text-slate-300 border border-white/10">
                {rank.minXP}+ XP
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {xp !== undefined ? `${xp} XP acumulados` : rank.description}
            </p>
          </div>
        </div>

        {onClick && (
          <ChevronRight className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
        )}
      </div>

      {/* Optional Progress to Next Rank */}
      {showProgress && !progressInfo.isMaxRank && progressInfo.nextRank && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex justify-between text-[11px] font-bold mb-1">
            <span className="text-slate-400">
              Próximo: <strong style={{ color: progressInfo.nextRank.color }}>{progressInfo.nextRank.name}</strong>
            </span>
            <span className="text-slate-300 font-mono">
              Faltam {progressInfo.xpRemaining} XP ({progressInfo.progressToNext}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-900 border border-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${progressInfo.nextRank.gradient}`}
              style={{ width: `${progressInfo.progressToNext}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
