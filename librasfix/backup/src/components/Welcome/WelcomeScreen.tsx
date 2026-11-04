import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, BookOpen, Camera, ShieldCheck, Heart, Award, Volume2, VolumeX, Eye } from 'lucide-react';
import { LibrinhaMascot } from '../Mascot/LibrinhaMascot';
import { MascotEquipped } from '../Mascot/LibrinhaMascot';
import { audio } from '../../services/audioService';

interface WelcomeScreenProps {
  onEnterApp: () => void;
  equippedMascot?: MascotEquipped;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onEnterApp,
  equippedMascot = {
    outfit: 'none',
    hat: 'none',
    glasses: 'none',
    skin: 'skin_esmeralda',
  },
  soundEnabled = true,
  onToggleSound,
}) => {
  const [stage, setStage] = useState<'welcome' | 'loading'>('welcome');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);

  const loadingPhrases = [
    'Librinhas está preparando sua jornada...',
    'Carregando módulos e sinais práticos...',
    'Ajustando câmera de inteligência visual...',
    'Tudo pronto! Bem-vindo ao LibrasGo!',
  ];

  const handleStartEntering = () => {
    audio.playClick();
    setStage('loading');
    setLoadingProgress(15);
  };

  // Loading animation controller (approx 1.8 seconds total duration)
  useEffect(() => {
    if (stage !== 'loading') return;

    const timer1 = setTimeout(() => {
      setLoadingProgress(45);
      setLoadingPhraseIndex(1);
    }, 450);

    const timer2 = setTimeout(() => {
      setLoadingProgress(80);
      setLoadingPhraseIndex(2);
    }, 950);

    const timer3 = setTimeout(() => {
      setLoadingProgress(100);
      setLoadingPhraseIndex(3);
      audio.playSuccess();
    }, 1450);

    const timer4 = setTimeout(() => {
      onEnterApp();
    }, 1900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [stage, onEnterApp]);

  // Keyboard shortcut: pressing Enter on welcome screen triggers Entrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stage === 'welcome' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartEntering();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stage]);

  return (
    <div
      role="region"
      aria-label="Tela Inicial LibrasGo"
      className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 text-white flex flex-col justify-between selection:bg-purple-500 selection:text-white"
    >
      {/* Background Decorative Ambient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10" aria-hidden="true">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.6)_100%)]" />
      </div>

      {/* Top Bar / Accessibility Controls */}
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30 text-white font-black text-xl">
            🤟
          </div>
          <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
            Libras<span className="text-purple-400">Go</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onToggleSound && (
            <button
              type="button"
              onClick={() => {
                audio.playClick();
                onToggleSound();
              }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              title={soundEnabled ? 'Desativar áudio' : 'Ativar áudio'}
              aria-label={soundEnabled ? 'Desativar áudio' : 'Ativar áudio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-300" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          )}

          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            100% Gratuito & Acessível
          </span>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="w-full max-w-3xl mx-auto px-6 py-8 flex-1 flex flex-col items-center justify-center text-center">
        {stage === 'welcome' ? (
          <div className="space-y-8 animate-fadeIn w-full flex flex-col items-center">
            {/* Friendly Greeting Mascote Avatar */}
            <div className="relative group cursor-pointer" onClick={() => audio.playClick()}>
              <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-indigo-500/30 blur-xl group-hover:opacity-100 transition duration-700 animate-pulse" />
              <LibrinhaMascot
                mascotId="librinha"
                mood="happy"
                size={140}
                equipped={equippedMascot}
                className="transform hover:scale-105 transition-transform"
              />
            </div>

            {/* Typography & Brand Slogan */}
            <div className="space-y-3 max-w-xl">
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
                Libras<span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Go</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 font-medium leading-relaxed">
                Aprenda a <strong className="text-white">Língua Brasileira de Sinais</strong> de forma interativa, visual e acessível no seu próprio ritmo.
              </p>
            </div>

            {/* Value Highlights (Clean, unboxed cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl pt-2 text-left">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <Camera className="w-4 h-4" />
                  <span>Câmera Interativa</span>
                </div>
                <p className="text-xs text-slate-300">
                  Pratique sinais reais com detecção visual instantânea.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                  <span>Trilha Completa</span>
                </div>
                <p className="text-xs text-slate-300">
                  Dezenas de lições, do alfabeto a diálogos do cotidiano.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Award className="w-4 h-4" />
                  <span>Gamificação</span>
                </div>
                <p className="text-xs text-slate-300">
                  Ganhe XP, desbloqueie baús e avance nas ligas de alunos.
                </p>
              </div>
            </div>

            {/* Primary Action Button: "Entrar" */}
            <div className="pt-4 w-full max-w-sm flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleStartEntering}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-black text-lg shadow-2xl shadow-indigo-600/40 transform active:scale-98 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-3 border border-white/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-400"
                aria-label="Entrar no aplicativo LibrasGo"
              >
                <span>Entrar</span>
                <ArrowRight className="w-5 h-5 text-purple-200" />
              </button>

              <span className="text-[11px] text-slate-400">
                Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] border border-white/10">Enter ↵</kbd> para começar
              </span>
            </div>
          </div>
        ) : (
          /* Loading Animation Stage with Mascot Librinhas */
          <div className="space-y-6 animate-fadeIn w-full max-w-md flex flex-col items-center">
            {/* Animating Mascot Librinhas */}
            <div className="relative">
              <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-cyan-500/40 blur-2xl animate-spin duration-1000" />
              <LibrinhaMascot
                mascotId="librinha"
                mood="cheering"
                size={160}
                equipped={equippedMascot}
                className="animate-bounce"
              />
            </div>

            {/* Dynamic Loading Text */}
            <div className="space-y-2 text-center">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                <span>Carregando o LibrasGo</span>
              </h2>
              <p className="text-sm text-purple-200 font-medium h-6 transition-all">
                {loadingPhrases[loadingPhraseIndex]}
              </p>
            </div>

            {/* Progress Bar in Blue, White & Purple */}
            <div className="w-full space-y-2 pt-2">
              <div className="w-full h-3 rounded-full bg-slate-900 border border-purple-500/30 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 transition-all duration-300 ease-out shadow-lg shadow-purple-500/50"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-1">
                <span>Preparando ambiente...</span>
                <span className="font-bold text-white">{loadingProgress}%</span>
              </div>
            </div>

            {/* Skip button for immediate entry if desired */}
            <button
              type="button"
              onClick={() => onEnterApp()}
              className="text-xs text-slate-400 hover:text-white underline pt-3 cursor-pointer"
            >
              Pular introdução
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 border-t border-white/5 gap-2">
        <p>© 2026 LibrasGo • Educação Inclusiva e Acessível para Todos</p>
        <div className="flex items-center gap-4">
          <span>Português / Libras</span>
          <span>•</span>
          <span className="text-slate-300">Língua Brasileira de Sinais</span>
        </div>
      </footer>
    </div>
  );
};
