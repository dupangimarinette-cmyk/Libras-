import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  X,
  Sparkles,
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Award,
  Flame,
  Heart,
  Volume2,
  Eye,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { FacialOverlay } from '../ARPractice/FacialOverlay';
import { facialTracker } from '../../services/facialTracker';
import { FacialTrackingState, EyebrowsState, HeadMovementType } from '../../types/libras';
import { audio } from '../../services/audioService';

export interface FacialChallenge {
  id: string;
  title: string;
  category: 'interrogativa' | 'afirmacao' | 'negacao' | 'intensidade';
  instruction: string;
  pedagogicalTip: string;
  linguisticContext: string;
  targetEyebrows?: EyebrowsState;
  targetHeadMovement?: HeadMovementType;
  targetMouth?: 'open' | 'neutral' | 'smile';
  holdSecondsRequired: number;
  xpReward: number;
  gemsReward: number;
}

interface FacialExerciseModalProps {
  challenge: FacialChallenge;
  userHearts: number;
  onComplete: (xpEarned: number, gemsEarned: number, challengeId: string) => void;
  onClose: () => void;
}

export const FacialExerciseModal: React.FC<FacialExerciseModalProps> = ({
  challenge,
  userHearts,
  onComplete,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<FacialTrackingState>({
    isFaceDetected: false,
    confidence: 0,
    headPose: { yaw: 0, pitch: 0, roll: 0, movement: 'neutral', isNoddingYes: false, isShakingNo: false },
    eyebrowsState: 'neutral',
    eyebrowRaiseScore: 50,
    mouthState: 'neutral',
    mouthOpenScore: 20,
    eyeBlink: { left: false, right: false },
    landmarks: null,
    feedbackMessage: 'Iniciando câmera frontal...',
    detectedExpressions: [],
  });

  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isSuccess, setIsSuccess] = useState(false);
  const holdStartRef = useRef<number | null>(null);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
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
      setHasCameraPermission(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Erro ao acessar câmera frontal:', err);
      setHasCameraPermission(false);
      setCameraError('Permissão para uso da câmera não concedida ou dispositivo indisponível.');
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Optical Analysis Loop
  useEffect(() => {
    if (!hasCameraPermission) return;

    let isMounted = true;

    const loop = () => {
      if (!isMounted) return;
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const state = facialTracker.analyzeFace(videoRef.current);
        setTrackingState(state);

        // Robust condition evaluation
        let conditionMet = state.isFaceDetected;

        if (challenge.targetEyebrows === 'raised') {
          if (state.eyebrowsState !== 'raised' && state.eyebrowRaiseScore < 51) {
            conditionMet = false;
          }
        } else if (challenge.targetEyebrows === 'furrowed') {
          if (state.eyebrowsState !== 'furrowed' && state.eyebrowRaiseScore > 49) {
            conditionMet = false;
          }
        }

        if (challenge.targetHeadMovement === 'nod_yes') {
          if (state.headPose.movement !== 'nod_yes' && !state.headPose.isNoddingYes && Math.abs(state.headPose.pitch) < 6) {
            conditionMet = false;
          }
        } else if (challenge.targetHeadMovement === 'shake_no') {
          if (state.headPose.movement !== 'shake_no' && !state.headPose.isShakingNo && Math.abs(state.headPose.yaw) < 7) {
            conditionMet = false;
          }
        }

        if (challenge.targetMouth === 'smile') {
          if (state.mouthState !== 'smile' && state.mouthOpenScore < 22) {
            conditionMet = false;
          }
        } else if (challenge.targetMouth === 'open') {
          if (state.mouthState !== 'open' && state.mouthOpenScore < 36) {
            conditionMet = false;
          }
        }

        if (conditionMet && !isSuccess) {
          const now = Date.now();
          if (!holdStartRef.current) {
            holdStartRef.current = now;
          }
          const elapsed = (now - holdStartRef.current) / 1000;
          const targetHold = Math.min(1.2, challenge.holdSecondsRequired || 1.2);
          const pct = Math.min(100, Math.round((elapsed / targetHold) * 100));
          setHoldProgress(pct);

          if (pct >= 100) {
            setIsSuccess(true);
            audio.playSuccess();
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.6 },
            });
            // Do NOT auto-exit: user clicks explicit button to finish
          }
        } else {
          // Soft decay rather than instant drop
          setHoldProgress((prev) => Math.max(0, prev - 8));
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hasCameraPermission, challenge, isSuccess, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-indigo-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Parâmetro Não Manual • {challenge.category}
              </span>
              <span className="text-xs font-black text-amber-400">+{challenge.xpReward} XP</span>
              <span className="text-xs font-black text-cyan-400">+{challenge.gemsReward} 💎</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mt-1">{challenge.title}</h3>
          </div>

          <button
            onClick={() => {
              audio.playClick();
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Fechar Desafio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 flex flex-col justify-between">
          
          {/* Instructions banner */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
            <p className="font-bold text-white leading-relaxed">{challenge.instruction}</p>
            <p className="text-[11px] text-slate-400 leading-normal">{challenge.linguisticContext}</p>
          </div>

          {/* Camera Viewport with Holographic Overlay */}
          <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-black border border-slate-800 shadow-inner flex items-center justify-center">
            {hasCameraPermission ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />

                {/* Facial Holographic Wireframe and Guideline Overlays */}
                <FacialOverlay
                  trackingState={trackingState}
                  targetExpression={{
                    eyebrows: challenge.targetEyebrows,
                    headMovement: challenge.targetHeadMovement,
                    label: challenge.title,
                    tip: challenge.pedagogicalTip,
                  }}
                />

                {/* Hold Progress Bar */}
                {holdProgress > 0 && (
                  <div className="absolute top-4 left-4 right-4 z-20">
                    <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden p-0.5 border border-emerald-500/50">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full transition-all duration-100"
                        style={{ width: `${holdProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Success Announcement Overlay */}
                {isSuccess && (
                  <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-30 animate-fadeIn">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 mb-3 animate-bounce">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h4 className="text-xl font-black text-white">Expressão Facial Perfeita!</h4>
                    <p className="text-xs text-emerald-200 mt-1 max-w-xs">
                      Você dominou a coordenação do parâmetro não manual de acordo com a gramática oficial da Libras!
                    </p>
                    <div className="flex items-center gap-3 mt-4 text-sm font-black">
                      <span className="text-amber-300">+{challenge.xpReward} XP</span>
                      <span className="text-cyan-300">+{challenge.gemsReward} Gemas</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Fallback view when camera is unavailable */
              <div className="text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-white">Câmera Não Disponível</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {cameraError || 'Ative a câmera para receber validação em tempo real da sua expressão facial.'}
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                  <button
                    onClick={() => {
                      onComplete(challenge.xpReward, challenge.gemsReward, challenge.id);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-700"
                  >
                    Concluir com Estudo Teórico
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar: Real-time feedback & Instant Validation Button */}
          {hasCameraPermission && !isSuccess && (
            <div className="flex items-center justify-between gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-300">
                <span className="font-bold text-white block">Status da Expressão:</span>
                <span className="text-emerald-400 font-mono">
                  {trackingState?.detectedExpressions.length ? trackingState.detectedExpressions.join(' • ') : 'Alinhe seu rosto na câmera'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  audio.playSuccess();
                  setIsSuccess(true);
                  confetti({
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.6 },
                  });
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validar Expressão</span>
              </button>
            </div>
          )}

          {/* Explicit Victory Card when completed - Never closes automatically */}
          {isSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/90 border-2 border-emerald-500 shadow-xl text-center space-y-3 animate-fadeIn">
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-base font-black text-white">Expressão Validada com Sucesso!</span>
              </div>
              <p className="text-xs text-emerald-200">
                Excelente precisão! Você dominou o parâmetro não-manual deste desafio.
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-slate-900 border border-amber-500/30 text-amber-300 font-black text-xs">
                  +{challenge.xpReward} XP
                </span>
                <span className="px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-300 font-black text-xs">
                  +{challenge.gemsReward} Gemas
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  stopCamera();
                  onComplete(challenge.xpReward, challenge.gemsReward, challenge.id);
                  onClose();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Concluir e Continuar na Trilha</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Grammar Guidance Pill */}
          <div className="p-3 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-2.5 text-xs">
            <Sparkles className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
            <div className="text-slate-300">
              <strong className="text-white">Dica Gramatical de Libras:</strong> {challenge.pedagogicalTip}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
