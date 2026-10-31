import React, { useState, useMemo } from 'react';
import { Check, Lock, Star, Sparkles, Award, Gift, Flame, CheckCircle2, Smile, Eye, ChevronRight } from 'lucide-react';
import { LEARNING_MODULES } from '../../data/lessonsData';
import { Lesson, LearningModule, UserStats } from '../../types/libras';
import { audio } from '../../services/audioService';
import { LibrinhaMascot } from '../Mascot/LibrinhaMascot';
import { ModuleChestModal } from './ModuleChestModal';

interface PathViewProps {
  userStats: UserStats;
  modules?: LearningModule[];
  onSelectLesson: (lesson: Lesson) => void;
  onOpenARStudio: (signId?: string) => void;
  onOpenFacialPractice?: () => void;
  onOpenTeachFacial?: () => void;
  onClaimModuleChest: (moduleId: string, rewards: { xp: number; gems: number; hearts: number }) => void;
}

export const PathView: React.FC<PathViewProps> = ({
  userStats,
  modules,
  onSelectLesson,
  onOpenARStudio,
  onOpenFacialPractice,
  onOpenTeachFacial,
  onClaimModuleChest,
}) => {
  const [selectedChestModule, setSelectedChestModule] = useState<LearningModule | null>(null);

  const activeModules = useMemo(() => {
    return (modules || LEARNING_MODULES).filter((m) => m.enabled !== false);
  }, [modules]);

  const allLessons = useMemo(() => {
    return activeModules.flatMap((mod) => mod.lessons);
  }, [activeModules]);

  const firstIncompleteIndex = useMemo(() => {
    return allLessons.findIndex((l) => !userStats.completedLessonIds.includes(l.id));
  }, [allLessons, userStats.completedLessonIds]);

  // Check whether a lesson is unlocked or completed
  const isLessonCompleted = (lessonId: string) => {
    return userStats.completedLessonIds.includes(lessonId);
  };

  const isLessonActive = (lessonId: string, _indexOverall: number) => {
    if (isLessonCompleted(lessonId)) return false;
    if (allLessons[firstIncompleteIndex]?.id === lessonId) return true;
    const lesson = allLessons.find((l) => l.id === lessonId);
    if ((lesson?.moduleId === 'mod_facial' || lesson?.moduleId === 'mod_community') && !isLessonCompleted(lessonId)) {
      const modLessons = allLessons.filter((l) => l.moduleId === lesson?.moduleId);
      const firstInMod = modLessons.find((l) => !isLessonCompleted(l.id));
      if (firstInMod?.id === lessonId) return true;
    }
    return false;
  };

  const isLessonLocked = (lessonId: string) => {
    if (isLessonCompleted(lessonId)) return false;
    const lesson = allLessons.find((l) => l.id === lessonId);
    if (lesson?.moduleId === 'mod_facial' || lesson?.moduleId === 'mod_community') {
      return false;
    }
    if (firstIncompleteIndex === -1) return false;
    const thisIndex = allLessons.findIndex((l) => l.id === lessonId);
    return thisIndex > firstIncompleteIndex;
  };

  // Horizontal zigzag offset calculation for Duolingo path
  const getZigZagOffset = (index: number) => {
    const cycle = index % 4;
    switch (cycle) {
      case 0:
        return 'translate-x-0';
      case 1:
        return '-translate-x-12 sm:-translate-x-16';
      case 2:
        return 'translate-x-0';
      case 3:
        return 'translate-x-12 sm:translate-x-16';
      default:
        return 'translate-x-0';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 text-white">
      
      {/* Daily Banner / Community Greeting */}
      <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/30 shadow-xl flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
              Trilha Diária • Nível {userStats.level}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-400" /> {userStats.streak} dias seguidos
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Continue sua jornada em Libras!
          </h1>
          <p className="text-slate-300 text-xs mt-1">
            Pratique sinais com sua câmera e suba no ranking da Liga Ouro.
          </p>
        </div>

        {/* Mascot guide */}
        <div className="hidden sm:block flex-shrink-0">
          <LibrinhaMascot
            mascotId={userStats.activeMascotId || 'librinha'}
            mood="happy"
            size={85}
            equipped={userStats.equippedMascot}
          />
        </div>
      </div>

      {/* DEDICATED FACIAL EXPRESSIONS & NON-MANUAL MODULE BANNER */}
      {onOpenFacialPractice && (
        <div className="mb-8 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 text-white shadow-xl shadow-purple-950/30 border border-purple-500/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 w-32 h-32 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  Módulo Especial de Libras • Novo
                </span>
                <span className="text-xs font-bold text-white/90">
                  {(userStats.completedFacialExerciseIds || []).length} / 11 Desafios Concluídos
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black leading-tight flex items-center gap-2 text-white">
                <span>Expressões Faciais & Movimentos de Cabeça</span>
                <Sparkles className="w-5 h-5 text-amber-300" />
              </h2>
              <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-xl leading-relaxed">
                Pratique interrogativas, afirmação, negação e intensidade com a câmera frontal, molde facial holográfico e desbloqueie acessórios para a Librinha.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {onOpenTeachFacial && (
                <button
                  onClick={() => {
                    audio.playClick();
                    onOpenTeachFacial();
                  }}
                  className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-600/30 hover:scale-103 active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  title="Ensinar novas expressões faciais à IA para praticar na trilha"
                >
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                  <span>Ensinar à IA</span>
                </button>
              )}

              <button
                onClick={() => {
                  audio.playClick();
                  onOpenFacialPractice();
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/30 hover:scale-103 active:scale-97 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Smile className="w-4 h-4 fill-slate-950" />
                <span>Abrir Módulo Facial</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modules & Stepped Path */}
      <div className="space-y-12">
        {activeModules.map((module, modIdx) => (
          <div key={module.id} className="relative">
            
            {/* Module Island Header */}
            <div
              className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-r ${module.themeColor} text-white shadow-xl shadow-emerald-950/20 mb-8 border border-white/20`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-black uppercase tracking-wider bg-black/25 px-2.5 py-0.5 rounded-full">
                  Nível {module.level}
                </span>
                <span className="text-xs font-bold text-white/90">
                  {module.lessons.filter((l) => isLessonCompleted(l.id)).length} / {module.lessons.length} Concluídas
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-sm">
                {module.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/90 mt-1 max-w-lg">
                {module.subtitle}
              </p>
            </div>

            {/* Stepped Meandering Lesson Buttons */}
            <div className="relative flex flex-col items-center gap-6 sm:gap-8 py-2">
              
              {/* Connecting dashed path line */}
              <div className="absolute top-8 bottom-8 w-1 border-r-2 border-dashed border-slate-700/80 -z-0"></div>

              {module.lessons.map((lesson, lessonIdx) => {
                const completed = isLessonCompleted(lesson.id);
                const active = isLessonActive(lesson.id, lessonIdx);
                const locked = isLessonLocked(lesson.id);
                const offsetClass = getZigZagOffset(lessonIdx);

                return (
                  <div key={lesson.id} className={`relative z-10 flex flex-col items-center ${offsetClass}`}>
                    
                    {/* Active Floating Speech Bubble */}
                    {active && (
                      <div className="absolute -top-9 z-20 animate-bounce">
                        <div className="bg-emerald-400 text-slate-950 px-3 py-1 rounded-full text-xs font-black shadow-lg shadow-emerald-400/40 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>COMEÇAR</span>
                        </div>
                      </div>
                    )}

                    {/* Lesson Node Button */}
                    <button
                      disabled={locked}
                      onClick={() => {
                        audio.playClick();
                        onSelectLesson(lesson);
                      }}
                      className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer transform hover:scale-105 active:scale-95 shadow-2xl ${
                        completed
                          ? 'bg-gradient-to-b from-amber-400 to-amber-500 border-4 border-amber-300 text-slate-950 shadow-amber-500/30'
                          : active
                          ? 'bg-gradient-to-b from-emerald-400 to-teal-500 border-4 border-emerald-300 text-slate-950 shadow-emerald-500/50 ring-8 ring-emerald-500/25 animate-pulse'
                          : 'bg-slate-800 border-4 border-slate-700 text-slate-500 cursor-not-allowed opacity-75'
                      }`}
                      aria-label={`Lição: ${lesson.title}`}
                    >
                      {completed ? (
                        <>
                          <Check className="w-8 h-8 stroke-[3.5] text-slate-950" />
                          <div className="flex gap-0.5 mt-0.5">
                            <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                            <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                            <Star className="w-3 h-3 fill-slate-950 text-slate-950" />
                          </div>
                        </>
                      ) : active ? (
                        <>
                          <span className="text-3xl">🤟</span>
                          <span className="text-[10px] font-black tracking-tight mt-0.5 uppercase">
                            Lição {lessonIdx + 1}
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-6 h-6 text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-500 mt-1">
                            Bloqueado
                          </span>
                        </>
                      )}
                    </button>

                    {/* Label below button */}
                    <div className="mt-2 text-center max-w-[150px]">
                      <span className={`text-xs font-black block leading-tight ${completed ? 'text-amber-300' : active ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {lesson.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        +{lesson.xpReward} XP
                      </span>
                    </div>

                    {/* Mascot cheer on active node */}
                    {active && (
                      <div className="hidden sm:block absolute left-28 top-0">
                        <LibrinhaMascot
                          mascotId={userStats.activeMascotId || 'librinha'}
                          mood="encouraging"
                          message="Você consegue! Vamos praticar juntos na câmera!"
                          size={80}
                          equipped={userStats.equippedMascot}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Milestone Chest Node */}
              {(() => {
                const completedCount = module.lessons.filter((l) => isLessonCompleted(l.id)).length;
                const isModuleComplete = completedCount === module.lessons.length;
                const isChestClaimed = (userStats.claimedChestIds || []).includes(module.id);

                return (
                  <div className="relative z-10 flex flex-col items-center mt-3">
                    {/* Floating notification badge for ready chest */}
                    {isModuleComplete && !isChestClaimed && (
                      <div className="absolute -top-7 z-20 animate-bounce">
                        <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-lg shadow-amber-400/40 uppercase tracking-wider flex items-center gap-1 border border-yellow-200">
                          <Gift className="w-3 h-3 fill-slate-950" />
                          <span>ABRIR!</span>
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      className={`relative w-18 h-18 sm:w-20 sm:h-20 rounded-3xl flex flex-col items-center justify-center shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 active:scale-95 ${
                        isChestClaimed
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-3 border-emerald-300 text-slate-950 shadow-emerald-500/20'
                          : isModuleComplete
                          ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 border-4 border-yellow-100 text-slate-950 shadow-amber-500/50 ring-4 ring-amber-400/30 animate-pulse'
                          : 'bg-slate-800/90 hover:bg-slate-800 border-3 border-slate-700 hover:border-amber-500/50 text-amber-400 shadow-slate-900/40'
                      }`}
                      onClick={() => {
                        if (isModuleComplete && !isChestClaimed) {
                          audio.playVictory();
                        } else {
                          audio.playClick();
                        }
                        setSelectedChestModule(module);
                      }}
                      aria-label={`Baú de Recompensas do Módulo ${modIdx + 1}`}
                      title="Toque para ver e resgatar recompensas do módulo!"
                    >
                      {isChestClaimed ? (
                        <>
                          <CheckCircle2 className="w-7 h-7 text-slate-950 stroke-[2.5]" />
                          <span className="text-[9px] font-black text-slate-950 uppercase tracking-tight mt-0.5">
                            Resgatado
                          </span>
                        </>
                      ) : isModuleComplete ? (
                        <>
                          <Gift className="w-8 h-8 text-slate-950 animate-bounce stroke-[2.2]" />
                          <Sparkles className="w-3.5 h-3.5 text-amber-950 absolute top-1.5 right-1.5 animate-spin" />
                        </>
                      ) : (
                        <>
                          <Gift className="w-7 h-7 text-amber-400" />
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                            {completedCount}/{module.lessons.length}
                          </span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] font-bold text-amber-300 mt-1.5 flex items-center gap-1">
                      <span>Baú do Módulo {module.level}</span>
                      {isChestClaimed && <span className="text-emerald-400">✓</span>}
                    </span>
                  </div>
                );
              })()}

            </div>
          </div>
        ))}
      </div>

      {/* Interactive Module Chest Modal */}
      {selectedChestModule && (
        <ModuleChestModal
          module={selectedChestModule}
          userStats={userStats}
          onClose={() => setSelectedChestModule(null)}
          onClaimRewards={(moduleId, rewards) => {
            onClaimModuleChest(moduleId, rewards);
          }}
          onSelectLesson={(lesson) => {
            setSelectedChestModule(null);
            onSelectLesson(lesson);
          }}
        />
      )}
    </div>
  );
};
