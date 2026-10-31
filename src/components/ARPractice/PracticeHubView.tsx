import React, { useState, useCallback } from 'react';
import {
  Camera,
  Sparkles,
  Smile,
  Hand,
  Bot,
  Layers,
  ChevronRight,
  Flame,
  Award,
  Compass,
} from 'lucide-react';
import { ARCameraView } from './ARCameraView';
import { FacialPracticeView } from './FacialPracticeView';
import { AITeachSignView } from './AITeachSignView';
import { AITeachFacialView } from './AITeachFacialView';
import { UserStats, LibrasSign } from '../../types/libras';
import { audio } from '../../services/audioService';

export type PracticeTabMode = 'facial' | 'teach_facial' | 'signs_ar' | 'teach_ai';

interface PracticeHubViewProps {
  userStats: UserStats;
  signs?: LibrasSign[];
  targetSignId?: string;
  defaultMode?: PracticeTabMode;
  isLessonModalOpen?: boolean;
  onSignCompletedInAR?: (signId: string, accuracy: number) => void;
  onCompleteFacialExercise?: (xp: number, gems: number, exerciseId: string, mascotItemId?: string) => void;
  onAwardXp?: (xp: number, gems: number) => void;
  onTaughtSignSaved?: () => void;
}

export const PracticeHubView: React.FC<PracticeHubViewProps> = ({
  userStats,
  signs,
  targetSignId = 'letra_a',
  defaultMode = 'facial',
  isLessonModalOpen = false,
  onSignCompletedInAR,
  onCompleteFacialExercise,
  onAwardXp,
  onTaughtSignSaved,
}) => {
  const [activeMode, setActiveMode] = useState<PracticeTabMode>(defaultMode);

  const handleFacialComplete = useCallback((xp: number, gems: number, exId: string, mascotItemId?: string) => {
    if (onCompleteFacialExercise) {
      onCompleteFacialExercise(xp, gems, exId, mascotItemId);
    }
  }, [onCompleteFacialExercise]);

  const handleOpenSignStudio = useCallback(() => {
    setActiveMode('signs_ar');
  }, []);

  const handleOpenTeachFacial = useCallback(() => {
    setActiveMode('teach_facial');
  }, []);

  return (
    <div className="w-full flex-1 flex flex-col">
      {/* Top Main Mode Navigator */}
      <div className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-16 z-30 px-3 sm:px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-start gap-2 overflow-x-auto no-scrollbar px-1">
          
          {/* Tab 1: Expressões Faciais & RA */}
          <button
            onClick={() => {
              audio.playClick();
              setActiveMode('facial');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeMode === 'facial'
                ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white shadow-lg shadow-indigo-500/30 scale-102'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Smile className="w-4 h-4 text-amber-300" />
            <span>Expressões Faciais & RA</span>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded-full bg-black/30 text-amber-300">
              Prática
            </span>
          </button>

          {/* Tab 2: Ensinar Expressões à IA (NOVA ABA) */}
          <button
            onClick={() => {
              audio.playClick();
              setActiveMode('teach_facial');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeMode === 'teach_facial'
                ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-blue-500/30 scale-102'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" />
            <span>Ensinar Expressões à IA</span>
            <span className="text-[10px] uppercase font-black px-1.5 py-0.2 rounded-full bg-cyan-400 text-slate-950">
              Novo
            </span>
          </button>

          {/* Tab 3: Estúdio AR de Sinais (Mãos) */}
          <button
            onClick={() => {
              audio.playClick();
              setActiveMode('signs_ar');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeMode === 'signs_ar'
                ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-lg shadow-cyan-500/30 scale-102'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Estúdio AR de Sinais</span>
          </button>

          {/* Tab 4: Ensinar Sinais à IA */}
          <button
            onClick={() => {
              audio.playClick();
              setActiveMode('teach_ai');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeMode === 'teach_ai'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/30 scale-102'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Ensinar Sinais à IA</span>
          </button>
        </div>
      </div>

      {/* Render Active Studio Sub-View */}
      <div className="flex-1">
        {activeMode === 'facial' && (
          <FacialPracticeView
            userStats={userStats}
            signs={signs}
            isSuspended={isLessonModalOpen}
            onCompleteExercise={handleFacialComplete}
            onOpenSignStudio={handleOpenSignStudio}
            onOpenTeachFacial={handleOpenTeachFacial}
          />
        )}

        {activeMode === 'teach_facial' && (
          <AITeachFacialView
            userStats={userStats}
            onAwardXp={onAwardXp}
            onExpressionSaved={() => {
              if (onTaughtSignSaved) onTaughtSignSaved();
            }}
            onPracticeInStudio={() => {
              setActiveMode('facial');
            }}
          />
        )}

        {activeMode === 'signs_ar' && (
          <div className="w-full max-w-4xl mx-auto px-4 py-6 pb-24">
            <div className="mb-4 text-center sm:text-left">
              <span className="text-xs uppercase font-extrabold tracking-wider text-cyan-400">
                Laboratório Livre de Realidade Aumentada
              </span>
              <h1 className="text-2xl font-black text-white">
                Prática Interativa de Sinais em Tempo Real
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Fique na frente da câmera. A IA analisa sua mão e fornece feedback visual holográfico instantâneo.
              </p>
            </div>

            <ARCameraView
              initialSignId={targetSignId}
              signs={signs}
              isStandalone={true}
              onSignCompleted={onSignCompletedInAR}
            />
          </div>
        )}

        {activeMode === 'teach_ai' && (
          <AITeachSignView
            userStats={userStats}
            onAwardXp={onAwardXp}
            onTaughtSignSaved={onTaughtSignSaved}
          />
        )}
      </div>
    </div>
  );
};
