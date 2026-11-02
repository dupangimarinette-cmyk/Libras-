import React from 'react';
import { Sparkles, Trophy, Gem, Crown, Award, CheckCircle2, Gift, X } from 'lucide-react';
import { RankConfig } from '../../types/libras';
import { audio } from '../../services/audioService';

interface RankUpgradeModalProps {
  rank: RankConfig;
  onClose: () => void;
}

export const RankUpgradeModal: React.FC<RankUpgradeModalProps> = ({ rank, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border-2 ${rank.borderClass} shadow-2xl text-center space-y-5 animate-scale-up`}
        style={{
          boxShadow: `0 0 50px ${rank.color}40`,
        }}
      >
        {/* Glow backdrop */}
        <div
          className="absolute -top-20 inset-x-0 mx-auto w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: rank.color }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Big Rank Badge Trophy */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center shadow-xl border-2"
            style={{
              background: `linear-gradient(135deg, ${rank.color}40, #0f172a)`,
              borderColor: rank.color,
            }}
          >
            <span className="text-5xl animate-bounce">{rank.badgeEmoji}</span>
          </div>
          <Sparkles className="absolute -top-2 -right-2 w-7 h-7 text-amber-300 animate-spin-slow" />
        </div>

        {/* Title & Celebration Text */}
        <div className="space-y-1">
          <span className="text-xs uppercase font-black tracking-widest text-emerald-400">
            Nova Conquista de Rank!
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white capitalize">
            Rank <span style={{ color: rank.color }}>{rank.name}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            {rank.description}
          </p>
        </div>

        {/* Recompensas Virtuais Desbloqueadas */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2.5 text-left">
          <span className="text-[11px] uppercase font-black text-amber-400 block tracking-wider">
            Recompensas Virtuais Conquistadas:
          </span>

          <div className="flex items-center gap-2.5 text-xs text-slate-200">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Gem className="w-4 h-4" />
            </div>
            <span>
              <strong>+{rank.virtualRewards.gems} Diamantes</strong> adicionados à sua conta
            </span>
          </div>

          {rank.virtualRewards.title && (
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <span>
                Título Exclusivo: <strong className="text-purple-300 font-bold">"{rank.virtualRewards.title}"</strong>
              </span>
            </div>
          )}

          {rank.virtualRewards.chestRarity && (
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4" />
              </div>
              <span>
                Baú Misterioso <strong className="capitalize text-amber-300">{rank.virtualRewards.chestRarity}</strong> Desbloqueado!
              </span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            audio.playSuccess();
            onClose();
          }}
          className="w-full py-3 px-6 rounded-2xl text-slate-950 font-black text-sm transition-all shadow-xl hover:brightness-110 cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${rank.color}, #10b981)`,
          }}
        >
          Resgatar e Continuar Estudando 🤟
        </button>
      </div>
    </div>
  );
};
