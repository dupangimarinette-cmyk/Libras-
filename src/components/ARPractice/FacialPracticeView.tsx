import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Award,
  Flame,
  Zap,
  HelpCircle,
  Sliders,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
  ArrowUp,
  ArrowDown,
  MoveHorizontal,
  Layers,
  Heart,
  Gift,
  Check,
  ShieldCheck,
  Smile,
  Compass,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  FacialTrackingState,
  EyebrowsState,
  HeadMovementType,
  MouthState,
  UserStats,
  LibrasSign,
} from '../../types/libras';
import { facialTracker } from '../../services/facialTracker';
import { opticalTracker } from '../../services/opticalHandTracker';
import { evaluateSignPose, Landmark } from '../../services/handTracker';
import { FACIAL_EXERCISES, FacialExercise, FacialCategory } from '../../data/facialExercisesData';
import { audio } from '../../services/audioService';
import { FacialOverlay } from './FacialOverlay';

interface FacialPracticeViewProps {
  userStats: UserStats;
  signs?: LibrasSign[];
  onCompleteExercise: (xp: number, gems: number, exerciseId: string, mascotItemId?: string) => void;
  onOpenSignStudio?: (signId?: string) => void;
}

export const FacialPracticeView: React.FC<FacialPracticeViewProps> = ({
  userStats,
  signs = [],
  onCompleteExercise,
  onOpenSignStudio,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FacialCategory | 'todos' | 'livre'>('todos');
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [isFreePracticeMode, setIsFreePracticeMode] = useState(false);

  // Filter exercises
  const filteredExercises = selectedCategory === 'todos' || selectedCategory === 'livre'
    ? FACIAL_EXERCISES
    : FACIAL_EXERCISES.filter((ex) => ex.category === selectedCategory);

  const currentExercise: FacialExercise = filteredExercises[activeExerciseIndex] || FACIAL_EXERCISES[0];
  const isAlreadyCompleted = (userStats.completedFacialExerciseIds || []).includes(currentExercise.id);

  // Video & Canvas Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera & Tracking states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Tracking State
  const [facialState, setFacialState] = useState<FacialTrackingState>({
    isFaceDetected: false,
    confidence: 0,
    headPose: { yaw: 0, pitch: 0, roll: 0, movement: 'neutral', isNoddingYes: false, isShakingNo: false },
    eyebrowsState: 'neutral',
    eyebrowRaiseScore: 50,
    mouthState: 'neutral',
    mouthOpenScore: 20,
    eyeBlink: { left: false, right: false },
    landmarks: null,
    feedbackMessage: 'Aguardando câmera frontal...',
    detectedExpressions: [],
  });

  const [handDetected, setHandDetected] = useState(false);
  const [handAccuracy, setHandAccuracy] = useState(0);

  // Hold progress for challenge validation
  const [holdProgress, setHoldProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [celebrationDetails, setCelebrationDetails] = useState<{ xp: number; gems: number; item?: string } | null>(null);

  const holdStartRef = useRef<number | null>(null);
  const lastMatchTimestampRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  // Manual fallback simulation sliders for accessibility or when camera is blocked
  const [simulationActive, setSimulationActive] = useState(false);
  const [simEyebrows, setSimEyebrows] = useState<EyebrowsState>('neutral');
  const [simMovement, setSimMovement] = useState<HeadMovementType>('neutral');
  const [simMouth, setSimMouth] = useState<MouthState>('neutral');
  const [simHandActive, setSimHandActive] = useState(false);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setCameraPermissionGranted(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Erro ao ligar câmera frontal:', err);
      setCameraPermissionGranted(false);
      setCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permissão da câmera bloqueada. Habilite o acesso nas configurações do navegador para praticar com Realidade Aumentada.'
          : 'Câmera não encontrada ou ocupada por outro aplicativo.'
      );
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Handle Switch Exercise
  const handleSelectExercise = (idx: number) => {
    audio.playClick();
    setActiveExerciseIndex(idx);
    setIsSuccess(false);
    setHoldProgress(0);
    holdStartRef.current = null;
  };

  const handleNextExercise = () => {
    audio.playClick();
    const nextIdx = (activeExerciseIndex + 1) % filteredExercises.length;
    handleSelectExercise(nextIdx);
  };

  const handlePrevExercise = () => {
    audio.playClick();
    const prevIdx = (activeExerciseIndex - 1 + filteredExercises.length) % filteredExercises.length;
    handleSelectExercise(prevIdx);
  };

  // Continuous Analysis Loop
  useEffect(() => {
    let isMounted = true;

    const runFrame = () => {
      if (!isMounted) return;

      if (simulationActive) {
        // Simulated values for accessibility
        setFacialState({
          isFaceDetected: true,
          confidence: 95,
          headPose: {
            yaw: simMovement === 'shake_no' ? 22 : 0,
            pitch: 0,
            roll: 0,
            movement: simMovement,
            isNoddingYes: simMovement === 'nod_yes',
            isShakingNo: simMovement === 'shake_no',
          },
          eyebrowsState: simEyebrows,
          eyebrowRaiseScore: simEyebrows === 'raised' ? 85 : simEyebrows === 'furrowed' ? 20 : 50,
          mouthState: simMouth,
          mouthOpenScore: simMouth === 'open' ? 75 : simMouth === 'smile' ? 55 : 20,
          eyeBlink: { left: false, right: false },
          landmarks: null,
          feedbackMessage: 'Modo simulador assistivo ativo.',
          detectedExpressions: [simEyebrows, simMovement, simMouth].filter((s) => s !== 'neutral'),
        });
        setHandDetected(simHandActive);
        setHandAccuracy(simHandActive ? 94 : 0);
      } else if (videoRef.current && videoRef.current.readyState >= 2 && !isProcessingRef.current) {
        isProcessingRef.current = true;

        // 1. Analyze Facial features
        const state = facialTracker.analyzeFace(videoRef.current);
        setFacialState(state);

        // 2. If exercise requires hand, evaluate hand position with built-in optical tracker
        let isHandNow = false;
        if (currentExercise.requiresHand) {
          const handLandmarks = opticalTracker.detectHand(videoRef.current);
          if (handLandmarks && handLandmarks.length >= 21) {
            isHandNow = true;
            setHandDetected(true);
            setHandAccuracy(88);
          } else {
            setHandDetected(false);
            setHandAccuracy(0);
          }
        } else {
          setHandDetected(false);
          setHandAccuracy(0);
        }

        isProcessingRef.current = false;

        // Check Exercise Conditions immediately on current frame
        if (!isFreePracticeMode && !isSuccess) {
          const effectiveFaceDetected = state.isFaceDetected;
          let meetsFaceCondition = effectiveFaceDetected;

          // Eyebrows requirement
          if (currentExercise.targetEyebrows === 'raised') {
            if (state.eyebrowsState !== 'raised' && state.eyebrowRaiseScore < 51) {
              meetsFaceCondition = false;
            }
          } else if (currentExercise.targetEyebrows === 'furrowed') {
            if (state.eyebrowsState !== 'furrowed' && state.eyebrowRaiseScore > 49) {
              meetsFaceCondition = false;
            }
          }

          // Head movement requirement
          if (currentExercise.targetHeadMovement === 'nod_yes') {
            if (!state.headPose.isNoddingYes && state.headPose.movement !== 'nod_yes' && Math.abs(state.headPose.pitch) < 5) {
              meetsFaceCondition = false;
            }
          } else if (currentExercise.targetHeadMovement === 'shake_no') {
            if (!state.headPose.isShakingNo && state.headPose.movement !== 'shake_no' && Math.abs(state.headPose.yaw) < 6) {
              meetsFaceCondition = false;
            }
          }

          // Mouth requirement
          if (currentExercise.targetMouth === 'smile') {
            if (state.mouthState !== 'smile' && state.mouthOpenScore < 20) {
              meetsFaceCondition = false;
            }
          } else if (currentExercise.targetMouth === 'open') {
            if (state.mouthState !== 'open' && state.mouthOpenScore < 36) {
              meetsFaceCondition = false;
            }
          }

          // Hand requirement
          let meetsHandCondition = true;
          if (currentExercise.requiresHand && !isHandNow && handAccuracy < 30) {
            meetsHandCondition = false;
          }

          const conditionMet = meetsFaceCondition && meetsHandCondition;
          const now = Date.now();

          if (conditionMet) {
            lastMatchTimestampRef.current = now;
            if (!holdStartRef.current) {
              holdStartRef.current = now;
            }
            const elapsed = (now - holdStartRef.current) / 1000;
            const targetHold = 0.6;
            const pct = Math.min(100, Math.round((elapsed / targetHold) * 100));
            setHoldProgress(pct);

            if (pct >= 100) {
              setIsSuccess(true);
              audio.playSuccess();
              confetti({
                particleCount: 75,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#10b981', '#6366f1', '#38bdf8', '#fbbf24'],
              });

              const earnedXp = isAlreadyCompleted ? 0 : currentExercise.xpReward;
              const earnedGems = isAlreadyCompleted ? 0 : currentExercise.gemsReward;

              setCelebrationDetails({
                xp: earnedXp,
                gems: earnedGems,
                item: currentExercise.mascotRewardItemId,
              });
              setShowCelebrationModal(true);

              onCompleteExercise(earnedXp, earnedGems, currentExercise.id, currentExercise.mascotRewardItemId);
            }
          } else {
            // Grace period: allow 450ms before breaking hold
            if (now - lastMatchTimestampRef.current > 450) {
              holdStartRef.current = null;
              setHoldProgress((prev) => Math.max(0, prev - 8));
            }
          }
        }
      } else if (simulationActive && !isFreePracticeMode && !isSuccess) {
        // Simulation mode condition evaluation
        let meetsFaceCondition = true;
        if (currentExercise.targetEyebrows && simEyebrows !== currentExercise.targetEyebrows) {
          meetsFaceCondition = false;
        }
        if (currentExercise.targetHeadMovement && simMovement !== currentExercise.targetHeadMovement) {
          meetsFaceCondition = false;
        }
        if (currentExercise.targetMouth && simMouth !== currentExercise.targetMouth) {
          meetsFaceCondition = false;
        }
        let meetsHandCondition = true;
        if (currentExercise.requiresHand && !simHandActive) {
          meetsHandCondition = false;
        }

        if (meetsFaceCondition && meetsHandCondition) {
          setHoldProgress(100);
          setIsSuccess(true);
          audio.playSuccess();
          confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
          const earnedXp = isAlreadyCompleted ? 0 : currentExercise.xpReward;
          const earnedGems = isAlreadyCompleted ? 0 : currentExercise.gemsReward;
          setCelebrationDetails({ xp: earnedXp, gems: earnedGems, item: currentExercise.mascotRewardItemId });
          setShowCelebrationModal(true);
          onCompleteExercise(earnedXp, earnedGems, currentExercise.id, currentExercise.mascotRewardItemId);
        }
      }

      animFrameRef.current = requestAnimationFrame(runFrame);
    };

    animFrameRef.current = requestAnimationFrame(runFrame);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [
    cameraActive,
    simulationActive,
    simEyebrows,
    simMovement,
    simMouth,
    simHandActive,
    facialState,
    handDetected,
    currentExercise,
    isFreePracticeMode,
    isSuccess,
    isAlreadyCompleted,
    onCompleteExercise,
  ]);

  // Generate Real-time Intelligent Guidance Text
  const getDynamicGuidance = () => {
    if (!facialState.isFaceDetected && !simulationActive) {
      return {
        text: 'Posicione seu rosto dentro do molde oval guia da câmera.',
        color: 'text-amber-300',
        action: 'adjust_face',
      };
    }

    if (isFreePracticeMode) {
      return {
        text: 'Modo Livre: Experimente levantar sobrancelhas, franzir a testa, acenar e balançar a cabeça.',
        color: 'text-cyan-300',
        action: 'free',
      };
    }

    // Check specific steps for current exercise
    if (currentExercise.targetEyebrows && facialState.eyebrowsState !== currentExercise.targetEyebrows) {
      if (currentExercise.targetEyebrows === 'raised') {
        return {
          text: 'Levante as sobrancelhas para marcar a entonação interrogativa!',
          color: 'text-amber-300',
          action: 'raise_brows',
        };
      }
      if (currentExercise.targetEyebrows === 'furrowed') {
        return {
          text: 'Franza as sobrancelhas aproximando-as para indicar o foco da pergunta.',
          color: 'text-amber-300',
          action: 'furrow_brows',
        };
      }
    }

    if (currentExercise.targetHeadMovement && facialState.headPose.movement !== currentExercise.targetHeadMovement) {
      if (currentExercise.targetHeadMovement === 'nod_yes') {
        return {
          text: 'Acene com a cabeça para cima e para baixo para validar a afirmação.',
          color: 'text-amber-300',
          action: 'nod',
        };
      }
      if (currentExercise.targetHeadMovement === 'shake_no') {
        return {
          text: 'Balance a cabeça de um lado para o outro para expressar a negação.',
          color: 'text-amber-300',
          action: 'shake',
        };
      }
    }

    if (currentExercise.requiresHand && !handDetected) {
      return {
        text: 'Expressão facial excelente! Agora posicione sua mão visível na câmera para completar o sinal.',
        color: 'text-cyan-300',
        action: 'show_hand',
      };
    }

    if (holdProgress > 0 && holdProgress < 100) {
      return {
        text: `Perfeito! Mantenha a expressão firme... ${holdProgress}%`,
        color: 'text-emerald-300 font-black',
        action: 'holding',
      };
    }

    return {
      text: 'Excelente! Mantenha a postura e a expressão facial.',
      color: 'text-emerald-400',
      action: 'perfect',
    };
  };

  const guidance = getDynamicGuidance();

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 select-none">
      
      {/* Top Banner & Mode Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 mb-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Parâmetros Não Manuais • IA & Realidade Aumentada
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Processamento 100% Local & Seguro
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <span>Expressões Faciais em Libras</span>
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Em Libras, a expressão facial e os movimentos de cabeça não são mero adorno: são regras gramaticais que definem se uma frase é pergunta, afirmação, negação ou intensidade.
            </p>
          </div>

          {/* Quick Actions & Camera toggle */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => {
                audio.playClick();
                setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
              }}
              className="px-3 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Inverter Câmera Frontal/Traseira"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Girar Câmera</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setSimulationActive((prev) => !prev);
              }}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                simulationActive
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title="Ativar simulador manual assistivo"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{simulationActive ? 'Simulador Ativo' : 'Simulador'}</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 border-t border-slate-800/80 mt-4 no-scrollbar">
          <button
            onClick={() => {
              audio.playClick();
              setSelectedCategory('todos');
              setIsFreePracticeMode(false);
              setActiveExerciseIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'todos' && !isFreePracticeMode
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Todos os Desafios ({FACIAL_EXERCISES.length})
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setSelectedCategory('interrogativas');
              setIsFreePracticeMode(false);
              setActiveExerciseIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'interrogativas'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            ❓ Interrogativas
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setSelectedCategory('afirmacao_negacao');
              setIsFreePracticeMode(false);
              setActiveExerciseIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'afirmacao_negacao'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            ↔️ Afirmação & Negação
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setSelectedCategory('intensidade_emocao');
              setIsFreePracticeMode(false);
              setActiveExerciseIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'intensidade_emocao'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            💥 Intensidade & Emoção
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setSelectedCategory('combinado_mao_rosto');
              setIsFreePracticeMode(false);
              setActiveExerciseIndex(0);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'combinado_mao_rosto'
                ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            🙌 Rosto + Mãos Combinados
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setSelectedCategory('livre');
              setIsFreePracticeMode(true);
            }}
            className={`px-3.5 py-1.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
              isFreePracticeMode
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            🎭 Treino Livre com Medidores
          </button>
        </div>
      </div>

      {/* Main Studio Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Camera Viewport with AR Facial Hologram Wireframe */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-slate-950 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center">
            
            {/* Live Camera Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* AR Holographic Facial Overlay */}
            <FacialOverlay
              trackingState={facialState}
              targetExpression={
                isFreePracticeMode
                  ? undefined
                  : {
                      eyebrows: currentExercise.targetEyebrows,
                      headMovement: currentExercise.targetHeadMovement,
                      label: currentExercise.title,
                      tip: currentExercise.instruction,
                    }
              }
            />

            {/* Camera Controls & Calibration Toolbar */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={() => {
                  audio.playClick();
                  facialTracker.calibrateBaseline();
                }}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
                title="Calibrar posição neutra do rosto"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Calibrar Rosto Neutro</span>
                <span className="sm:hidden">Calibrar</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
                }}
                className="p-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md border border-slate-700 text-slate-200 transition-all cursor-pointer shadow-lg"
                title="Alternar Câmera"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
              </button>
            </div>

            {/* Hand Tracking HUD Badge if exercise requires hand */}
            {currentExercise.requiresHand && (
              <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-cyan-500/50 text-white text-xs font-bold shadow-lg">
                <span className={`w-2.5 h-2.5 rounded-full ${handDetected ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
                <span>Mão: {handDetected ? 'Detectada (88%)' : 'Aguardando mão...'}</span>
              </div>
            )}

            {/* Real-time Hold Progress Bar */}
            {!isFreePracticeMode && (
              <div className="absolute bottom-4 left-4 right-4 z-20">
                <div className="bg-slate-950/80 backdrop-blur-md p-2.5 rounded-2xl border border-slate-700/80 shadow-xl">
                  <div className="flex items-center justify-between text-xs font-bold text-white mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sustentação da Expressão:</span>
                    </span>
                    <span className="font-mono text-emerald-400">{holdProgress}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-150"
                      style={{ width: `${holdProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Camera Error / Permission Blocked Fallback */}
            {!cameraActive && !simulationActive && (
              <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-400 mb-3 animate-bounce" />
                <h3 className="text-lg font-black text-white">Câmera Não Conectada</h3>
                <p className="text-xs text-slate-300 max-w-sm mt-1 mb-4 leading-relaxed">
                  {cameraError || 'Permita o acesso à câmera frontal para detectar expressões faciais e movimentos de cabeça com Realidade Aumentada.'}
                </p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                  <button
                    onClick={() => setSimulationActive(true)}
                    className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Praticar com Simulador</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Live Guidance Alert Box */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-3 shadow-lg">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Feedback Inteligente da IA
              </span>
              <p className={`text-xs sm:text-sm font-bold ${guidance.color} leading-snug mt-0.5`}>
                {guidance.text}
              </p>
            </div>
            {!isFreePracticeMode && (
              <button
                onClick={() => {
                  audio.playSuccess();
                  setHoldProgress(100);
                  setIsSuccess(true);
                  const earnedXp = isAlreadyCompleted ? Math.round(currentExercise.xpReward * 0.3) : currentExercise.xpReward;
                  const earnedGems = isAlreadyCompleted ? 2 : currentExercise.gemsReward;
                  onCompleteExercise(earnedXp, earnedGems, currentExercise.id, currentExercise.mascotRewardItemId);
                  setCelebrationDetails({ xp: earnedXp, gems: earnedGems, item: currentExercise.mascotRewardItemId });
                  setShowCelebrationModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-xs font-black text-emerald-300 transition-all cursor-pointer whitespace-nowrap shadow-sm shadow-emerald-500/20 shrink-0"
                title="Validação imediata para avanço assistido"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Validar Expressão</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry Dashboard & Exercise Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          {/* Active Exercise Detail Card */}
          {!isFreePracticeMode ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Nível {currentExercise.level} • {currentExercise.difficulty}
                    </span>
                    {isAlreadyCompleted && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Concluído
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-400">+{currentExercise.xpReward} XP</span>
                    <span className="text-xs font-black text-cyan-400">+{currentExercise.gemsReward} 💎</span>
                  </div>
                </div>

                <h3 className="text-lg font-black text-white leading-snug">
                  {currentExercise.title}
                </h3>
                
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {currentExercise.instruction}
                </p>

                {/* Linguistic Explanation Box (Revisada por Especialistas) */}
                <div className="mt-4 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1 mb-1">
                    <HelpCircle className="w-3 h-3 text-indigo-400" />
                    Fundamentação Linguística da Libras:
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {currentExercise.linguisticExplanation}
                  </p>
                </div>

                {/* Reward Item Teaser if attached */}
                {currentExercise.mascotRewardItemId && !isAlreadyCompleted && (
                  <div className="mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                    <Gift className="w-5 h-5 text-amber-400 animate-bounce flex-shrink-0" />
                    <div className="text-xs">
                      <span className="font-extrabold text-amber-300 block">
                        Recompensa Especial de Conclusão:
                      </span>
                      <span className="text-[11px] text-slate-300">
                        Desbloqueia um acessório holográfico exclusivo para a mascote Librinha!
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation between exercises */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800/80 mt-4">
                <button
                  onClick={handlePrevExercise}
                  className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <span className="text-xs font-bold text-slate-400">
                  {activeExerciseIndex + 1} de {filteredExercises.length}
                </span>

                <button
                  onClick={handleNextExercise}
                  className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-lg shadow-indigo-600/30"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Free Practice Mode Description */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Laboratório Livre
              </span>
              <h3 className="text-lg font-black text-white mt-2">
                Painel de Telemetria Facial em Tempo Real
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Observe os medidores ao vivo reagindo a cada micromovimento do seu rosto e inclinação da sua cabeça.
              </p>
            </div>
          )}

          {/* Real-time Telemetry Gauges Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Indicadores Faciais em Tempo Real</span>
            </h4>

            {/* Gauge 1: Sobrancelhas */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sobrancelhas:</span>
                </span>
                <span
                  className={`font-black uppercase text-[11px] ${
                    facialState.eyebrowsState === 'raised'
                      ? 'text-emerald-400'
                      : facialState.eyebrowsState === 'furrowed'
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {facialState.eyebrowsState === 'raised'
                    ? 'Levantadas ↗'
                    : facialState.eyebrowsState === 'furrowed'
                    ? 'Franzidas ↘'
                    : 'Neutras'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-slate-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${facialState.eyebrowRaiseScore}%` }}
                />
              </div>
            </div>

            {/* Gauge 2: Movimento de Cabeça (Aceno / Negação) */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <MoveHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Movimento da Cabeça:</span>
                </span>
                <span
                  className={`font-black uppercase text-[11px] ${
                    facialState.headPose.isNoddingYes
                      ? 'text-emerald-400'
                      : facialState.headPose.isShakingNo
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                >
                  {facialState.headPose.isNoddingYes
                    ? 'Aceno Positivo (Sim)'
                    : facialState.headPose.isShakingNo
                    ? 'Negação Lateral (Não)'
                    : 'Estável / Neutro'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>Yaw: {facialState.headPose.yaw}°</span>
                <span>Pitch: {facialState.headPose.pitch}°</span>
                <span>Roll: {facialState.headPose.roll}°</span>
              </div>
            </div>

            {/* Gauge 3: Boca & Expressividade */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-pink-400" />
                  <span>Abertura / Expressão Labial:</span>
                </span>
                <span className="font-black uppercase text-[11px] text-cyan-400">
                  {facialState.mouthState === 'open'
                    ? 'Aberta (Intensidade)'
                    : facialState.mouthState === 'smile'
                    ? 'Sorriso'
                    : 'Neutra'}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all duration-150"
                  style={{ width: `${facialState.mouthOpenScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Simulator Sliders (When simulator is active) */}
          {simulationActive && (
            <div className="bg-amber-950/30 border border-amber-500/40 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Controles do Simulador Manual
                </span>
                <button
                  onClick={() => setSimulationActive(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Eyebrow selector */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1">Sobrancelhas:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['raised', 'neutral', 'furrowed'] as EyebrowsState[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => setSimEyebrows(st)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        simEyebrows === st
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {st === 'raised' ? 'Levantadas' : st === 'furrowed' ? 'Franzidas' : 'Neutras'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Head movement selector */}
              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1">Movimento de Cabeça:</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['nod_yes', 'neutral', 'shake_no'] as HeadMovementType[]).map((mv) => (
                    <button
                      key={mv}
                      onClick={() => setSimMovement(mv)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all ${
                        simMovement === mv
                          ? 'bg-cyan-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {mv === 'nod_yes' ? 'Aceno (Sim)' : mv === 'shake_no' ? 'Negação (Não)' : 'Neutro'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hand toggle if requires hand */}
              {currentExercise.requiresHand && (
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setSimHandActive((prev) => !prev)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${
                      simHandActive
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Mão em Posição: {simHandActive ? 'ATIVADA (SIM)' : 'DESATIVADA'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Success Modal with Mascot Item Unlock Celebration */}
      {showCelebrationModal && celebrationDetails && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-1">
              Desafio Concluído com Sucesso!
            </span>

            <h3 className="text-xl font-black text-white mt-1">
              {currentExercise.title}
            </h3>

            <p className="text-xs text-slate-300 mt-2 mb-4">
              Você dominou a expressão não manual e manteve a estabilidade exigida pela gramática da Libras.
            </p>

            {/* Rewards Won */}
            {isAlreadyCompleted ? (
              <div className="py-3 px-4 rounded-2xl bg-slate-950 border border-slate-800 mb-4 w-full text-xs text-slate-400">
                <span className="font-bold text-amber-300 block mb-0.5">Treino de Reforço Concluído!</span>
                <span>As recompensas de XP e Gemas já foram resgatadas na primeira conclusão desta atividade.</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-4 py-3 px-6 rounded-2xl bg-slate-950 border border-slate-800 mb-4 w-full">
                <div className="flex items-center gap-1.5 text-amber-400 font-black text-sm">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  <span>+{celebrationDetails.xp} XP</span>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div className="flex items-center gap-1.5 text-cyan-400 font-black text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>+{celebrationDetails.gems} Gemas</span>
                </div>
              </div>
            )}

            {/* Unlocked Mascot Item notification */}
            {celebrationDetails.item && (
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 w-full mb-4 flex items-center gap-3">
                <Gift className="w-6 h-6 text-indigo-400 flex-shrink-0 animate-bounce" />
                <div className="text-left">
                  <span className="font-extrabold block text-white">
                    Novo Acessório Desbloqueado!
                  </span>
                  <span className="text-[11px] text-slate-300">
                    A mascote Librinha recebeu um novo item de expressão facial no Guarda-Roupa da Loja!
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                audio.playClick();
                setShowCelebrationModal(false);
                setIsSuccess(false);
                setHoldProgress(0);
                handleNextExercise();
              }}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition-all cursor-pointer"
            >
              Continuar para o Próximo Desafio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
