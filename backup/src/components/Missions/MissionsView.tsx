import React from 'react';
import { Target, Award, CheckCircle2, Gift, Sparkles, Flame, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DailyMission, Achievement } from '../../types/libras';
import { audio } from '../../services/audioService';

interface MissionsViewProps {
  missions: DailyMission[];
  achievements: Achievement[];
  onClaimMission: (missionId: string) => void;
}

export const MissionsView: React.FC<MissionsViewProps> = ({
  missions,
  achievements,
  onClaimMission,
}) => {
  const handleClaim = (mission: DailyMission) => {
    audio.playSuccess();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#fbbf24', '#10b981'],
    });
    onClaimMission(mission.id);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 text-white space-y-8">
      
      {/* Daily Missions Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-black">Missões Diárias</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">Renovam em 14h</span>
        </div>

        <div className="space-y-3">
          {missions.map((mission) => {
            const isFinished = mission.currentProgress >= mission.targetProgress;
            const progressPct = Math.min(100, Math.round((mission.currentProgress / mission.targetProgress) * 100));

            return (
              <div
                key={mission.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 shadow-md"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-black text-white">{mission.title}</h3>
                    <span className="text-xs font-bold text-slate-400">
                      {mission.currentProgress} / {mission.targetProgress}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{mission.description}</p>
                  
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Claim / Reward Button */}
                <div className="flex-shrink-0">
                  {mission.isClaimed ? (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-500 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Coletado
                    </span>
                  ) : isFinished ? (
                    <button
                      onClick={() => handleClaim(mission)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-all cursor-pointer animate-bounce flex items-center gap-1.5"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      <span>Resgatar!</span>
                    </button>
                  ) : (
                    <div className="text-right text-xs">
                      <span className="text-emerald-400 font-black block">+{mission.xpReward} XP</span>
                      <span className="text-cyan-400 font-bold block">+{mission.gemReward} Gemas</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Achievements / Galeria de Troféus */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black">Galeria de Conquistas</h2>
          </div>
          <span className="text-xs font-bold text-amber-400">
            {achievements.filter((a) => a.unlocked).length} de {achievements.length} Desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {achievements.map((ach) => {
            const isUnlocked = ach.unlocked;

            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  isUnlocked
                    ? 'bg-slate-900 border-amber-500/40 text-white shadow-lg shadow-amber-500/5'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 opacity-70'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl ${
                    isUnlocked
                      ? ach.tier === 'gold'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                >
                  {isUnlocked ? (ach.tier === 'gold' ? '🏆' : '🥈') : '🔒'}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-bold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>
                      {ach.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{ach.description}</p>
                  
                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-semibold">
                      Progresso: {ach.progress} / {ach.maxProgress}
                    </span>
                    {isUnlocked && (
                      <span className="text-amber-400 font-bold uppercase">Conquistado!</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
