import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Upload,
  RefreshCw,
  Trash2,
  Edit3,
  Bot,
  Layers,
  Smile,
  Eye,
  Check,
  X,
  Sliders,
  Award,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  UserStats,
  TaughtFacialExpression,
  FacialExpressionCategory,
  EyebrowsState,
  HeadMovementType,
  MouthState,
  FacialTrackingState,
} from '../../types/libras';
import { learnedExpressionsService, AIExpressionValidationResult } from '../../services/learnedExpressionsService';
import { facialTracker } from '../../services/facialTracker';
import { audio } from '../../services/audioService';

interface AITeachFacialViewProps {
  userStats: UserStats;
  onExpressionSaved?: (expression: TaughtFacialExpression) => void;
  onAwardXp?: (xp: number, gems: number) => void;
  onPracticeInStudio?: (expressionId: string) => void;
}

export const AITeachFacialView: React.FC<AITeachFacialViewProps> = ({
  userStats,
  onExpressionSaved,
  onAwardXp,
  onPracticeInStudio,
}) => {
  const [activeTab, setActiveTab] = useState<'teach' | 'my_list' | 'community'>('teach');
  const [userExpressions, setUserExpressions] = useState<TaughtFacialExpression[]>([]);
  const [communityExpressions, setCommunityExpressions] = useState<TaughtFacialExpression[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<FacialExpressionCategory>('interrogativas');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Parameters
  const [eyebrows, setEyebrows] = useState<EyebrowsState>('raised');
  const [headMovement, setHeadMovement] = useState<HeadMovementType>('neutral');
  const [mouth, setMouth] = useState<MouthState>('neutral');

  // AI Validation State
  const [isValidatingAI, setIsValidatingAI] = useState(false);
  const [aiResult, setAiResult] = useState<AIExpressionValidationResult | null>(null);

  // Camera Refs & State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef<boolean>(true);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('user');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Feedback Toast & Confirmation Modal
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [expressionToDelete, setExpressionToDelete] = useState<TaughtFacialExpression | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Load User and Community Expressions
  const loadExpressions = useCallback(async () => {
    setIsLoading(true);
    const identifier = userStats.username || userStats.syncCode || 'aluno';
    const [userList, commList] = await Promise.all([
      learnedExpressionsService.fetchUserExpressions(identifier),
      learnedExpressionsService.fetchCommunityExpressions(),
    ]);
    setUserExpressions(userList);
    setCommunityExpressions(commList);
    setIsLoading(false);
  }, [userStats.username, userStats.syncCode]);

  useEffect(() => {
    loadExpressions();
  }, [loadExpressions]);

  // Camera Management
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {}
      }
      setCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setCameraActive(false);
      setCameraError('Câmera indisponível ou permissão bloqueada. Você também pode enviar uma foto.');
    }
  }, [cameraFacing]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {}
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (activeTab === 'teach' && !previewImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [activeTab, previewImage, startCamera, stopCamera]);

  // Capture Photo from Camera
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    audio.playClick();
    setCountdown(3);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdown(count);
      } else {
        clearInterval(interval);
        setCountdown(null);
        captureFrameNow();
      }
    }, 800);
  };

  const captureFrameNow = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (cameraFacing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPreviewImage(dataUrl);
      stopCamera();
      audio.playSuccess();

      // Trigger automatic AI validation on capture if title or description present
      handleAutoValidateAI(dataUrl);
    } catch (err) {
      showToast('error', 'Erro ao capturar foto da câmera.');
    }
  };

  // Upload Photo from File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('error', 'Por favor, selecione um arquivo de imagem válido (JPG, PNG ou WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        audio.playClick();
        setPreviewImage(result);
        stopCamera();
        handleAutoValidateAI(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Automated or Manual AI Validation
  const handleAutoValidateAI = async (imgData: string) => {
    setIsValidatingAI(true);
    const res = await learnedExpressionsService.validateWithAI({
      imageBase64: imgData,
      name: name || 'Expressão em Libras',
      description: description || 'Parâmetro não manual gramatical',
      category,
      currentParameters: {
        eyebrows,
        headMovement,
        mouth,
      },
    });

    if (res.success && res.validation) {
      setAiResult(res.validation);
      // Auto-tune parameters from AI detection if learner hasn't manually set them
      if (res.validation.eyebrows) setEyebrows(res.validation.eyebrows);
      if (res.validation.headMovement) setHeadMovement(res.validation.headMovement);
      if (res.validation.mouth) setMouth(res.validation.mouth);
    }
    setIsValidatingAI(false);
  };

  const handleManualAIValidate = () => {
    if (!previewImage) {
      showToast('error', 'Capture uma foto pela câmera ou envie uma imagem antes de validar.');
      return;
    }
    audio.playClick();
    handleAutoValidateAI(previewImage);
  };

  // Clear / Retake
  const handleRetake = () => {
    audio.playClick();
    setPreviewImage(null);
    setAiResult(null);
    startCamera();
  };

  // Save or Update Expression
  const handleSaveExpression = async () => {
    if (!name.trim()) {
      showToast('error', 'Informe um nome para a expressão facial (ex: Pergunta QUEM? / ONDE?).');
      return;
    }
    if (!description.trim()) {
      showToast('error', 'Informe uma breve descrição de quando usar esta expressão em Libras.');
      return;
    }
    if (!previewImage) {
      showToast('error', 'Capture ou envie uma foto com a expressão facial.');
      return;
    }

    const username = userStats.username || 'Aluno';
    const syncCode = userStats.syncCode || 'LIB-9999';

    if (editingId) {
      // Update existing
      const res = await learnedExpressionsService.updateExpression(editingId, username, syncCode, {
        name: name.trim(),
        description: description.trim(),
        category,
        imageUrl: previewImage,
        parameters: {
          eyebrows,
          headMovement,
          mouth,
        },
        aiAnalysis: aiResult
          ? {
              confidence: aiResult.confidence,
              feedback: aiResult.feedback,
              detectedFeatures: aiResult.detectedFeatures,
              validatedByAI: true,
            }
          : undefined,
      });

      if (res.success) {
        audio.playSuccess();
        confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        showToast('success', res.message || 'Expressão atualizada com sucesso!');
        setEditingId(null);
        resetForm();
        loadExpressions();
        setActiveTab('my_list');
        if (res.expression && onExpressionSaved) {
          onExpressionSaved(res.expression);
        }
      } else {
        showToast('error', res.message || 'Erro ao atualizar expressão.');
      }
    } else {
      // Create new
      const res = await learnedExpressionsService.saveExpression(username, syncCode, {
        name: name.trim(),
        description: description.trim(),
        category,
        imageUrl: previewImage,
        parameters: {
          eyebrows,
          headMovement,
          mouth,
        },
        aiAnalysis: aiResult
          ? {
              confidence: aiResult.confidence,
              feedback: aiResult.feedback,
              detectedFeatures: aiResult.detectedFeatures,
              validatedByAI: true,
            }
          : undefined,
        username,
        syncCode,
      });

      if (res.success && res.expression) {
        audio.playSuccess();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        showToast('success', `Expressão "${res.expression.name}" aprendida e salva! Já disponível no LibrasDex e nas atividades.`);
        if (onAwardXp) onAwardXp(50, 25);
        if (onExpressionSaved) onExpressionSaved(res.expression);
        resetForm();
        loadExpressions();
        setActiveTab('my_list');
      } else {
        showToast('error', res.message || 'Erro ao salvar expressão.');
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setCategory('interrogativas');
    setPreviewImage(null);
    setAiResult(null);
    setEyebrows('raised');
    setHeadMovement('neutral');
    setMouth('neutral');
  };

  // Start Editing
  const handleStartEdit = (exp: TaughtFacialExpression) => {
    audio.playClick();
    setEditingId(exp.id);
    setName(exp.name);
    setDescription(exp.description);
    setCategory(exp.category);
    setPreviewImage(exp.imageUrl);
    setEyebrows(exp.parameters.eyebrows);
    setHeadMovement(exp.parameters.headMovement);
    setMouth(exp.parameters.mouth);
    if (exp.aiAnalysis) {
      setAiResult({
        eyebrows: exp.parameters.eyebrows,
        headMovement: exp.parameters.headMovement,
        mouth: exp.parameters.mouth,
        confidence: exp.aiAnalysis.confidence,
        isValidInLibras: true,
        detectedFeatures: exp.aiAnalysis.detectedFeatures || [],
        feedback: exp.aiAnalysis.feedback || '',
      });
    } else {
      setAiResult(null);
    }
    setActiveTab('teach');
  };

  // Delete Expression
  const handleConfirmDelete = async () => {
    if (!expressionToDelete) return;
    const username = userStats.username || 'Aluno';
    const syncCode = userStats.syncCode || 'LIB-9999';

    const res = await learnedExpressionsService.deleteExpression(expressionToDelete.id, username, syncCode);
    if (res.success) {
      audio.playClick();
      showToast('success', res.message);
      setExpressionToDelete(null);
      loadExpressions();
    } else {
      showToast('error', res.message);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-4 pb-24 text-white">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-bounce ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
          <span className="text-xs sm:text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900/80 via-indigo-950/90 to-purple-950/90 border border-blue-500/30 rounded-3xl p-5 sm:p-6 mb-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                <Bot className="w-3 h-3 text-cyan-300" /> IA Treinável • Expressões Faciais
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Sincronização em Nuvem
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <span>Ensinar Expressões à IA</span>
              <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Capture ou envie fotos de suas expressões faciais em Libras. A IA analisa os parâmetros não-manuais (sobrancelhas, cabeça, boca) e adiciona sua expressão diretamente ao LibrasDex e aos desafios práticos!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-300">
              Minhas Expressões: <strong className="text-cyan-400">{userExpressions.length}</strong>
            </span>
          </div>
        </div>

        {/* Subtabs Switcher */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 mt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('teach');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'teach'
                ? 'bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Camera className="w-4 h-4 text-cyan-300" />
            <span>{editingId ? 'Editar Expressão' : 'Ensinar Nova Expressão'}</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('my_list');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_list'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Smile className="w-4 h-4 text-pink-300" />
            <span>Minhas Expressões ({userExpressions.length})</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('community');
            }}
            className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'community'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Comunidade ({communityExpressions.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: TEACH / CAPTURE VIEW */}
      {activeTab === 'teach' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Camera Viewport / Photo Preview */}
          <div className="lg:col-span-6 flex flex-col gap-3">
            <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-3xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl flex items-center justify-center">
              {/* Live Video Feed */}
              {!previewImage ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraFacing === 'user' ? 'scale-x-[-1]' : ''}`}
                  />
                  {/* Visual Guide Oval */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 sm:w-56 h-64 sm:h-72 rounded-[50%] border-2 border-dashed border-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.2)] flex items-center justify-center">
                      <span className="text-[11px] font-black tracking-wider text-cyan-300 bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm -translate-y-24">
                        Enquadre seu Rosto Aqui
                      </span>
                    </div>
                  </div>

                  {/* Countdown overlay */}
                  {countdown !== null && (
                    <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-7xl font-black text-amber-300 animate-ping">{countdown}</span>
                    </div>
                  )}

                  {/* Camera Top Controls */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-20">
                    <button
                      onClick={() => {
                        audio.playClick();
                        setCameraFacing((p) => (p === 'user' ? 'environment' : 'user'));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                      title="Girar câmera"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Girar Câmera</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-bold border border-indigo-400 flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Enviar Foto</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </>
              ) : (
                /* Captured / Uploaded Image Preview */
                <div className="relative w-full h-full">
                  <img
                    src={previewImage}
                    alt="Foto capturada da expressão"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 z-20">
                    <button
                      onClick={handleRetake}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-800 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 backdrop-blur-md cursor-pointer shadow-lg"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Tirar Outra Foto</span>
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 z-20">
                    <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Foto Capturada com Sucesso
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Camera Actions Bar */}
            {!previewImage ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSnapPhoto}
                  disabled={!cameraActive}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-cyan-300" />
                  <span>Capturar Expressão (Foto)</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  title="Carregar foto do dispositivo"
                >
                  <Upload className="w-4 h-4 text-purple-300" />
                  <span>Arquivo</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleManualAIValidate}
                  disabled={isValidatingAI}
                  className="flex-1 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isValidatingAI ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Validando com IA...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 text-cyan-300" />
                      <span>Revalidar com IA</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleRetake}
                  className="py-2.5 px-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refazer</span>
                </button>
              </div>
            )}

            {/* AI Verdict & Linguistic Advice Box */}
            {aiResult && (
              <div className="bg-gradient-to-br from-indigo-950/90 to-purple-950/90 border border-indigo-500/40 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-black uppercase text-indigo-300">
                      Análise Inteligente de Libras
                    </span>
                  </div>
                  <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {aiResult.confidence}% Confiança
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium mb-3">
                  {aiResult.feedback}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.detectedFeatures.map((feat, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 border border-indigo-500/30 text-cyan-300"
                    >
                      ✓ {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Name, Description & Parameters Form */}
          <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Nome da Expressão Facial <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Interrogativa Qu- (Quem? Onde?), Negação Enfática..."
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  maxLength={80}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Descrição e Regra Gramatical em Libras <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explique quando essa expressão é usada (ex: Utilizada ao final de perguntas, franzindo as sobrancelhas e inclinando o tronco levemente para a frente)..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Categoria Gramatical
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FacialExpressionCategory)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-700 text-xs sm:text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="interrogativas">❓ Interrogativas (Perguntas Qu- e Sim/Não)</option>
                  <option value="afirmacao_negacao">↔️ Afirmação & Negação (Aceno / Balanço)</option>
                  <option value="intensidade_emocao">💥 Intensidade & Emoção (Foco, Atenção, Surpresa)</option>
                  <option value="gramatical">📐 Gramatical Geral (Tópico-Comentário)</option>
                  <option value="cotidiano">☕ Cotidiano & Conversação</option>
                  <option value="sentimentos">❤️ Sentimentos & Afeto</option>
                </select>
              </div>

              {/* Parâmetros Não Manuais (Configuração Fina) */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400 block mb-2.5">
                  Parâmetros de Validação da IA:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {/* Eyebrows */}
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <label className="block font-bold text-slate-300 text-[11px] mb-1">
                      Sobrancelhas:
                    </label>
                    <select
                      value={eyebrows}
                      onChange={(e) => setEyebrows(e.target.value as EyebrowsState)}
                      className="w-full py-1 px-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="raised">Levantadas ⬆️</option>
                      <option value="furrowed">Franzidas ⬇️</option>
                      <option value="neutral">Neutras ➖</option>
                    </select>
                  </div>

                  {/* Head Movement */}
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <label className="block font-bold text-slate-300 text-[11px] mb-1">
                      Cabeça:
                    </label>
                    <select
                      value={headMovement}
                      onChange={(e) => setHeadMovement(e.target.value as HeadMovementType)}
                      className="w-full py-1 px-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="neutral">Alinhada / Neutra</option>
                      <option value="nod_yes">Aceno Sim (Afirmação)</option>
                      <option value="shake_no">Balanço Não (Negação)</option>
                      <option value="tilt_left">Inclinada Esquerda</option>
                      <option value="tilt_right">Inclinada Direita</option>
                    </select>
                  </div>

                  {/* Mouth */}
                  <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
                    <label className="block font-bold text-slate-300 text-[11px] mb-1">
                      Boca / Lábios:
                    </label>
                    <select
                      value={mouth}
                      onChange={(e) => setMouth(e.target.value as MouthState)}
                      className="w-full py-1 px-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                    >
                      <option value="neutral">Neutra</option>
                      <option value="smile">Sorriso 😊</option>
                      <option value="open">Aberta 😮</option>
                      <option value="wide">Enérgica ⚡</option>
                      <option value="tense">Comprimida 😐</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 mt-5 flex items-center gap-2">
              <button
                onClick={handleSaveExpression}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Check className="w-5 h-5" />
                <span>{editingId ? 'Atualizar Expressão Salva' : 'Salvar e Ensinar à IA'}</span>
              </button>

              {editingId && (
                <button
                  onClick={() => {
                    audio.playClick();
                    resetForm();
                  }}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY EXPRESSIONS LIST */}
      {activeTab === 'my_list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Suas Expressões Ensinadas</h2>
              <p className="text-xs text-slate-400">
                Expressões criadas por você que estão salvas na sua conta e disponíveis no LibrasDex e nas atividades interativas.
              </p>
            </div>
            <button
              onClick={() => {
                audio.playClick();
                resetForm();
                setActiveTab('teach');
              }}
              className="px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Ensinar Nova</span>
            </button>
          </div>

          {userExpressions.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <Smile className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">Você ainda não ensinou nenhuma expressão</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Use a aba "Ensinar Nova Expressão" para tirar uma foto pela câmera ou enviar uma foto do seu dispositivo.
              </p>
              <button
                onClick={() => {
                  audio.playClick();
                  setActiveTab('teach');
                }}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-lg cursor-pointer"
              >
                Começar Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userExpressions.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 shadow-xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-800">
                      <img
                        src={exp.imageUrl}
                        alt={exp.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 text-cyan-300 backdrop-blur-sm border border-cyan-500/30">
                        {exp.category}
                      </span>
                      {exp.aiAnalysis?.validatedByAI && (
                        <span className="absolute bottom-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-sm">
                          ✓ IA Validada ({exp.aiAnalysis.confidence}%)
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-white">{exp.name}</h3>
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {exp.description}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                        Sobrancelha: <strong>{exp.parameters.eyebrows}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                        Cabeça: <strong>{exp.parameters.headMovement}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                        Boca: <strong>{exp.parameters.mouth}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(exp)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white transition-all cursor-pointer"
                        title="Editar Expressão"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpressionToDelete(exp)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="Excluir Expressão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {onPracticeInStudio && (
                      <button
                        onClick={() => {
                          audio.playClick();
                          onPracticeInStudio(exp.id);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Praticar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMUNITY EXPRESSIONS */}
      {activeTab === 'community' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white">Expressões Faciais da Comunidade</h2>
              <p className="text-xs text-slate-400">
                Veja as expressões não-manuais ensinadas por outros alunos e pratique diretamente na câmera.
              </p>
            </div>
            <button
              onClick={loadExpressions}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>

          {communityExpressions.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
              <Layers className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-300">Nenhuma expressão comunitária disponível ainda</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Seja o primeiro a ensinar uma expressão facial para todos os alunos de Libras!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {communityExpressions.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-video bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-800">
                      <img
                        src={exp.imageUrl}
                        alt={exp.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-2 left-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black/60 text-amber-300 border border-amber-500/30">
                        {exp.category}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-black text-white">{exp.name}</h3>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Por {exp.username || 'Aluno'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                      {exp.description}
                    </p>
                  </div>

                  {onPracticeInStudio && (
                    <button
                      onClick={() => {
                        audio.playClick();
                        onPracticeInStudio(exp.id);
                      }}
                      className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-indigo-600 text-indigo-300 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Praticar esta Expressão em RA</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {expressionToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-lg font-black text-white">Excluir Expressão?</h3>
            <p className="text-xs text-slate-300 mt-2 mb-6">
              Tem certeza que deseja excluir a expressão "{expressionToDelete.name}"? Esta ação removerá o aprendizado da sua conta e do LibrasDex.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExpressionToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer shadow-lg shadow-rose-600/30"
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
