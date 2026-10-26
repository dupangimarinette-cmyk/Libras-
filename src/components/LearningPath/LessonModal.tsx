import React, { useState } from 'react';
import { X, Heart, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Volume2, Trophy, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lesson, Exercise, LibrasSign } from '../../types/libras';
import { SIGNS_BY_ID } from '../../data/signsData';
import { audio } from '../../services/audioService';
import { contentService } from '../../services/contentService';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';
import { ARCameraView } from '../ARPractice/ARCameraView';
import { LibrinhaMascot } from '../Mascot/LibrinhaMascot';

interface LessonModalProps {
  lesson: Lesson;
  userHearts: number;
  onComplete: (xpEarned: number, gemsEarned: number) => void;
  onHeartLost: () => void;
  onRefillHearts?: () => void;
  onClose: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  userHearts,
  onComplete,
  onHeartLost,
  onRefillHearts,
  onClose,
}) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [heartsRemaining, setHeartsRemaining] = useState(userHearts);
  const [isLessonFinished, setIsLessonFinished] = useState(false);
  const [arCompletedForCurrentStep, setArCompletedForCurrentStep] = useState(false);

  const currentExercise: Exercise = lesson.exercises[currentExerciseIndex] || lesson.exercises[0];

  // Resilient sign resolution (static signs + community taught signs + fallback)
  const sharedSigns = contentService.getContent().signs || [];
  const foundSign =
    (currentExercise?.signId ? SIGNS_BY_ID[currentExercise.signId] : null) ||
    sharedSigns.find((s) => s.id === currentExercise?.signId);

  const targetSign: LibrasSign = foundSign || {
    id: currentExercise?.signId || 'custom_sign',
    name: currentExercise?.title || 'Sinal em Libras',
    category: 'cotidiano',
    difficulty: 'iniciante',
    meaning: currentExercise?.instruction || 'Prática de sinal',
    contextSentence: 'Pratique este sinal em Libras com clareza.',
    contextTranslation: 'Em Libras',
    parameters: {
      cm: 'Configuração de mão para o sinal',
      pa: 'Espaço neutro frontal',
      m: 'Movimento contínuo e expressivo',
      o: 'Voltada para a frente',
      ef: 'Expressão facial neutra e atenta',
    },
    svgHandShape: 'custom_community',
    poseRule: {
      thumbExtended: true,
      indexExtended: true,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
      palmOrientation: 'camera',
      descriptionHint: 'Posicione sua mão firme em frente à câmera.',
    },
    tips: ['Mantenha a postura ereta e a mão visível na câmera.'],
  };

  const progressPercent = Math.round(
    ((currentExerciseIndex + (isAnswerChecked && isAnswerCorrect ? 1 : 0)) / Math.max(1, lesson.exercises.length)) * 100
  );

  // Play audio cue
  const handlePronounce = () => {
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(targetSign.name);
      utter.lang = 'pt-BR';
      window.speechSynthesis.speak(utter);
    }
  };

  // Check user answer in Quiz
  const handleCheckQuizAnswer = () => {
    if (!selectedOptionId || !currentExercise.options) return;

    const chosen = currentExercise.options.find((opt) => opt.id === selectedOptionId);
    const correct = Boolean(chosen && chosen.isCorrect);

    setIsAnswerChecked(true);
    setIsAnswerCorrect(correct);

    if (correct) {
      audio.playSuccess();
    } else {
      audio.playError();
      const nextHearts = Math.max(0, heartsRemaining - 1);
      setHeartsRemaining(nextHearts);
      onHeartLost();
    }
  };

  // Next exercise
  const handleProceed = () => {
    audio.playClick();
    if (currentExerciseIndex + 1 < lesson.exercises.length) {
      setCurrentExerciseIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setIsAnswerChecked(false);
      setIsAnswerCorrect(false);
      setArCompletedForCurrentStep(false);
    } else {
      // Completed full lesson!
      audio.playFanfare();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#10b981', '#38bdf8', '#fbbf24', '#f43f5e'],
      });
      setIsLessonFinished(true);
      onComplete(lesson.xpReward, lesson.gemsReward);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-white">
      
      {/* Top Header Bar */}
      <div className="w-full max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-4 border-b border-slate-800">
        <button
          onClick={() => {
            audio.playClick();
            onClose();
          }}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lesson Progress Bar */}
        <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Hearts */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-extrabold text-sm">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>{heartsRemaining}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto flex flex-col justify-between">
        
        {!isLessonFinished ? (
          <div>
            {/* Out of hearts safety banner - allows continuing without auto-exit */}
            {heartsRemaining === 0 && (
              <div className="mb-4 p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between gap-3 text-xs shadow-lg animate-fadeIn">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500 flex-shrink-0 animate-pulse" />
                  <div>
                    <strong className="text-rose-200 block font-black">Corações esgotados!</strong>
                    <span className="text-slate-300">Não se preocupe: você não sairá da atividade. Recarregue agora mesmo!</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audio.playSuccess();
                    setHeartsRemaining(3);
                    if (onRefillHearts) onRefillHearts();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white font-black text-xs transition-all cursor-pointer whitespace-nowrap shadow-md"
                >
                  Recarregar (+3 ❤️)
                </button>
              </div>
            )}

            {/* Step Heading */}
            <div className="mb-4">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                Exercício {currentExerciseIndex + 1} de {lesson.exercises.length} • {currentExercise.title}
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1">
                {currentExercise.instruction}
              </h2>
            </div>

            {/* TYPE 1: Learn Sign Introduction */}
            {currentExercise.type === 'learn' && (
              <div className="space-y-4">
                <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-xl">
                  {/* SVG Illustration */}
                  <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                    <LibrasSignIllustration signId={targetSign.id} size={150} highlightColor="#10b981" />
                  </div>

                  {/* Sign Details */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h3 className="text-2xl font-black text-white">{targetSign.name}</h3>
                      <button
                        onClick={handlePronounce}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                        title="Ouvir pronúncia"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-emerald-400 font-semibold text-sm mb-3">{targetSign.meaning}</p>
                    
                    {/* Grammar summary tags */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left mb-3">
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <strong className="text-emerald-300 block">Configuração de Mão (CM):</strong>
                        <span className="text-slate-300">{targetSign.parameters?.cm ?? 'Configuração de mão padrão'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <strong className="text-cyan-300 block">Ponto Articulação (PA):</strong>
                        <span className="text-slate-300">{targetSign.parameters?.pa ?? 'Espaço neutro frontal'}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-slate-300">
                      💡 <strong>Dica de Ouro:</strong> {targetSign.tips?.[0] ?? 'Observe a postura e o movimento firme.'}
                    </div>
                  </div>
                </div>

                {/* Context example in Libras */}
                <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block">Frase de Exemplo em Libras:</span>
                    <span className="text-white font-bold italic">"{targetSign.contextSentence || 'Praticando em Libras.'}"</span>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">
                    Pronto para a Câmera!
                  </span>
                </div>
              </div>
            )}

            {/* TYPE 2: Real-time AR Camera Challenge */}
            {currentExercise.type === 'ar_challenge' && (
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                  <ARCameraView
                    initialSignId={targetSign.id}
                    isStandalone={false}
                    onSignCompleted={(signId, accuracy) => {
                      setArCompletedForCurrentStep(true);
                      setIsAnswerChecked(true);
                      setIsAnswerCorrect(true);
                    }}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-slate-300">
                    Posicione sua mão no molde na tela e mantenha firme por 1.5s para validar!
                  </span>
                  {arCompletedForCurrentStep && (
                    <span className="text-emerald-400 font-black flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Validado!
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* TYPE 3 & 4: Quiz & Hand Config Questions */}
            {(currentExercise.type === 'identify_sign' || currentExercise.type === 'hand_config') && (
              <div className="space-y-4">
                {/* Visual Anchor for Question */}
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center">
                  <LibrasSignIllustration signId={targetSign.id} size={130} highlightColor="#38bdf8" />
                </div>

                {/* Multiple choice options */}
                <div className="grid grid-cols-1 gap-2.5">
                  {currentExercise.options?.map((option) => {
                    const isSelected = selectedOptionId === option.id;
                    let style = 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-850 hover:border-slate-700';

                    if (isAnswerChecked) {
                      if (option.isCorrect) {
                        style = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold';
                      } else if (isSelected && !option.isCorrect) {
                        style = 'bg-rose-950/60 border-rose-500 text-rose-200 font-bold';
                      }
                    } else if (isSelected) {
                      style = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-500/10';
                    }

                    return (
                      <button
                        key={option.id}
                        disabled={isAnswerChecked}
                        onClick={() => {
                          audio.playClick();
                          setSelectedOptionId(option.id);
                        }}
                        className={`p-3.5 sm:p-4 rounded-2xl border text-left text-sm transition-all flex items-center justify-between cursor-pointer ${style}`}
                      >
                        <div className="flex flex-col">
                          <span>{option.text}</span>
                          {isAnswerChecked && option.explanation && (
                            <span className="text-xs text-slate-400 mt-1">{option.explanation}</span>
                          )}
                        </div>
                        {isSelected && !isAnswerChecked && (
                          <div className="w-4 h-4 rounded-full border-2 border-emerald-400 bg-emerald-400"></div>
                        )}
                        {isAnswerChecked && option.isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Victory Completion Screen */
          <div className="text-center py-8 space-y-6">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-emerald-500/20 border-4 border-emerald-500 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/40 animate-pulse">
                <Trophy className="w-12 h-12 text-emerald-400" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-amber-400 animate-spin" />
            </div>

            <div>
              <h2 className="text-3xl font-black text-white mb-2">Lição Concluída!</h2>
              <p className="text-slate-300 text-sm max-w-sm mx-auto">
                Parabéns! Você praticou Libras com realidade aumentada e dominou novos sinais.
              </p>
            </div>

            <LibrinhaMascot mood="cheering" message="Você foi incrível! Seus sinais estão cada vez mais precisos!" />

            {/* Rewards Breakdown Cards */}
            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-emerald-500/30 flex flex-col items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">XP Ganho</span>
                <span className="text-2xl font-black text-emerald-400">+{lesson.xpReward}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-cyan-500/30 flex flex-col items-center">
                <span className="text-xs text-slate-400 font-bold uppercase">Gemas</span>
                <span className="text-2xl font-black text-cyan-400">+{lesson.gemsReward}</span>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playClick();
                onClose();
              }}
              className="w-full max-w-sm mx-auto py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/30 transition-all cursor-pointer"
            >
              Continuar na Trilha
            </button>
          </div>
        )}

        {/* Bottom Feedback / Action Bar */}
        {!isLessonFinished && (
          <div className="mt-8 pt-4 border-t border-slate-800">
            {/* Duolingo Correct / Incorrect Feedback Banner */}
            {isAnswerChecked && (
              <div
                className={`p-3.5 rounded-2xl mb-3 flex items-center justify-between ${
                  isAnswerCorrect
                    ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-200'
                    : 'bg-rose-950/80 border border-rose-500/60 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isAnswerCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <strong className="block text-sm font-black">
                      {isAnswerCorrect ? 'Excelente! Resposta Certa!' : 'Ops! Não foi dessa vez'}
                    </strong>
                    <span className="text-xs opacity-80">
                      {isAnswerCorrect ? 'Continue com esse foco!' : 'Você perdeu 1 coração, mas pode continuar praticando.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Action Button */}
            {currentExercise.type === 'learn' ? (
              <button
                onClick={handleProceed}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Praticar em AR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentExercise.type === 'ar_challenge' ? (
              <button
                onClick={handleProceed}
                className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  arCompletedForCurrentStep
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                <span>{arCompletedForCurrentStep ? 'Avançar para o Próximo' : 'Pular / Avançar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : !isAnswerChecked ? (
              <button
                disabled={!selectedOptionId}
                onClick={handleCheckQuizAnswer}
                className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all cursor-pointer ${
                  selectedOptionId
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                Verificar Resposta
              </button>
            ) : (
              <button
                onClick={handleProceed}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
