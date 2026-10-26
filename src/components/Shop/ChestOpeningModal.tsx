import React, { useState } from 'react';
import { Sparkles, Trophy, Gift, Check, X, Award, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { MysteryChest, MascotItem } from '../../types/libras';
import { audio } from '../../services/audioService';
import { MASCOT_ITEMS } from '../../data/shopCatalogData';

export interface ChestRewardResult {
  xp: number;
  coins: number;
  unlockedTitle?: string;
  unlockedMascotItem?: MascotItem;
}

interface ChestOpeningModalProps {
  chest: MysteryChest;
  reward: ChestRewardResult;
  onClose: () => void;
  onEquipTitle?: (title: string) => void;
}

export const ChestOpeningModal: React.FC<ChestOpeningModalProps> = ({
  chest,
  reward,
  onClose,
  onEquipTitle,
}) => {
  const [stage, setStage] = useState<'shaking' | 'opened'>('shaking');

  const handleOpen = () => {
    if (stage === 'opened') return;
    audio.playVictory();
    setStage('opened');

    confetti({
      particleCount: chest.rarity === 'lendario' ? 120 : 80,
      spread: 80,
      origin: { y: 0.6 },
      colors:
        chest.rarity === 'lendario'
          ? ['#d946ef', '#ec4899', '#f59e0b', '#38bdf8']
          : ['#fbbf24', '#10b981', '#38bdf8', '#f59e0b'],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-amber-500/40 p-6 sm:p-7 shadow-2xl text-white text-center space-y-5 overflow-hidden">
        
        {/* Glow behind chest */}
        <div
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40 bg-gradient-to-r ${chest.gradient}`}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Chest Title & Rarity */}
        <div>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 border border-white/20 inline-block mb-1.5 ${chest.textColor}`}
          >
            Raridade: {chest.rarity.toUpperCase()}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white">{chest.name}</h2>
        </div>

        {/* Chest Visual */}
        <div className="py-4 flex flex-col items-center justify-center">
          {stage === 'shaking' ? (
            <div
              onClick={handleOpen}
              className="group cursor-pointer flex flex-col items-center transition-transform hover:scale-105 active:scale-95"
            >
              <div
                className={`relative w-32 h-32 rounded-3xl bg-gradient-to-tr ${chest.gradient} ${chest.border} border-4 flex items-center justify-center shadow-2xl animate-bounce`}
              >
                <Gift className="w-16 h-16 text-white stroke-[2.2]" />
                <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-2 -right-2 animate-spin" />
              </div>

              <div className="mt-4 px-4 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-400/40 animate-pulse">
                Toque para Destrancar!
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center animate-fadeIn">
              <div
                className={`w-28 h-28 rounded-3xl bg-gradient-to-tr ${chest.gradient} ${chest.border} border-4 flex items-center justify-center shadow-2xl scale-110 mb-2`}
              >
                <span className="text-5xl animate-bounce">💎</span>
              </div>
              <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
                Baú Aberto com Sucesso!
              </span>
            </div>
          )}
        </div>

        {/* Loot Cards */}
        {stage === 'opened' && (
          <div className="space-y-2.5 text-left animate-fadeIn">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wide block">
              Recompensas Obtidas:
            </span>

            {/* XP Drop */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Experiência Bônus</h4>
                  <span className="text-[10px] text-slate-400">Progresso de nível</span>
                </div>
              </div>
              <span className="text-sm font-black text-amber-400">+{reward.xp} XP</span>
            </div>

            {/* Coins Drop */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Gemas / Moedas</h4>
                  <span className="text-[10px] text-slate-400">Saldo adicionado</span>
                </div>
              </div>
              <span className="text-sm font-black text-cyan-400">+{reward.coins} 💎</span>
            </div>

            {/* Unlocked Title if any */}
            {reward.unlockedTitle && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-purple-400 tracking-wider">
                      Título Exclusivo Desbloqueado!
                    </span>
                    <h4 className="text-xs font-black text-white">{reward.unlockedTitle}</h4>
                  </div>
                </div>
                {onEquipTitle && (
                  <button
                    onClick={() => {
                      audio.playSuccess();
                      onEquipTitle(reward.unlockedTitle!);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] cursor-pointer"
                  >
                    Equipar
                  </button>
                )}
              </div>
            )}

            {/* Unlocked Mascot Item if any */}
            {reward.unlockedMascotItem && (
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg">
                    {reward.unlockedMascotItem.icon}
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-black text-emerald-400 tracking-wider">
                      Item para Mascote Desbloqueado!
                    </span>
                    <h4 className="text-xs font-black text-white">{reward.unlockedMascotItem.name}</h4>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Na Mochila
                </span>
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        <div>
          {stage === 'shaking' ? (
            <button
              onClick={handleOpen}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Gift className="w-4 h-4 fill-slate-950" />
              <span>Abrir Baú</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Coletar e Concluir</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
