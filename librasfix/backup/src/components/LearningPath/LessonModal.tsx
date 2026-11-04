import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Heart, CheckCircle2, AlertCircle, ArrowRight, Sparkles, Volume2, Trophy, RotateCcw, Camera, Smile, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Lesson, Exercise, LibrasSign } from '../../types/libras';
import { SIGNS_BY_ID } from '../../data/signsData';
import { FACIAL_EXERCISES } from '../../data/facialExercisesData';
import { convertFacialExerciseToLibrasSign } from '../../utils/signAdapters';
import { learnedExpressionsService } from '../../services/learnedExpressionsService';
import { audio } from '../../services/audioService';
import { contentService } from '../../services/contentService';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';
import { FacialSignIllustration } from '../common/FacialSignIllustration';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { ARCameraView } from '../ARPractice/ARCameraView';
import { LibrinhaMascot } from '../Mascot/LibrinhaMascot';

interface LessonModalProps {
  lesson: Lesson;
  userHearts: number;
  signs?: LibrasSign[];
  onComplete: (xpEarned: number, gemsEarned: number) => void;
  onHeartLost: () => void;
  onRefillHearts?: () => void;
  onClose: () => void;
}

export const LessonModal: React.FC<LessonModalProps> = ({
  lesson,
  userHearts,
  signs,
  onComplete,
  onHeartLost,
  onRefillHearts,
  onClose,
}) => {
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState<number>(() => {
    try {
      const saved = sessionStorage.getItem(`librasgo_exercise_idx_${lesson.id}`);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val < lesson.exercises.length) {
          return val;
        }
      }
    } catch {}
    return 0;
  });

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
  const [heartsRemaining, setHeartsRemaining] = useState(userHearts);
  const [isLessonFinished, setIsLessonFinished] = useState(false);
  const [arCompletedForCurrentStep, setArCompletedForCurrentStep] = useState(false);

  // Dedicated Facial Live Camera for AR Challenge
  const facialVideoRef = useRef<HTMLVideoElement | null>(null);
  const facialStreamRef = useRef<MediaStream | null>(null);
  const [facialCameraActive, setFacialCameraActive] = useState(false);
  const [facialCameraPermission, setFacialCameraPermission] = useState<boolean | null>(null);
  const [facialCameraError, setFacialCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const stopFacialCamera = useCallback(() => {
    if (facialStreamRef.current) {
      facialStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      facialStreamRef.current = null;
    }
    if (facialVideoRef.current) {
      facialVideoRef.current.srcObject = null;
    }
    setFacialCameraActive(false);
  }, []);

  const startFacialCamera = useCallback(async (mode: 'user' | 'environment' = facingMode) => {
    try {
      if (facialStreamRef.current) {
        facialStreamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
        facialStreamRef.current = null;
      }

      setFacialCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setFacialCameraError('Navegador não suporta acesso à câmera.');
        setFacialCameraPermission(false);
        setFacialCameraActive(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      facialStreamRef.current = stream;

      if (facialVideoRef.current) {
        facialVideoRef.current.srcObject = stream;
        try {
          await facialVideoRef.current.play();
        } catch (playErr) {
          console.warn('Vídeo facial play aguardando interação:', playErr);
        }
      }

      setFacialCameraActive(true);
      setFacialCameraPermission(true);
      setFacialCameraError(null);
    } catch (err: any) {
      console.warn('Erro ao ligar câmera frontal no LessonModal:', err);
      setFacialCameraActive(false);
      setFacialCameraPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setFacialCameraError('Permissão para a câmera foi negada. Habilite a câmera nas configurações do navegador.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setFacialCameraError('Nenhuma câmera encontrada no seu dispositivo.');
      } else {
        setFacialCameraError('Não foi possível iniciar a câmera frontal ao vivo.');
      }
    }
  }, [facingMode]);

  // Safely release any active WebRTC video stream tracks and DOM bindings
  const releaseCameraHardware = useCallback(() => {
    stopFacialCamera();
    try {
      if (typeof document !== 'undefined') {
        document.querySelectorAll('video').forEach((vid) => {
          if (vid.srcObject instanceof MediaStream) {
            vid.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch {}
            });
            vid.srcObject = null;
          }
        });
      }
    } catch {}
  }, [stopFacialCamera]);

  // Clean up all video/camera streams on unmount
  useEffect(() => {
    return () => {
      releaseCameraHardware();
    };
  }, [releaseCameraHardware]);

  const handleClose = () => {
    try {
      sessionStorage.removeItem(`librasgo_exercise_idx_${lesson.id}`);
    } catch {}
    releaseCameraHardware();
    onClose();
  };

  const fallbackExercise: Exercise = {
    id: `fallback_${lesson?.id || 'lesson'}`,
    type: 'learn',
    title: lesson?.title || 'Prática de Libras',
    instruction: 'Observe a articulação do sinal e pratique os movimentos com clareza.',
    signId: 'sign_ola',
    options: [
      { id: 'opt_1', text: 'Correto', isCorrect: true },
      { id: 'opt_2', text: 'Praticar', isCorrect: false },
    ],
  };

  const exerciseList = Array.isArray(lesson?.exercises) && lesson.exercises.length > 0 ? lesson.exercises : [fallbackExercise];
  const safeIndex = Math.min(Math.max(0, currentExerciseIndex), exerciseList.length - 1);
  const currentExercise: Exercise = exerciseList[safeIndex] || fallbackExercise;

  // Resilient sign resolution (static signs + passed signs + shared signs + facial exercises + taught expressions)
  const signId = currentExercise?.signId;
  const sharedSigns = contentService.getContent().signs || [];

  let foundSign: LibrasSign | undefined =
    (signId ? SIGNS_BY_ID[signId] : undefined) ||
    signs?.find((s) => s.id === signId) ||
    sharedSigns.find((s) => s.id === signId);

  // Check standard facial exercises
  if (!foundSign && signId) {
    const facialEx = FACIAL_EXERCISES.find((e) => e.id === signId);
    if (facialEx) {
      foundSign = convertFacialExerciseToLibrasSign(facialEx);
    }
  }

  // Check community taught facial expressions
  if (!foundSign && signId) {
    const cachedFacials = learnedExpressionsService.getCachedExpressions();
    const taughtFacial = cachedFacials.find((e) => e.id === signId);
    if (taughtFacial) {
      foundSign = learnedExpressionsService.convertToLibrasSign(taughtFacial);
    }
  }

  const targetSign: LibrasSign = foundSign || {
    id: currentExercise?.signId || 'custom_sign',
    name: currentExercise?.title || 'Sinal em Libras',
    category: 'sentimentos',
    difficulty: 'iniciante',
    meaning: currentExercise?.instruction || 'Prática de sinal e expressão',
    contextSentence: 'Pratique este sinal em Libras com clareza.',
    contextTranslation: 'Em Libras',
    parameters: {
      cm: 'Parâmetro Não-Manual (Expressão Facial)',
      pa: 'Face e Movimento de Cabeça',
      m: 'Movimento expressivo',
      o: 'Voltada para a frente',
      ef: 'Expressão facial expressiva e atenta',
    },
    svgHandShape: 'custom_community',
    poseRule: {
      thumbExtended: false,
      indexExtended: false,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
      palmOrientation: 'camera',
      descriptionHint: 'Foque na expressão facial em frente à câmera.',
    },
    tips: ['Mantenha a postura ereta e a face visível na câmera.'],
  };

  const isFacialSign = Boolean(
    (targetSign.id && (targetSign.id.startsWith('face_') || targetSign.id.includes('facial'))) ||
    (currentExercise?.signId && (currentExercise.signId.startsWith('face_') || currentExercise.signId.includes('facial'))) ||
    targetSign.category === 'sentimentos' ||
    targetSign.parameters?.cm?.toLowerCase().includes('não-manual') ||
    targetSign.parameters?.cm?.toLowerCase().includes('facial') ||
    targetSign.parameters?.pa?.toLowerCase().includes('face') ||
    lesson?.id?.includes('facial') ||
    lesson?.moduleId === 'mod_facial'
  );

  // Start or stop facial camera when in AR challenge with a facial expression
  useEffect(() => {
    if (currentExercise.type === 'ar_challenge' && isFacialSign && !isLessonFinished) {
      startFacialCamera(facingMode);
    } else {
      stopFacialCamera();
    }
  }, [currentExerciseIndex, currentExercise.type, isFacialSign, isLessonFinished, startFacialCamera, stopFacialCamera, facingMode]);

  // Sync video element ref if stream is ready or element is re-mounted
  useEffect(() => {
    if (facialCameraActive && facialStreamRef.current && facialVideoRef.current) {
      if (facialVideoRef.current.srcObject !== facialStreamRef.current) {
        facialVideoRef.current.srcObject = facialStreamRef.current;
        facialVideoRef.current.play().catch(() => {});
      }
    }
  }, [facialCameraActive, currentExerciseIndex]);

  const progressPercent = Math.round(
    ((safeIndex + (isAnswerChecked && isAnswerCorrect ? 1 : 0)) / Math.max(1, exerciseList.length)) * 100
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
    if (currentExercise.type === 'ar_challenge') {
      releaseCameraHardware();
    }
    if (currentExerciseIndex + 1 < lesson.exercises.length) {
      const nextIdx = currentExerciseIndex + 1;
      try {
        sessionStorage.setItem(`librasgo_exercise_idx_${lesson.id}`, String(nextIdx));
      } catch {}
      setCurrentExerciseIndex(nextIdx);
      setSelectedOptionId(null);
      setIsAnswerChecked(false);
      setIsAnswerCorrect(false);
      setArCompletedForCurrentStep(false);
    } else {
      // Completed full lesson!
      try {
        sessionStorage.removeItem(`librasgo_exercise_idx_${lesson.id}`);
      } catch {}
      releaseCameraHardware();
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
            handleClose();
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
                Exercício {safeIndex + 1} de {exerciseList.length} • {currentExercise.title}
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-white mt-1">
                {currentExercise.instruction}
              </h2>
            </div>

            {/* TYPE 1: Learn Sign Introduction */}
            {currentExercise.type === 'learn' && (
              <div className="space-y-4">
                <div className="p-4 sm:p-6 bg-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row items-center gap-6 shadow-xl">
                  {/* Visual Illustration or Custom Photo */}
                  <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center flex-shrink-0">
                    {targetSign.imageUrl ? (
                      <div className="relative group w-36 h-36 rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-slate-900 flex-shrink-0 shadow-lg shadow-purple-500/20">
                        <img
                          src={targetSign.imageUrl}
                          alt={targetSign.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-x-0 bottom-0 py-1 bg-purple-950/90 text-center text-[10px] font-black text-purple-200">
                          Foto da Expressão
                        </div>
                      </div>
                    ) : isFacialSign ? (
                      <FacialSignIllustration sign={targetSign} signId={targetSign.id} size={150} highlightColor="#a855f7" />
                    ) : (
                      <LibrasSignIllustration signId={targetSign.id} size={150} highlightColor="#10b981" />
                    )}
                  </div>

                  {/* Sign Details */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <h3 className="text-2xl font-black text-white">{targetSign.name}</h3>
                      <button
                        onClick={handlePronounce}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 cursor-pointer"
                        title="Ouvir pronúncia"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      {isFacialSign && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-900/50 border border-purple-500/40 text-purple-300 font-bold text-[10px]">
                          Expressão Facial / Não-Manual
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-400 font-semibold text-sm mb-3">{targetSign.meaning}</p>
                    
                    {/* Grammar summary tags: CM, PA and EF (Expressão Facial) */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-left mb-3">
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <strong className="text-emerald-300 block">Configuração (CM):</strong>
                        <span className="text-slate-300">{targetSign.parameters?.cm ?? 'Configuração de mão padrão'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800">
                        <strong className="text-cyan-300 block">Ponto Articulação (PA):</strong>
                        <span className="text-slate-300">{targetSign.parameters?.pa ?? 'Espaço neutro frontal'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/40 shadow-inner">
                        <strong className="text-purple-300 block flex items-center gap-1 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          Expressão Facial (EF):
                        </strong>
                        <span className="text-purple-100 font-medium">
                          {targetSign.parameters?.ef || 'Neutra e atenta ao interlocutor'}
                        </span>
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
                    {isFacialSign ? 'Pratique o Rosto!' : 'Pronto para a Câmera!'}
                  </span>
                </div>
              </div>
            )}

            {/* TYPE 2: Real-time AR Camera Challenge */}
            {currentExercise.type === 'ar_challenge' && (
              <div className="space-y-4">
                {isFacialSign ? (
                  <div className="p-4 sm:p-5 bg-slate-900 border border-purple-500/40 rounded-3xl shadow-2xl space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 text-xs font-bold">
                        <Smile className="w-4 h-4 text-purple-400" />
                        <span>Desafio de Expressão Facial em Tempo Real</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                        Posicione seu rosto na câmera e reproduza a expressão indicada
                      </span>
                    </div>

                    {/* Dual View: Live Front Camera + Reference Image */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                      
                      {/* Left Column: Live Front Camera View */}
                      <div className="relative aspect-[4/3] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-purple-500/60 shadow-xl flex items-center justify-center">
                        <video
                          ref={facialVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${
                            facingMode === 'user' ? 'scale-x-[-1]' : ''
                          }`}
                        />

                        {/* Camera Status Badge */}
                        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 backdrop-blur-md border border-purple-500/40 text-[10px] font-bold text-white shadow-md">
                          <span className={`w-2 h-2 rounded-full ${facialCameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          <span>{facialCameraActive ? 'Câmera ao Vivo' : 'Iniciando Câmera...'}</span>
                        </div>

                        {/* Invert Camera Button */}
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            const nextMode = facingMode === 'user' ? 'environment' : 'user';
                            setFacingMode(nextMode);
                            startFacialCamera(nextMode);
                          }}
                          className="absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700 text-slate-200 hover:text-white transition-all cursor-pointer shadow-md"
                          title="Alternar Câmera Frontal / Traseira"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-purple-300" />
                        </button>

                        {/* Camera Permission / Error Fallback */}
                        {!facialCameraActive && (
                          <div className="absolute inset-0 z-10 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center">
                            <Camera className="w-8 h-8 text-purple-400 mb-2 animate-bounce" />
                            <p className="text-xs text-white font-bold mb-1">
                              {facialCameraError || 'Aguardando Permissão da Câmera'}
                            </p>
                            <p className="text-[11px] text-slate-400 max-w-xs mb-3 leading-relaxed">
                              Permita o acesso à câmera frontal no seu navegador para validar a expressão facial ao vivo.
                            </p>
                            <button
                              type="button"
                              onClick={() => startFacialCamera(facingMode)}
                              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Permitir / Tentar Novamente</span>
                            </button>
                          </div>
                        )}

                        {/* Interactive overlay guide */}
                        <div className="absolute bottom-2 inset-x-2 z-20 py-1 px-2.5 rounded-xl bg-slate-950/85 backdrop-blur-xs text-center text-[10px] text-purple-200 font-bold border border-purple-500/30">
                          {arCompletedForCurrentStep ? '✅ Expressão Validada com Sucesso!' : '👀 Mantenha o olhar firme e reproduza a expressão ao lado'}
                        </div>
                      </div>

                      {/* Right Column: Reference Target Image & Linguistic Parameters */}
                      <div className="p-4 rounded-2xl sm:rounded-3xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-500/40 text-indigo-300">
                              Referência de Expressão
                            </span>
                            <button
                              onClick={handlePronounce}
                              className="p-1 rounded-lg bg-slate-800 text-purple-300 hover:text-white cursor-pointer"
                              title="Ouvir pronúncia"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3 mb-3">
                            {targetSign.imageUrl ? (
                              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-purple-500/50 bg-slate-900 shadow-md flex-shrink-0">
                                <img src={targetSign.imageUrl} alt={targetSign.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="p-1 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-md flex-shrink-0">
                                <FacialSignIllustration sign={targetSign} signId={targetSign.id} size={90} highlightColor="#a855f7" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-black text-white leading-tight">{targetSign.name}</h3>
                              <p className="text-xs text-emerald-400 font-semibold line-clamp-2 mt-0.5">{targetSign.meaning}</p>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-xs space-y-1.5">
                            <div className="text-purple-300 font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-400" />
                              <span>Parâmetros Não-Manuais Alvo:</span>
                            </div>
                            <div className="text-purple-100 font-medium">
                              {targetSign.parameters?.ef || 'Mantenha a expressão focalizada'}
                            </div>
                            <div className="text-slate-400 text-[11px]">
                              {targetSign.parameters?.m || 'Movimento com a cabeça'}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Validation Action */}
                        <button
                          type="button"
                          onClick={() => {
                            audio.playSuccess();
                            confetti({
                              particleCount: 80,
                              spread: 70,
                              origin: { y: 0.6 },
                              colors: ['#a855f7', '#38bdf8', '#10b981'],
                            });
                            setArCompletedForCurrentStep(true);
                            setIsAnswerChecked(true);
                            setIsAnswerCorrect(true);
                          }}
                          className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                            arCompletedForCurrentStep
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30'
                              : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-500/30'
                          }`}
                        >
                          {arCompletedForCurrentStep ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-slate-950" />
                              <span>Expressão Validada na Câmera!</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                              <span>Validar Expressão na Câmera</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
                    <ErrorBoundary
                      fallbackTitle="Câmera Temporariamente Indisponível"
                      fallbackMessage="Não foi possível conectar à câmera no momento. Você pode tentar novamente ou validar o sinal com o botão de avanço."
                    >
                      <ARCameraView
                        initialSignId={targetSign.id}
                        isStandalone={false}
                        signs={signs}
                        onSignCompleted={(signId, accuracy) => {
                          setArCompletedForCurrentStep(true);
                          setIsAnswerChecked(true);
                          setIsAnswerCorrect(true);
                        }}
                      />
                    </ErrorBoundary>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
                  <span className="text-slate-300">
                    {isFacialSign
                      ? 'Reproduza a expressão facial com clareza mantendo o olhar na câmera.'
                      : 'Posicione sua mão no molde na tela e mantenha firme por 1.5s para validar!'}
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
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                  {targetSign.imageUrl ? (
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-lg">
                      <img src={targetSign.imageUrl} alt={targetSign.name} className="w-full h-full object-cover" />
                    </div>
                  ) : isFacialSign ? (
                    <FacialSignIllustration sign={targetSign} signId={targetSign.id} size={130} highlightColor="#a855f7" />
                  ) : (
                    <LibrasSignIllustration signId={targetSign.id} size={130} highlightColor="#38bdf8" />
                  )}
                  {isFacialSign && targetSign.parameters?.ef && (
                    <span className="text-[11px] text-purple-200 font-semibold px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40">
                      🎭 {targetSign.parameters.ef}
                    </span>
                  )}
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
                handleClose();
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
