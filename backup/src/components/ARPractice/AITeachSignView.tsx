import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Video,
  Award,
  Layers,
  ChevronRight,
  BookOpen,
  Eye,
  Sliders,
  Check,
  X,
  Play,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  Activity,
  Smile,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  UserStats,
  TaughtSign,
  TaughtSignSample,
  FacialTrackingState,
} from '../../types/libras';
import { aiSignLearner, AISignEvaluationResult } from '../../services/aiSignLearner';
import { opticalTracker } from '../../services/opticalHandTracker';
import { analyzeFingers } from '../../services/handTracker';
import { facialTracker } from '../../services/facialTracker';
import { audio } from '../../services/audioService';

interface AITeachSignViewProps {
  userStats: UserStats;
  onTaughtSignSaved?: () => void;
  onAwardXp?: (xp: number, gems: number) => void;
}

export const AITeachSignView: React.FC<AITeachSignViewProps> = ({
  userStats,
  onTaughtSignSaved,
  onAwardXp,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'teach' | 'review' | 'my_signs'>('teach');
  const [userSigns, setUserSigns] = useState<TaughtSign[]>([]);
  const [isLoadingSigns, setIsLoadingSigns] = useState(false);

  // Teaching input mode: 'live_motion' (ao vivo em tempo real) vs 'image_capture' (captura/upload de imagem)
  const [teachMode, setTeachMode] = useState<'live_motion' | 'image_capture'>('live_motion');

  // Form State
  const [signName, setSignName] = useState('');
  const [signMeaning, setSignMeaning] = useState('');
  const [signCategory, setSignCategory] = useState('cotidiano');
  const [signSentence, setSignSentence] = useState('');
  const [recordedSamples, setRecordedSamples] = useState<TaughtSignSample[]>([]);

  // Camera & Recording
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRecordingLiveMotion, setIsRecordingLiveMotion] = useState(false);
  const [recordCountdown, setRecordCountdown] = useState<number | null>(null);
  const [liveMotionProgress, setLiveMotionProgress] = useState(0);

  // Live Tracking state
  const [liveHandDetected, setLiveHandDetected] = useState(false);
  const [liveFaceDetected, setLiveFaceDetected] = useState(false);
  const [facialState, setFacialState] = useState<FacialTrackingState | null>(null);

  // Review Mode State
  const [selectedReviewSign, setSelectedReviewSign] = useState<TaughtSign | null>(null);
  const [reviewEvaluation, setReviewEvaluation] = useState<AISignEvaluationResult | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // In-app Feedback Toast & Delete Modal
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [signToDelete, setSignToDelete] = useState<{ id: string; name: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load User's Taught Signs from Cloud Database
  const loadSigns = useCallback(async () => {
    setIsLoadingSigns(true);
    const identifier = userStats.username || userStats.syncCode || 'aluno';
    const signs = await aiSignLearner.fetchUserSigns(identifier);
    setUserSigns(signs);
    if (signs.length > 0 && !selectedReviewSign) {
      setSelectedReviewSign(signs[0]);
    }
    setIsLoadingSigns(false);
  }, [userStats.username, userStats.syncCode, selectedReviewSign]);

  useEffect(() => {
    loadSigns();
  }, [loadSigns]);

  // Start Camera
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }
      setCameraActive(true);
      setCameraError(null);
    } catch {
      setCameraActive(false);
      setCameraError('Permissão para uso da câmera não concedida ou dispositivo ocupado.');
    }
  }, []);

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

  // CRITICAL FIX: Ensure camera video element has the active stream whenever subtab changes!
  useEffect(() => {
    if (videoRef.current) {
      if (streamRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
        setCameraActive(true);
      } else if (!streamRef.current && (activeSubTab === 'teach' || activeSubTab === 'review')) {
        startCamera();
      }
    }
  }, [activeSubTab, startCamera]);

  // Optical analysis loop for live hand and facial tracking
  useEffect(() => {
    let isMounted = true;

    const loop = () => {
      if (!isMounted) return;

      if (videoRef.current && videoRef.current.readyState >= 2) {
        // Face analysis
        const face = facialTracker.analyzeFace(videoRef.current);
        setFacialState(face);
        setLiveFaceDetected(face.isFaceDetected);

        // Hand analysis
        const hand = opticalTracker.detectHand(videoRef.current);
        setLiveHandDetected(Boolean(hand && hand.length >= 21));

        // In Review Mode: Real-time comparison with saved sign samples
        if (activeSubTab === 'review' && selectedReviewSign && !reviewSuccess) {
          const evalResult = aiSignLearner.evaluateAgainstSign(hand, face, selectedReviewSign);
          setReviewEvaluation(evalResult);

          if (evalResult.isMatch) {
            setReviewSuccess(true);
            audio.playSuccess();
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
            if (onAwardXp) {
              onAwardXp(25, 10);
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isMounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeSubTab, selectedReviewSign, reviewSuccess, onAwardXp]);

  // Helper to grab base64 snapshot of current video frame
  const grabVideoSnapshot = (): string | undefined => {
    if (!videoRef.current || videoRef.current.readyState < 2) return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 240;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();
        return canvas.toDataURL('image/jpeg', 0.7);
      }
    } catch {}
    return undefined;
  };

  // Extract features from current video frame as a sample
  const extractCurrentSample = (customSnapshot?: string): TaughtSignSample => {
    let face = facialState;
    if (!face && videoRef.current) {
      face = facialTracker.analyzeFace(videoRef.current);
    }
    const defaultFace: FacialTrackingState = {
      isFaceDetected: false,
      confidence: 0,
      headPose: { yaw: 0, pitch: 0, roll: 0, movement: 'neutral', isNoddingYes: false, isShakingNo: false },
      eyebrowsState: 'neutral',
      eyebrowRaiseScore: 50,
      mouthState: 'neutral',
      mouthOpenScore: 20,
      eyeBlink: { left: false, right: false },
      landmarks: null,
      feedbackMessage: '',
      detectedExpressions: [],
    };
    const effectiveFace = face || defaultFace;

    const hand = videoRef.current ? opticalTracker.detectHand(videoRef.current) : null;
    let handAnalysisData;
    if (hand && hand.length >= 21) {
      const analyzed = analyzeFingers(hand);
      handAnalysisData = {
        thumb: analyzed.thumb,
        index: analyzed.index,
        middle: analyzed.middle,
        ring: analyzed.ring,
        pinky: analyzed.pinky,
        handFacing: analyzed.handFacing,
      };
    }

    const snapshot = customSnapshot || grabVideoSnapshot();

    return {
      id: `sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      handAnalysis: handAnalysisData,
      handLandmarks: hand || undefined,
      facialFeatures: {
        eyebrowsState: effectiveFace.eyebrowsState,
        headMovement: effectiveFace.headPose.movement,
        mouthState: effectiveFace.mouthState,
        pitch: effectiveFace.headPose.pitch,
        yaw: effectiveFace.headPose.yaw,
      },
      imageSnapshot: snapshot,
    };
  };

  // MODO 1: GRAVAÇÃO AO VIVO EM TEMPO REAL (Trajetória de Movimento e Expressão Facial)
  const handleStartLiveMotionRecording = () => {
    if (!videoRef.current) return;
    audio.playClick();
    setIsRecordingLiveMotion(true);
    setRecordCountdown(3);

    const countdownTimer = setInterval(() => {
      setRecordCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownTimer);
          beginMotionSampling();
          return null;
        }
        audio.playClick();
        return prev - 1;
      });
    }, 1000);
  };

  const beginMotionSampling = () => {
    audio.playClick();
    const durationMs = 3000;
    const intervalMs = 400;
    const totalFrames = Math.floor(durationMs / intervalMs);
    let framesCaptured = 0;
    const captured: TaughtSignSample[] = [];

    const samplingInterval = setInterval(() => {
      framesCaptured++;
      const pct = Math.round((framesCaptured / totalFrames) * 100);
      setLiveMotionProgress(pct);

      const samp = extractCurrentSample();
      captured.push(samp);

      if (framesCaptured >= totalFrames) {
        clearInterval(samplingInterval);
        setIsRecordingLiveMotion(false);
        setLiveMotionProgress(0);
        audio.playSuccess();
        setRecordedSamples((prev) => [...prev, ...captured]);
        showToast('success', `${captured.length} quadros de movimento e expressão facial registrados com sucesso!`);
      }
    }, intervalMs);
  };

  // MODO 2: CAPTURA POR IMAGEM / FOTO INSTANTÂNEA
  const handleCaptureInstantPhoto = () => {
    if (!videoRef.current) return;
    audio.playClick();
    const sample = extractCurrentSample();
    setRecordedSamples((prev) => [...prev, sample]);
    audio.playSuccess();
    showToast('success', 'Foto do sinal e expressão facial capturada com sucesso!');
  };

  // UPLOAD DE IMAGEM DO DISPOSITIVO
  const handleUploadImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    audio.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Create canvas to analyze image
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const face = facialTracker.analyzeFace(canvas);
          const hand = opticalTracker.detectHand(canvas);

          let handAnalysisData;
          if (hand && hand.length >= 21) {
            const analyzed = analyzeFingers(hand);
            handAnalysisData = {
              thumb: analyzed.thumb,
              index: analyzed.index,
              middle: analyzed.middle,
              ring: analyzed.ring,
              pinky: analyzed.pinky,
              handFacing: analyzed.handFacing,
            };
          }

          const sample: TaughtSignSample = {
            id: `sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toISOString(),
            handAnalysis: handAnalysisData,
            handLandmarks: hand || undefined,
            facialFeatures: {
              eyebrowsState: face.eyebrowsState,
              headMovement: face.headPose.movement,
              mouthState: face.mouthState,
              pitch: face.headPose.pitch,
              yaw: face.headPose.yaw,
            },
            imageSnapshot: dataUrl,
          };

          setRecordedSamples((prev) => [...prev, sample]);
          audio.playSuccess();
          showToast('success', 'Imagem enviada e analisada pela IA com sucesso!');
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Submit and save sign to cloud database
  const handleSaveTaughtSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signName.trim() || !signMeaning.trim()) {
      showToast('error', 'Preencha o nome e o significado do sinal.');
      return;
    }

    if (recordedSamples.length === 0) {
      showToast('error', 'Grave pelo menos 1 exemplo ao vivo ou por captura de imagem.');
      return;
    }

    const username = userStats.username || 'Aluno';
    const syncCode = userStats.syncCode || 'LIB-9999';

    const res = await aiSignLearner.saveTaughtSign(username, syncCode, {
      name: signName.trim(),
      meaning: signMeaning.trim(),
      category: signCategory,
      contextSentence: signSentence.trim(),
      samples: recordedSamples,
    });

    if (res.success) {
      audio.playVictory();
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      showToast('success', `Sinal "${signName.trim()}" ensinado à IA e salvo no banco em nuvem com sucesso!`);
      
      if (onAwardXp) {
        onAwardXp(50, 20);
      }

      setSignName('');
      setSignMeaning('');
      setSignSentence('');
      setRecordedSamples([]);
      await loadSigns();
      setActiveSubTab('my_signs');
      if (onTaughtSignSaved) onTaughtSignSaved();
    } else {
      showToast('error', res.message || 'Erro ao salvar o sinal.');
    }
  };

  // Delete sign with modal confirmation
  const executeDeleteSign = async () => {
    if (!signToDelete) return;
    const ok = await aiSignLearner.deleteTaughtSign(signToDelete.id, userStats.username, userStats.syncCode);
    if (ok) {
      audio.playClick();
      showToast('success', `Sinal "${signToDelete.name}" removido com sucesso.`);
      setSignToDelete(null);
      await loadSigns();
    } else {
      showToast('error', 'Não foi possível remover o sinal.');
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 select-none">
      {/* Feedback Toast Notification */}
      {feedback && (
        <div
          className={`mb-4 p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 shadow-xl ${
            feedback.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/60 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-3xl p-4 sm:p-6 mb-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              Aprendizagem Personalizada • Mãos & Expressão Facial
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2 mt-1">
              <span>Ensinar Sinais à IA</span>
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Ensine novos sinais de Libras à IA <strong className="text-white">ao vivo em tempo real</strong> (gravando movimentos) ou <strong className="text-white">por captura de imagem/foto</strong> com expressões faciais. Pratique e revise quando quiser!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-700">
              {userSigns.length} sinais ensinados
            </span>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 mt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              audio.playClick();
              setActiveSubTab('teach');
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'teach'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Gravar & Ensinar Novo Sinal</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveSubTab('review');
              setReviewSuccess(false);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'review'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Revisar Sinais Aprendidos</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveSubTab('my_signs');
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeSubTab === 'my_signs'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Minha Biblioteca de Sinais ({userSigns.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TEACH A NEW SIGN */}
      {activeSubTab === 'teach' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* Camera Viewport & Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Mode Selector Pill (Ao Vivo vs Captura de Imagem) */}
            <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setTeachMode('live_motion');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  teachMode === 'live_motion'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-cyan-300" />
                <span>Ao Vivo em Tempo Real (Movimento)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  setTeachMode('image_capture');
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  teachMode === 'image_capture'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>Captura por Imagem / Foto</span>
              </button>
            </div>

            <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform scale-x-[-1]"
              />

              {/* Status HUD Badges */}
              <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                      liveHandDetected
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${liveHandDetected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>Mão: {liveHandDetected ? 'Pronta' : 'Aguardando...'}</span>
                  </span>

                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 backdrop-blur-md shadow-md ${
                      liveFaceDetected
                        ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900/80 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${liveFaceDetected ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                    <span>Rosto: {liveFaceDetected ? (facialState?.detectedExpressions[0] || 'Alinhado') : 'Aguardando...'}</span>
                  </span>
                </div>

                <span className="text-[10px] font-mono text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
                  {recordedSamples.length} amostras
                </span>
              </div>

              {/* Countdown Overlay */}
              {recordCountdown !== null && (
                <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center">
                  <span className="text-7xl font-black text-amber-400 animate-ping">
                    {recordCountdown}
                  </span>
                </div>
              )}

              {/* Live Motion Recording Progress Bar */}
              {isRecordingLiveMotion && (
                <div className="absolute inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                  <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wider mb-2 animate-pulse">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Gravando Movimento do Sinal...</span>
                  </div>
                  <p className="text-xs text-white max-w-xs mb-3">
                    Faça o sinal completo com a mão e a expressão facial solicitada.
                  </p>
                  <div className="w-56 h-2.5 bg-black/80 rounded-full overflow-hidden border border-rose-500/50">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-100"
                      style={{ width: `${liveMotionProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Camera Error Overlay */}
              {!cameraActive && (
                <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                  <h4 className="text-sm font-black text-white">Câmera Não Conectada</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 mb-3">
                    {cameraError || 'Ative a câmera para gravar sinais ou utilize o envio de fotos abaixo.'}
                  </p>
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ligar Câmera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Record Sample Trigger Bar based on teachMode */}
            <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold text-white block">
                  {teachMode === 'live_motion'
                    ? 'Gravar Movimento em Tempo Real (3 segundos)'
                    : 'Capturar por Imagem / Foto do Sinal'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {teachMode === 'live_motion'
                    ? 'A IA registra o percurso da mão e as mudanças de expressão facial ao vivo.'
                    : 'Tire uma foto instantânea da mão e rosto ou selecione uma imagem do seu aparelho.'}
                </span>
              </div>

              {teachMode === 'live_motion' ? (
                <button
                  disabled={isRecordingLiveMotion}
                  onClick={handleStartLiveMotionRecording}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>{isRecordingLiveMotion ? 'Gravando...' : 'Gravar ao Vivo (3s)'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCaptureInstantPhoto}
                    className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-lg shadow-cyan-600/30 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Tirar Foto</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadImageFile}
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>Upload Foto</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form & Metadata Details */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h3 className="text-base font-black text-white mb-3">
              Identificação do Sinal
            </h3>

            <form onSubmit={handleSaveTaughtSign} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Nome do Sinal em Português *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Computador, Amizade, Café..."
                  value={signName}
                  onChange={(e) => setSignName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Significado / Descrição do Sinal *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explique o que significa ou como é executado..."
                  value={signMeaning}
                  onChange={(e) => setSignMeaning(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Categoria
                  </label>
                  <select
                    value={signCategory}
                    onChange={(e) => setSignCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="cotidiano">Cotidiano</option>
                    <option value="tecnologia">Tecnologia</option>
                    <option value="saudacoes">Saudações</option>
                    <option value="emocoes">Emoções</option>
                    <option value="alimentos">Alimentos</option>
                    <option value="familia">Família</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Exemplo em Frase (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Eu gosto de..."
                    value={signSentence}
                    onChange={(e) => setSignSentence(e.target.value)}
                    className="w-full px-3 py-2 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Recorded Samples List with Visual Previews */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                  <span>Amostras Gravadas ({recordedSamples.length})</span>
                  {recordedSamples.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecordedSamples([])}
                      className="text-rose-400 hover:text-rose-300 text-[11px] font-bold cursor-pointer"
                    >
                      Limpar Amostras
                    </button>
                  )}
                </div>

                {recordedSamples.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                    Nenhuma amostra gravada ainda. Grave ao vivo ou capture uma foto acima para ensinar à IA.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {recordedSamples.map((samp, idx) => (
                      <div
                        key={samp.id}
                        className="p-2 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-[10px] text-slate-300"
                      >
                        {samp.imageSnapshot ? (
                          <img
                            src={samp.imageSnapshot}
                            alt="Snapshot"
                            className="w-12 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-500 font-mono text-[9px]">
                            #{idx + 1}
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">Amostra #{idx + 1}</span>
                          <span className="text-emerald-400 block truncate">
                            {samp.handAnalysis ? 'Mão detectada' : 'Sem mão'}
                          </span>
                          <span className="text-cyan-400 block truncate">
                            {samp.facialFeatures?.eyebrowsState || 'Rosto alinhado'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={recordedSamples.length === 0}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Salvar Sinal na Nuvem (+50 XP)</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REVIEW TAUGHT SIGNS */}
      {activeSubTab === 'review' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {userSigns.length === 0 ? (
            <div className="col-span-12 p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-black text-white">Nenhum Sinal Ensinado Ainda</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                Você ainda não ensinou novos sinais à IA. Use a aba "Gravar & Ensinar Novo Sinal" para registrar o primeiro!
              </p>
              <button
                onClick={() => setActiveSubTab('teach')}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                Gravar Primeiro Sinal
              </button>
            </div>
          ) : (
            <>
              {/* Review Camera Viewport */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform scale-x-[-1]"
                  />

                  {/* Target Sign Prompt Overlay */}
                  <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-2 bg-slate-950/85 backdrop-blur-md p-3 rounded-2xl border border-slate-800">
                    <div>
                      <span className="text-[10px] font-black uppercase text-cyan-400">
                        Reproduza o Sinal para a IA:
                      </span>
                      <h4 className="text-base font-black text-white">
                        {selectedReviewSign?.name}
                      </h4>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">Confiança da IA:</span>
                      <span className={`text-sm font-black font-mono ${
                        (reviewEvaluation?.confidence || 0) >= 80 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {reviewEvaluation?.confidence || 0}%
                      </span>
                    </div>
                  </div>

                  {/* Success notification */}
                  {reviewSuccess && (
                    <div className="absolute inset-0 z-30 bg-emerald-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                      <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-2 animate-bounce" />
                      <h3 className="text-xl font-black text-white">Sinal Reconhecido com Maestria!</h3>
                      <p className="text-xs text-emerald-200 mt-1 mb-4">
                        A IA comparou seu movimento com as amostras salvas no banco em nuvem e confirmou o padrão correto (+25 XP).
                      </p>
                      <button
                        onClick={() => {
                          setReviewSuccess(false);
                          const nextIdx = (userSigns.findIndex((s) => s.id === selectedReviewSign?.id) + 1) % userSigns.length;
                          setSelectedReviewSign(userSigns[nextIdx]);
                        }}
                        className="px-5 py-2.5 rounded-2xl bg-white text-slate-950 font-black text-xs shadow-xl cursor-pointer"
                      >
                        Praticar Próximo Sinal
                      </button>
                    </div>
                  )}

                  {/* Camera Reconnect Helper if video went idle */}
                  {!cameraActive && (
                    <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center">
                      <AlertCircle className="w-10 h-10 text-cyan-400 mb-2" />
                      <h4 className="text-sm font-black text-white">Ativar Câmera para Revisão</h4>
                      <p className="text-xs text-slate-400 max-w-xs mt-1 mb-3">
                        Ligue a câmera para que a IA compare seus movimentos e expressões com as amostras salvas.
                      </p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-600/30"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Ligar Câmera</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Intelligent Advice Box with Instant Validation Option */}
                <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 block">
                        Orientação do Comparador Visual:
                      </span>
                      <span className="text-slate-200 font-bold text-xs">
                        {reviewEvaluation?.feedbackAdvice || 'Posicione-se em frente à câmera e reproduza o sinal com clareza.'}
                      </span>
                    </div>
                  </div>

                  {!reviewSuccess && (
                    <button
                      onClick={() => {
                        setReviewSuccess(true);
                        audio.playSuccess();
                        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
                        if (onAwardXp) {
                          onAwardXp(25, 10);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap self-end sm:self-auto"
                      title="Validação manual do sinal para praticar"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Validar Sinal (+25 XP)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Review Sidebar with User Signs list */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-white mb-2">
                    Selecione o Sinal para Praticar
                  </h3>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {userSigns.map((sign) => {
                      const isSelected = selectedReviewSign?.id === sign.id;
                      return (
                        <button
                          key={sign.id}
                          onClick={() => {
                            audio.playClick();
                            setSelectedReviewSign(sign);
                            setReviewSuccess(false);
                          }}
                          className={`w-full p-3 rounded-2xl text-left transition-all cursor-pointer border flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-600/20 border-indigo-500 text-white'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div>
                            <span className="font-extrabold text-xs block">{sign.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
                              {sign.meaning}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-cyan-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                            {sign.samples.length} amostras
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedReviewSign && (
                  <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                    <span className="font-bold text-white block mb-0.5">Exemplo no contexto:</span>
                    <p className="italic text-slate-400">{selectedReviewSign.contextSentence}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 3: MY SIGNS MANAGEMENT */}
      {activeSubTab === 'my_signs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-black text-white">Sinais Registrados na Nuvem</h3>
              <p className="text-xs text-slate-400">
                Estes sinais ficam permanentemente vinculados à sua conta ({userStats.username || 'Aluno'}) e sincronizados entre todos os seus dispositivos.
              </p>
            </div>
            <button
              onClick={() => setActiveSubTab('teach')}
              className="px-3.5 py-1.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Sinal</span>
            </button>
          </div>

          {userSigns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum sinal salvo até o momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {userSigns.map((sign) => (
                <div
                  key={sign.id}
                  className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-black text-white">{sign.name}</span>
                      <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {sign.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{sign.meaning}</p>
                    {sign.contextSentence && (
                      <p className="text-[11px] text-slate-400 italic mt-1">"{sign.contextSentence}"</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span>{sign.samples.length} amostras gravadas</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedReviewSign(sign);
                          setActiveSubTab('review');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                      >
                        Praticar
                      </button>
                      <button
                        onClick={() => {
                          audio.playClick();
                          setSignToDelete({ id: sign.id, name: sign.name });
                        }}
                        className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer transition-colors"
                        title="Excluir sinal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Deleting Sign */}
      {signToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-center animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Excluir Sinal da IA?</h3>
            <p className="text-xs text-slate-300 mt-1 mb-4 leading-relaxed">
              Tem certeza que deseja remover o sinal <strong className="text-white">"{signToDelete.name}"</strong> da memória da sua IA?
            </p>
            <div className="flex items-center justify-center gap-2.5">
              <button
                onClick={() => setSignToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteSign}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
