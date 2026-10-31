import React, { useState } from 'react';
import { X, Sparkles, Trophy, Heart, Shield, Lock, CheckCircle2, ArrowRight, Gift } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LearningModule, Lesson, UserStats } from '../../types/libras';
import { audio } from '../../services/audioService';

interface ModuleChestModalProps {
  module: LearningModule;
  userStats: UserStats;
  onClose: () => void;
  onClaimRewards: (moduleId: string, rewards: { xp: number; gems: number; hearts: number }) => void;
  onSelectLesson: (lesson: Lesson) => void;
}

export const ModuleChestModal: React.FC<ModuleChestModalProps> = ({
  module,
  userStats,
  onClose,
  onClaimRewards,
  onSelectLesson,
}) => {
  const completedLessons = module.lessons.filter((l) =>
    userStats.completedLessonIds.includes(l.id)
  );
  const totalLessons = module.lessons.length;
  const isModuleComplete = completedLessons.length === totalLessons;
  const isAlreadyClaimed = (userStats.claimedChestIds || []).includes(module.id);

  // Animation states: 'closed', 'opening', 'opened'
  const [chestState, setChestState] = useState<'closed' | 'opening' | 'opened'>(
    isAlreadyClaimed ? 'opened' : 'closed'
  );
  const [hasClaimedNow, setHasClaimedNow] = useState(false);

  // Next incomplete lesson in this module
  const nextIncompleteLesson = module.lessons.find(
    (l) => !userStats.completedLessonIds.includes(l.id)
  );

  const handleOpenChest = () => {
    if (!isModuleComplete || isAlreadyClaimed || chestState !== 'closed') return;

    audio.playVictory();
    setChestState('opening');

    // Confetti blast!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#10b981', '#38bdf8', '#a855f7'],
    });

    setTimeout(() => {
      setChestState('opened');
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0.2, y: 0.7 },
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 0.8, y: 0.7 },
      });
    }, 600);
  };

  const handleCollect = () => {
    audio.playStarGain();
    setHasClaimedNow(true);
    onClaimRewards(module.id, {
      xp: 150,
      gems: 50,
      hearts: 5,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-amber-500/10 text-white overflow-hidden text-center">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-amber-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-3">
          <Gift className="w-3.5 h-3.5" />
          <span>Baú de Recompensas • Nível {module.level}</span>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
          {module.title}
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
          {module.subtitle}
        </p>

        {/* Chest Visual Representation */}
        <div className="my-6 flex flex-col items-center justify-center">
          {isModuleComplete ? (
            // Chest is Unlocked or Claimed
            <div
              onClick={handleOpenChest}
              className={`relative group ${
                !isAlreadyClaimed && !hasClaimedNow && chestState === 'closed'
                  ? 'cursor-pointer hover:scale-105 active:scale-95'
                  : ''
              } transition-transform duration-300`}
            >
              {/* Pulsing Aura if ready to open */}
              {!isAlreadyClaimed && !hasClaimedNow && (
                <div className="absolute -inset-4 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full blur-xl opacity-50 group-hover:opacity-80 animate-pulse pointer-events-none" />
              )}

              {/* Chest Icon Container */}
              <div
                className={`relative w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
                  chestState === 'opened' || isAlreadyClaimed || hasClaimedNow
                    ? 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 border-4 border-emerald-300 shadow-emerald-500/30 rotate-3'
                    : chestState === 'opening'
                    ? 'bg-gradient-to-tr from-yellow-400 to-amber-500 border-4 border-yellow-200 scale-110 shadow-yellow-500/50 animate-bounce'
                    : 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 border-4 border-amber-300 shadow-amber-500/40 animate-pulse'
                }`}
              >
                {chestState === 'opened' || isAlreadyClaimed || hasClaimedNow ? (
                  <div className="flex flex-col items-center justify-center text-slate-950">
                    <span className="text-4xl animate-bounce">💎</span>
                    <Sparkles className="w-5 h-5 text-yellow-200 absolute -top-2 -right-2 animate-spin" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-950">
                    <Gift className="w-14 h-14 stroke-[2.2] animate-bounce" />
                    <span className="text-[10px] font-black uppercase tracking-wider bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full mt-0.5">
                      TOQUE P/ ABRIR
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Chest is Locked
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border-4 border-slate-700 flex flex-col items-center justify-center shadow-lg text-slate-500">
                <Lock className="w-10 h-10 stroke-[2.2] mb-1 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Bloqueado
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Content based on state */}
        {isAlreadyClaimed || hasClaimedNow ? (
          // ALREADY CLAIMED
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs">
              <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-300 mb-1 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Recompensas Coletadas!</span>
              </div>
              Você já recebeu o bônus máximo deste módulo (+150 XP, +50 Gemas e Vidas cheias). Parabéns pela dedicação aos sinais de Libras!
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Voltar à Trilha
            </button>
          </div>
        ) : isModuleComplete ? (
          // MODULE COMPLETE - READY TO CLAIM
          <div className="space-y-4">
            {chestState === 'closed' ? (
              <>
                <p className="text-sm text-amber-300 font-bold">
                  🎉 Parabéns! Você concluiu todas as {totalLessons} lições deste módulo!
                </p>
                <p className="text-xs text-slate-300">
                  Toque no baú acima ou no botão abaixo para desvendar suas recompensas de mestre.
                </p>

                <button
                  onClick={handleOpenChest}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gift className="w-5 h-5 fill-slate-950" />
                  <span>Abrir Baú de Mestre</span>
                </button>
              </>
            ) : (
              // OPENED STATE - REWARDS REVEALED
              <>
                <div className="text-left space-y-2.5 p-3.5 rounded-2xl bg-slate-800/80 border border-amber-500/30">
                  <span className="text-xs font-bold text-amber-300 block mb-1">
                    Prêmios Desbloqueados:
                  </span>
                  
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Experiência Bônus</span>
                    </div>
                    <span className="text-sm font-black text-amber-400">+150 XP</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Gemas Mágicas</span>
                    </div>
                    <span className="text-sm font-black text-cyan-400">+50 💎</span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center text-rose-400">
                        <Heart className="w-4 h-4 fill-rose-500" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Vidas Restauradas</span>
                    </div>
                    <span className="text-sm font-black text-rose-400">Refil 100% ❤️</span>
                  </div>
                </div>

                <button
                  onClick={handleCollect}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Coletar Recompensas</span>
                </button>
              </>
            )}
          </div>
        ) : (
          // MODULE IN PROGRESS OR LOCKED
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-left">
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className="text-slate-300">Progresso do Módulo:</span>
                <span className="text-amber-400">
                  {completedLessons.length} / {totalLessons} Lições
                </span>
              </div>

              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.round((completedLessons.length / totalLessons) * 100)}%`,
                  }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2">
                Conclua todas as lições deste módulo para abrir o baú e ganhar <strong className="text-amber-300">+150 XP</strong>, <strong className="text-cyan-300">+50 Gemas</strong> e <strong className="text-rose-300">Vidas cheias</strong>!
              </p>
            </div>

            {/* Quick action button to continue */}
            {nextIncompleteLesson ? (
              <button
                onClick={() => {
                  onClose();
                  onSelectLesson(nextIncompleteLesson);
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Fazer Lição: {nextIncompleteLesson.title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Entendido
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
