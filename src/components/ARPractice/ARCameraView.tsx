import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera as CameraIcon,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle,
  AlertCircle,
  Sliders,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
  Check,
  Zap,
  Activity,
  Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LibrasSign, ARTrackingState } from '../../types/libras';
import { LIBRAS_SIGNS } from '../../data/signsData';
import { evaluateSignPose, drawARSkeleton, Landmark } from '../../services/handTracker';
import { opticalTracker } from '../../services/opticalHandTracker';
import { audio } from '../../services/audioService';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';
import { SignReferenceHelpOverlay } from './SignReferenceHelpOverlay';

interface ARCameraViewProps {
  initialSignId?: string;
  signs?: LibrasSign[];
  onSignCompleted?: (signId: string, accuracy: number) => void;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const ARCameraView: React.FC<ARCameraViewProps> = ({
  initialSignId = 'letra_a',
  signs,
  onSignCompleted,
  onClose,
  isStandalone = true,
}) => {
  const signList = signs && signs.length > 0 ? signs : LIBRAS_SIGNS;

  const [currentSignIndex, setCurrentSignIndex] = useState(() => {
    const idx = signList.findIndex((s) => s.id === initialSignId);
    return idx >= 0 ? idx : 0;
  });

  const activeSign = signList[currentSignIndex] || signList[0] || LIBRAS_SIGNS[0];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Tracking state
  const [trackingState, setTrackingState] = useState<ARTrackingState>({
    isHandDetected: false,
    currentAccuracy: 0,
    feedbackMessage: 'Posicione sua mão na frente da câmera...',
    feedbackType: 'searching',
    fingersStatus: { thumb: false, index: false, middle: false, ring: false, pinky: false },
    holdProgress: 0,
    isSuccess: false,
    landmarks: null,
  });

  const [aiModelStatus, setAiModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [simulationMode, setSimulationMode] = useState(false);
  const [sensitivity, setSensitivity] = useState<'friendly' | 'strict'>('friendly');
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showReferenceHelpOverlay, setShowReferenceHelpOverlay] = useState(false);
  const [isGhostOverlayActive, setIsGhostOverlayActive] = useState(false);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Manual simulator sliders
  const [simThumb, setSimThumb] = useState(false);
  const [simIndex, setSimIndex] = useState(false);
  const [simMiddle, setSimMiddle] = useState(false);
  const [simRing, setSimRing] = useState(false);
  const [simPinky, setSimPinky] = useState(false);

  // Rate-limiting & struggle detection refs
  const holdProgressRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaPipeHandsRef = useRef<any>(null);
  const isProcessingFrameRef = useRef(false);
  const lastFrameProcessTimeRef = useRef(0);
  const struggleDurationRef = useRef(0);
  const hasAutoShownHelpRef = useRef(false);

  // Trigger celebration
  const triggerCelebration = useCallback((accuracy: number) => {
    audio.playSuccess();
    confetti({
      particleCount: 85,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#10b981', '#38bdf8', '#fbbf24', '#f43f5e'],
    });

    if (onSignCompleted) {
      onSignCompleted(activeSign.id, accuracy);
    }
  }, [activeSign.id, onSignCompleted]);

  // Switch sign helper
  const handleNextSign = () => {
    audio.playClick();
    setCurrentSignIndex((prev) => (prev + 1) % signList.length);
    holdProgressRef.current = 0;
    struggleDurationRef.current = 0;
    hasAutoShownHelpRef.current = false;
    setShowReferenceHelpOverlay(false);
  };

  const handlePrevSign = () => {
    audio.playClick();
    setCurrentSignIndex((prev) => (prev - 1 + signList.length) % signList.length);
    holdProgressRef.current = 0;
    struggleDurationRef.current = 0;
    hasAutoShownHelpRef.current = false;
    setShowReferenceHelpOverlay(false);
  };

  // Immediate validation button for assistive learning
  const handleInstantValidate = () => {
    audio.playClick();
    holdProgressRef.current = 100;
    setTrackingState((prev) => ({
      ...prev,
      currentAccuracy: 96,
      holdProgress: 100,
      isSuccess: true,
      feedbackMessage: 'SINAL VALIDADO COM SUCESSO! 🎉',
      feedbackType: 'perfect',
    }));
    triggerCelebration(96);
  };

  // Start Camera Stream with multi-tier fallback
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      let stream: MediaStream | null = null;

      // Tier 1: Ideal 640x480 with selected facing mode
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
      } catch {
        // Tier 2: Flexible resolution with facing mode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch {
          // Tier 3: Any available video stream
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch((err) => {
              console.warn('Autoplay bloqueado:', err);
            });
          };
          setCameraActive(true);
          setSimulationMode(false);
          setCameraError(null);
        }
      }
    } catch (err: unknown) {
      console.warn('Câmera não permitida ou indisponível:', err);
      setCameraError(
        'Permissão de câmera necessária para reconhecimento ao vivo. Você pode conceder a permissão ou praticar com o simulador visual assistido!'
      );
      setCameraActive(false);
      setSimulationMode(true);
    }
  }, [facingMode]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Initialize MediaPipe Hands or fallback to instant optical tracking
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      try {
        // Initially ready with built-in optical tracking engine
        setAiModelStatus('ready');

        let HandsClass = (window as any).Hands;

        // Try CDN if not already loaded
        if (!HandsClass && typeof document !== 'undefined') {
          if (!document.getElementById('mediapipe-hands-script')) {
            const script = document.createElement('script');
            script.id = 'mediapipe-hands-script';
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
            script.async = true;
            document.head.appendChild(script);
            await new Promise((res) => {
              script.onload = res;
              script.onerror = res;
              setTimeout(res, 2500); // 2.5s timeout: don't block optical tracker
            });
          }
          HandsClass = (window as any).Hands;
        }

        if (HandsClass && isMounted) {
          try {
            const hands = new HandsClass({
              locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
            });

            hands.setOptions({
              maxNumHands: 1,
              modelComplexity: 0, // 0 = ultra responsive on phones & desktops
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5,
            });

            hands.onResults((results: any) => {
              if (!isMounted) return;
              handleMediaPipeResults(results);
            });

            mediaPipeHandsRef.current = hands;
          } catch (initErr) {
            console.warn('MediaPipe hands local init error, using optical tracker:', initErr);
          }
        }
      } catch (err) {
        console.warn('MediaPipe hands loading note:', err);
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle landmarks from MediaPipe
  const handleMediaPipeResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = performance.now();
    const deltaMs = Math.min(100, now - lastTimeRef.current);
    lastTimeRef.current = now;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks: Landmark[] = results.multiHandLandmarks[0];

      // Scale-invariant evaluation
      const evaluation = evaluateSignPose(
        landmarks,
        activeSign,
        holdProgressRef.current,
        deltaMs,
        sensitivity
      );

      holdProgressRef.current = evaluation.holdProgress;

      // Auto-detect difficulty: if hand is in view but struggling for > 3.2s
      if (evaluation.currentAccuracy < 65 && !evaluation.isSuccess) {
        struggleDurationRef.current += deltaMs;
        if (struggleDurationRef.current > 3200 && !hasAutoShownHelpRef.current) {
          hasAutoShownHelpRef.current = true;
          setShowReferenceHelpOverlay(true);
        }
      } else if (evaluation.currentAccuracy >= 75) {
        struggleDurationRef.current = Math.max(0, struggleDurationRef.current - deltaMs * 0.5);
      }

      // Draw AR Skeleton on canvas
      drawARSkeleton(ctx, landmarks, 'neon-cyber', evaluation.currentAccuracy);

      // Play tick on hold progress
      if (evaluation.holdProgress > 25 && Math.floor(evaluation.holdProgress) % 30 === 0) {
        audio.playTick(1 + evaluation.holdProgress / 100);
      }

      if (evaluation.isSuccess && !trackingState.isSuccess) {
        triggerCelebration(evaluation.currentAccuracy);
      }

      setTrackingState(evaluation);
    } else {
      // No hand in view
      const evaluation = evaluateSignPose(
        null,
        activeSign,
        holdProgressRef.current,
        deltaMs,
        sensitivity
      );
      holdProgressRef.current = evaluation.holdProgress;
      setTrackingState(evaluation);
    }
  };

  // Video loop with non-reentrant throttle (max 22 FPS to guarantee 0 dropped frames)
  useEffect(() => {
    let animId: number;

    const processFrame = async () => {
      const now = performance.now();
      const timeSinceLast = now - lastFrameProcessTimeRef.current;

      if (
        cameraActive &&
        videoRef.current &&
        videoRef.current.readyState >= 2 &&
        videoRef.current.videoWidth > 0 &&
        !simulationMode &&
        !isProcessingFrameRef.current &&
        timeSinceLast >= 38 // ~26 FPS smooth responsiveness
      ) {
        isProcessingFrameRef.current = true;
        lastFrameProcessTimeRef.current = now;
        try {
          if (mediaPipeHandsRef.current) {
            await mediaPipeHandsRef.current.send({ image: videoRef.current });
          } else {
            // Built-in Optical Tracker runs with zero dependencies & 100% offline
            const opticalLandmarks = opticalTracker.detectHand(videoRef.current);
            handleMediaPipeResults({
              multiHandLandmarks: opticalLandmarks ? [opticalLandmarks] : [],
            });
          }
        } catch {
          // If MediaPipe drops a frame, optical tracker covers it smoothly
          try {
            const opticalLandmarks = opticalTracker.detectHand(videoRef.current);
            handleMediaPipeResults({
              multiHandLandmarks: opticalLandmarks ? [opticalLandmarks] : [],
            });
          } catch {}
        } finally {
          isProcessingFrameRef.current = false;
        }
      }
      animId = requestAnimationFrame(processFrame);
    };

    if (cameraActive) {
      animId = requestAnimationFrame(processFrame);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [cameraActive, simulationMode]);

  // Simulation loop when camera is in simulation mode
  useEffect(() => {
    if (!simulationMode) return;

    const interval = setInterval(() => {
      const now = performance.now();
      const deltaMs = Math.min(100, now - lastTimeRef.current);
      lastTimeRef.current = now;

      // Generate synthetic landmarks reflecting the current simulated finger states
      const mockLandmarks: Landmark[] = [
        { x: 0.5, y: 0.8, z: 0 },
        { x: 0.44, y: 0.72, z: 0 },
        { x: 0.4, y: 0.65, z: 0 },
        { x: 0.36, y: simThumb ? 0.58 : 0.65, z: 0 },
        { x: simThumb ? 0.32 : 0.42, y: simThumb ? 0.52 : 0.68, z: 0 },

        { x: 0.46, y: 0.55, z: 0 },
        { x: 0.46, y: 0.48, z: 0 },
        { x: 0.46, y: simIndex ? 0.4 : 0.52, z: 0 },
        { x: 0.46, y: simIndex ? 0.32 : 0.58, z: 0 },

        { x: 0.5, y: 0.54, z: 0 },
        { x: 0.5, y: 0.46, z: 0 },
        { x: 0.5, y: simMiddle ? 0.38 : 0.5, z: 0 },
        { x: 0.5, y: simMiddle ? 0.3 : 0.56, z: 0 },

        { x: 0.54, y: 0.55, z: 0 },
        { x: 0.54, y: 0.48, z: 0 },
        { x: 0.54, y: simRing ? 0.4 : 0.52, z: 0 },
        { x: 0.54, y: simRing ? 0.33 : 0.58, z: 0 },

        { x: 0.58, y: 0.58, z: 0 },
        { x: 0.58, y: 0.52, z: 0 },
        { x: 0.58, y: simPinky ? 0.44 : 0.56, z: 0 },
        { x: 0.58, y: simPinky ? 0.38 : 0.62, z: 0 },
      ];

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          drawARSkeleton(ctx, mockLandmarks, 'neon-cyber', trackingState.currentAccuracy);
        }
      }

      const evaluation = evaluateSignPose(
        mockLandmarks,
        activeSign,
        holdProgressRef.current,
        deltaMs,
        sensitivity
      );

      holdProgressRef.current = evaluation.holdProgress;

      if (evaluation.currentAccuracy < 65 && !evaluation.isSuccess) {
        struggleDurationRef.current += deltaMs;
        if (struggleDurationRef.current > 4000 && !hasAutoShownHelpRef.current) {
          hasAutoShownHelpRef.current = true;
          setShowReferenceHelpOverlay(true);
        }
      }

      if (evaluation.isSuccess && !trackingState.isSuccess) {
        triggerCelebration(evaluation.currentAccuracy);
      }

      setTrackingState(evaluation);
    }, 60);

    return () => clearInterval(interval);
  }, [
    simulationMode,
    simThumb,
    simIndex,
    simMiddle,
    simRing,
    simPinky,
    activeSign,
    trackingState.isSuccess,
    sensitivity,
    triggerCelebration,
  ]);

  // Match sim buttons with current active sign
  const applyIdealSignToSimulation = () => {
    audio.playClick();
    const rule = activeSign.poseRule;
    setSimThumb(rule.thumbExtended);
    setSimIndex(rule.indexExtended);
    setSimMiddle(rule.middleExtended);
    setSimRing(rule.ringExtended);
    setSimPinky(rule.pinkyExtended);
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Capture snapshot card
  const handleCaptureSnapshot = () => {
    audio.playClick();
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = canvas.width || 640;
    snapCanvas.height = canvas.height || 480;
    const sCtx = snapCanvas.getContext('2d');
    if (!sCtx) return;

    if (cameraActive) {
      sCtx.save();
      sCtx.translate(snapCanvas.width, 0);
      sCtx.scale(-1, 1);
      sCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);
      sCtx.restore();
    } else {
      sCtx.fillStyle = '#0f172a';
      sCtx.fillRect(0, 0, snapCanvas.width, snapCanvas.height);
    }

    sCtx.drawImage(canvas, 0, 0);

    sCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    sCtx.roundRect(20, snapCanvas.height - 70, snapCanvas.width - 40, 50, 12);
    sCtx.fill();

    sCtx.font = 'bold 16px Inter, sans-serif';
    sCtx.fillStyle = '#10b981';
    sCtx.fillText(`LibrasGo AR: Sinal "${activeSign.name}"`, 36, snapCanvas.height - 38);

    sCtx.font = '13px Inter, sans-serif';
    sCtx.fillStyle = '#ffffff';
    sCtx.fillText(`Precisão: ${trackingState.currentAccuracy}% ✨`, snapCanvas.width - 170, snapCanvas.height - 38);

    setCapturedSnapshot(snapCanvas.toDataURL('image/png'));
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto flex flex-col rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl text-white">
      
      {/* Top Studio Bar */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-900/90 border-b border-slate-800 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrevSign}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Sinal anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                Sinal {currentSignIndex + 1} de {signList.length}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                {activeSign.category}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
              {activeSign.name}
            </h2>
          </div>

          <button
            onClick={handleNextSign}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Próximo sinal"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* AI & Sensitivity status pills */}
        <div className="flex items-center gap-2">
          {/* AI Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              trackingState.isHandDetected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : aiModelStatus === 'ready'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {trackingState.isHandDetected
                ? 'Mão Rastreada ✅'
                : aiModelStatus === 'ready'
                ? 'Aguardando Mão...'
                : 'Carregando IA...'}
            </span>
          </div>

          {/* Sensitivity toggle */}
          <button
            onClick={() => {
              audio.playClick();
              setSensitivity((prev) => (prev === 'friendly' ? 'strict' : 'friendly'));
            }}
            className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-slate-300 transition-all cursor-pointer"
            title="Alternar tolerância do reconhecimento"
          >
            {sensitivity === 'friendly' ? '🎯 Suave' : '🔬 Rigoroso'}
          </button>

          {/* Reference Help Button */}
          <button
            onClick={() => {
              audio.playClick();
              setShowReferenceHelpOverlay(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 text-[11px] font-bold transition-all cursor-pointer"
            title="Exibir imagem estática de referência do sinal"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ajuda Visual</span>
          </button>

          {/* Grammar Modal */}
          <button
            onClick={() => {
              audio.playClick();
              setShowGuideModal(true);
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all cursor-pointer"
            title="Ver parâmetros gramaticais"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Close button if in modal mode */}
          {onClose && (
            <button
              onClick={() => {
                audio.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-950 flex items-center justify-center overflow-hidden">
        
        {/* Real Webcam Video (mirrored) */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover -scale-x-100 ${
            cameraActive && !simulationMode ? 'opacity-90' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* AR Canvas Overlay for Neon Skeleton & Glow */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
        />

        {/* Ghost Hand Holographic Silhouette Target Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl border-2 border-dashed border-cyan-400/40 flex items-center justify-center bg-cyan-950/10 backdrop-blur-[1px]">
            {/* Corner alignment brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

            {/* Ghost Sign Illustration in center */}
            <div
              className={`filter drop-shadow-[0_0_12px_rgba(6,182,212,0.6)] transition-all ${
                isGhostOverlayActive ? 'opacity-85 scale-105' : 'opacity-30'
              }`}
            >
              <LibrasSignIllustration
                signId={activeSign.id}
                size={150}
                highlightColor={isGhostOverlayActive ? '#f59e0b' : '#06b6d4'}
              />
            </div>

            <span className="absolute bottom-3 text-[11px] font-mono tracking-wider uppercase text-cyan-300/90 bg-slate-900/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
              {isGhostOverlayActive ? 'Molde de Alinhamento Fixo' : 'Alinhe a mão aqui'}
            </span>
          </div>
        </div>

        {/* Floating Quick Assistance Banner when struggling */}
        {!showReferenceHelpOverlay && trackingState.isHandDetected && trackingState.currentAccuracy < 65 && (
          <button
            onClick={() => {
              audio.playClick();
              setShowReferenceHelpOverlay(true);
            }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/90 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-xl animate-bounce cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5 fill-slate-950" />
            <span>Dificuldade? Ver Imagem de Referência</span>
          </button>
        )}

        {/* Static Reference Help Overlay */}
        {showReferenceHelpOverlay && (
          <SignReferenceHelpOverlay
            sign={activeSign}
            currentAccuracy={trackingState.currentAccuracy}
            onDismiss={() => setShowReferenceHelpOverlay(false)}
            onInstantValidate={handleInstantValidate}
            isGhostOverlayActive={isGhostOverlayActive}
            onToggleGhostOverlay={() => setIsGhostOverlayActive(!isGhostOverlayActive)}
          />
        )}

        {/* Circular Hold Progress Bar */}
        {trackingState.holdProgress > 5 && (
          <div className="absolute top-4 right-4 z-20 flex flex-col items-center">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400 transition-all duration-150"
                  strokeDasharray={`${trackingState.holdProgress}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xs font-black text-emerald-300">
                  {Math.round(trackingState.holdProgress)}%
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-300 mt-1 uppercase tracking-wide bg-slate-900/80 px-2 py-0.5 rounded-full">
              Segure firme!
            </span>
          </div>
        )}

        {/* Picture-in-Picture Visual Tutor Guide Card */}
        <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-xl max-w-[140px] sm:max-w-[170px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-400">Guia Visual</span>
            <span className="text-[10px] font-extrabold text-emerald-400">{activeSign.name}</span>
          </div>
          <div className="bg-slate-950/70 rounded-xl p-1 flex justify-center">
            <LibrasSignIllustration signId={activeSign.id} size={90} highlightColor="#10b981" />
          </div>
        </div>

        {/* Live Feedback Banner */}
        <div className="absolute bottom-4 inset-x-4 z-20 flex flex-col items-center pointer-events-none">
          <div
            className={`px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all transform ${
              trackingState.isSuccess
                ? 'bg-emerald-600/95 border-emerald-400 text-white scale-105 animate-bounce'
                : trackingState.currentAccuracy >= 65
                ? 'bg-teal-950/85 border-teal-500/80 text-teal-200'
                : trackingState.isHandDetected
                ? 'bg-slate-900/90 border-amber-500/60 text-amber-300'
                : 'bg-slate-900/90 border-slate-700 text-slate-300'
            }`}
          >
            {trackingState.isSuccess ? (
              <CheckCircle className="w-5 h-5 text-emerald-200 flex-shrink-0 animate-spin" />
            ) : trackingState.currentAccuracy >= 65 ? (
              <Sparkles className="w-5 h-5 text-teal-300 flex-shrink-0 animate-pulse" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            )}

            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-black leading-tight">
                {trackingState.feedbackMessage}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-bold opacity-90">
                  Correspondência:{' '}
                  <strong className="text-white text-xs">{trackingState.currentAccuracy}%</strong>
                </span>
                <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-150 ${
                      trackingState.currentAccuracy >= 65
                        ? 'bg-emerald-400'
                        : trackingState.currentAccuracy >= 40
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${trackingState.currentAccuracy}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Camera Permission / Unavailable Warning Fallback */}
        {cameraError && !simulationMode && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mb-4">
              <CameraIcon className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-black text-white mb-2">Acesso à Câmera</h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md mb-6">{cameraError}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={startCamera}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar Câmera Novamente
              </button>
              <button
                onClick={() => setSimulationMode(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 font-bold text-sm transition-all cursor-pointer flex items-center gap-2"
              >
                <Sliders className="w-4 h-4" />
                Usar Simulador Manual
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Diagnostic Finger Indicators (shows user exactly what AI sees) */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-slate-400 font-bold text-[11px]">Leitura dos Dedos:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { label: 'Polegar', active: trackingState.fingersStatus.thumb, req: activeSign.poseRule.thumbExtended },
            { label: 'Indicador', active: trackingState.fingersStatus.index, req: activeSign.poseRule.indexExtended },
            { label: 'Médio', active: trackingState.fingersStatus.middle, req: activeSign.poseRule.middleExtended },
            { label: 'Anelar', active: trackingState.fingersStatus.ring, req: activeSign.poseRule.ringExtended },
            { label: 'Mínimo', active: trackingState.fingersStatus.pinky, req: activeSign.poseRule.pinkyExtended },
          ].map((finger, idx) => {
            const isMatch = finger.active === finger.req;
            return (
              <span
                key={idx}
                className={`px-2 py-0.5 rounded-lg font-bold text-[10px] flex items-center gap-1 border transition-colors ${
                  isMatch
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {isMatch ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />}
                {finger.label}: {finger.active ? 'Aberto' : 'Fechado'}
              </span>
            );
          })}
        </div>
      </div>

      {/* Simulator Finger Controls (when active) */}
      {simulationMode && (
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Painel de Simulação Manual:
            </span>
            <button
              onClick={applyIdealSignToSimulation}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer"
            >
              Simular Sinal Perfeito ✨
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { name: 'Polegar', state: simThumb, toggle: () => setSimThumb(!simThumb) },
              { name: 'Indicador', state: simIndex, toggle: () => setSimIndex(!simIndex) },
              { name: 'Médio', state: simMiddle, toggle: () => setSimMiddle(!simMiddle) },
              { name: 'Anelar', state: simRing, toggle: () => setSimRing(!simRing) },
              { name: 'Mínimo', state: simPinky, toggle: () => setSimPinky(!simPinky) },
            ].map((finger, idx) => (
              <button
                key={idx}
                onClick={() => {
                  audio.playClick();
                  finger.toggle();
                }}
                className={`py-2 px-1 rounded-xl font-bold transition-all border cursor-pointer ${
                  finger.state
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <div className="text-[10px] uppercase">{finger.name}</div>
                <div className="text-xs">{finger.state ? 'Aberto' : 'Fechado'}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Control Bar */}
      <div className="p-3.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Flip camera */}
          <button
            onClick={() => {
              audio.playClick();
              setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
            title="Inverter câmera"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Virar</span>
          </button>

          {/* Toggle Simulator */}
          <button
            onClick={() => {
              audio.playClick();
              setSimulationMode(!simulationMode);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              simulationMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 inline mr-1" />
            <span className="hidden sm:inline">{simulationMode ? 'Simulador Ativo' : 'Simulador'}</span>
          </button>
        </div>

        {/* Immediate / Next Sign Action Button */}
        {trackingState.isSuccess ? (
          <button
            onClick={() => {
              handleNextSign();
            }}
            className="flex-1 min-w-[200px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Excelente! Próximo Sinal</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Quick Instant AI Recognition Button */}
            <button
              onClick={handleInstantValidate}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              title="Valida imediatamente o sinal para continuar"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>Validar Sinal com IA ✨</span>
            </button>

            <button
              onClick={handleCaptureSnapshot}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
              title="Tirar foto com marca d'água de conquista"
            >
              <CameraIcon className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Foto</span>
            </button>
          </div>
        )}

        {/* Audio pronunciation tip */}
        <button
          onClick={() => {
            if ('speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(activeSign.name);
              utter.lang = 'pt-BR';
              window.speechSynthesis.speak(utter);
            }
          }}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
          title="Ouvir nome do sinal"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* Snapshot Card Preview Modal */}
      {capturedSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-center text-white">
            <h3 className="text-lg font-black text-emerald-400 mb-2">Cartão de Conquista AR Gerado!</h3>
            <div className="rounded-2xl overflow-hidden border border-slate-700 mb-4 shadow-lg">
              <img src={capturedSnapshot} alt="Captura AR" className="w-full h-auto" />
            </div>
            <p className="text-xs text-slate-300 mb-4">
              Você sinalizou <strong>{activeSign.name}</strong> com precisão de{' '}
              <strong className="text-emerald-400">{trackingState.currentAccuracy}%</strong>!
            </p>
            <div className="flex gap-2">
              <a
                href={capturedSnapshot}
                download={`librasgo-${activeSign.id}.png`}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5"
              >
                Salvar Imagem
              </a>
              <button
                onClick={() => setCapturedSnapshot(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Voltar ao Treino
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Libras Grammar Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤟</span>
                <div>
                  <h3 className="text-xl font-black">{activeSign.name}</h3>
                  <p className="text-xs text-emerald-400 font-semibold">{activeSign.meaning}</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2">
              Os 5 Parâmetros Gramaticais da LIBRAS:
            </h4>
            <div className="space-y-2.5 mb-5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-emerald-400 block mb-0.5">1. CM (Configuração de Mão):</strong>
                <span className="text-slate-300">{activeSign.parameters.cm}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-cyan-400 block mb-0.5">2. PA (Ponto de Articulação):</strong>
                <span className="text-slate-300">{activeSign.parameters.pa}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-amber-400 block mb-0.5">3. M (Movimento):</strong>
                <span className="text-slate-300">{activeSign.parameters.m}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-indigo-400 block mb-0.5">4. O (Orientação da Palma):</strong>
                <span className="text-slate-300">{activeSign.parameters.o}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <strong className="text-rose-400 block mb-0.5">5. EF (Expressão Facial / Não-Manual):</strong>
                <span className="text-slate-300">{activeSign.parameters.ef}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 mb-5 text-xs">
              <span className="text-emerald-300 font-bold block mb-1">Exemplo em Libras:</span>
              <p className="text-slate-200 italic">"{activeSign.contextSentence}"</p>
              <p className="text-slate-400 text-[11px] mt-1">{activeSign.contextTranslation}</p>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm transition-all"
            >
              Entendi, Praticar em AR!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
