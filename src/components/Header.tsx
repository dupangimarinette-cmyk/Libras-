import React, { useState, useEffect } from 'react';
import { Flame, Heart, Sparkles, Volume2, VolumeX, ShieldAlert, Zap, Camera, Info, Shield, Megaphone, Cloud, CloudOff, RefreshCw, CheckCircle2, Gift } from 'lucide-react';
import { UserStats, SystemAnnouncement, SyncStatus } from '../types/libras';
import { audio } from '../services/audioService';
import { adminService } from '../services/adminService';
import { shopService } from '../services/shopService';
import { getProfileColorConfig } from '../data/themesData';
import { PWAInstallBanner } from './common/PWAInstallBanner';
import { ProfileAvatar } from './common/ProfileAvatar';

interface HeaderProps {
  stats: UserStats;
  isAdmin?: boolean;
  syncStatus?: SyncStatus;
  onManualSync?: () => void;
  onOpenShop: () => void;
  onOpenRedeem?: () => void;
  onOpenARStudio: () => void;
  onOpenAbout: () => void;
  onOpenProfile: () => void;
  onOpenLogin: () => void;
  onOpenAdmin?: () => void;
  onToggleSound: () => void;
  onRefillHearts: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  isAdmin = false,
  syncStatus,
  onManualSync,
  onOpenShop,
  onOpenRedeem,
  onOpenARStudio,
  onOpenAbout,
  onOpenProfile,
  onOpenLogin,
  onOpenAdmin,
  onToggleSound,
  onRefillHearts,
}) => {
  const [showHeartsModal, setShowHeartsModal] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    adminService.fetchAnnouncements().then((anns) => {
      const active = anns.find((a) => a.active);
      if (active) setActiveAnnouncement(active);
    }).catch(() => {});
  }, []);

  return (
    <>
      {/* System Announcement Banner if created by Admin */}
      {activeAnnouncement && (
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white px-4 py-2 text-xs font-bold text-center border-b border-indigo-500/40 shadow-md flex items-center justify-center gap-2 relative">
          <Megaphone className="w-4 h-4 text-amber-300 animate-bounce flex-shrink-0" />
          <span className="truncate">
            <strong className="text-amber-200">{activeAnnouncement.title}</strong>: {activeAnnouncement.message}
          </span>
          <button
            onClick={() => setActiveAnnouncement(null)}
            className="ml-2 text-white/70 hover:text-white text-sm font-black p-0.5 rounded cursor-pointer"
            title="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-white/10 text-white px-4 py-2.5 transition-all">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Brand (Clickable to open About / Info) */}
          <button
            onClick={() => {
              audio.playClick();
              onOpenAbout();
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer hover:opacity-90 transition-opacity"
            title="Sobre o aplicativo e informações"
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20 text-white font-extrabold text-xl group-hover:scale-105 transition-transform">
              <span>🤟</span>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  LibrasGo
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
                  AR 3D
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Aprenda Libras em Realidade Aumentada</p>
            </div>
          </button>

          {/* Gamification Stats: Streak, Gems, Hearts, Level */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Streak Button */}
            <button
              onClick={() => {
                audio.playStreakIgnite();
                setShowStreakModal(true);
              }}
              className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-amber-500/30 text-amber-400 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Ofensiva diária"
            >
              <div className="relative">
                <Flame className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse group-hover:scale-110 transition-transform" />
              </div>
              <span className="font-extrabold text-sm text-amber-400 group-hover:text-amber-300">
                {stats.streak}
              </span>
              <span className="text-xs text-amber-200/80 hidden md:inline">dias</span>
            </button>

            {/* Gems / Diamantes (Loja Premium) */}
            <button
              onClick={() => {
                audio.playClick();
                onOpenShop();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/40 text-cyan-400 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm shadow-cyan-500/20"
              title="Loja Premium • Seus Diamantes Virtuais"
            >
              <Sparkles className="w-4 h-4 text-cyan-400 fill-cyan-400/40 animate-pulse" />
              <span className="font-extrabold text-sm text-cyan-300 font-mono">
                {stats.gems} 💎
              </span>
            </button>

            {/* Resgate de Códigos Button */}
            {onOpenRedeem && (
              <button
                onClick={() => {
                  audio.playClick();
                  onOpenRedeem();
                }}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-fuchsia-500/40 text-fuchsia-400 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm shadow-fuchsia-500/20"
                title="Resgate • Insira Códigos de Recompensa"
              >
                <Gift className="w-4 h-4 text-fuchsia-400 fill-fuchsia-400/30 animate-pulse" />
                <span className="font-extrabold text-xs text-fuchsia-300">
                  Resgate
                </span>
              </button>
            )}

            {/* Hearts (Vidas) */}
            <button
              onClick={() => {
                audio.playClick();
                setShowHeartsModal(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-rose-500/30 text-rose-400 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              title="Vidas restantes"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
              <span className="font-extrabold text-sm text-rose-300">
                {stats.hearts}
              </span>
            </button>

            {/* Level / XP */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                N{stats.level}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-semibold leading-tight">Total XP</span>
                <span className="text-xs font-black text-emerald-300 leading-tight">{stats.xp} XP</span>
              </div>
            </div>

            {/* Quick AR Camera Button */}
            <button
              onClick={() => {
                audio.playClick();
                onOpenARStudio();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Treino AR</span>
            </button>

            {/* PWA Compact Install Button */}
            <PWAInstallBanner compact={true} />

            {/* Info / About Button */}
            <button
              onClick={() => {
                audio.playClick();
                onOpenAbout();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 hover:text-white transition-all cursor-pointer"
              title="Sobre o aplicativo e informações"
              aria-label="Sobre o aplicativo"
            >
              <Info className="w-4 h-4" />
            </button>

            {/* Cross-Device Cloud Sync Status Button */}
            {onManualSync && (
              <button
                onClick={() => {
                  audio.playClick();
                  onManualSync();
                  setSyncFeedback('Sincronizado!');
                  setTimeout(() => setSyncFeedback(null), 3000);
                }}
                className={`relative p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                  syncStatus?.isSyncing
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                    : syncStatus?.syncError
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700/60 text-emerald-400 hover:text-emerald-300'
                }`}
                title={
                  syncStatus?.isSyncing
                    ? 'Sincronizando conteúdos com o banco compartilhado...'
                    : 'Banco Compartilhado Conectado • Sincronizado para celulares, tablets e computadores. Clique para sincronizar agora.'
                }
                aria-label="Sincronização em nuvem"
              >
                {syncStatus?.isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                ) : syncStatus?.syncError ? (
                  <CloudOff className="w-4 h-4 text-amber-400" />
                ) : (
                  <Cloud className="w-4 h-4 text-emerald-400" />
                )}
                {syncFeedback && (
                  <span className="hidden sm:inline text-[10px] font-black text-emerald-300 animate-fade-in">
                    {syncFeedback}
                  </span>
                )}
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={onToggleSound}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              title={stats.soundEnabled ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'}
              aria-label="Controle de áudio"
            >
              {stats.soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            {/* Admin Panel Quick Access Button */}
            {onOpenAdmin && (
              <button
                onClick={() => {
                  audio.playClick();
                  onOpenAdmin();
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer border ${
                  isAdmin
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white border-indigo-400/40 shadow-indigo-600/30'
                    : 'bg-slate-800/90 hover:bg-slate-700/90 border-indigo-500/30 text-indigo-300 hover:text-white'
                }`}
                title="Painel Administrativo: Gestão de Desafios, Amigos e Alunos"
              >
                <Shield className="w-3.5 h-3.5 text-cyan-300" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Profile Avatar & Name Button */}
            {(() => {
              const profileTheme = getProfileColorConfig(stats.profileColor || stats.activeTheme);
              return (
                <button
                  onClick={() => {
                    audio.playClick();
                    onOpenProfile();
                  }}
                  className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-all cursor-pointer group"
                  style={{ borderColor: `${profileTheme.colorHex}50` }}
                  title={`Perfil de ${stats.username}`}
                >
                  <ProfileAvatar
                    avatarUrl={stats.avatarUrl}
                    username={stats.username}
                    frameId={stats.equippedFrame}
                    size="sm"
                    fallbackBorderColor={profileTheme.colorHex}
                  />
                  <span className={`hidden sm:inline text-xs truncate max-w-[110px] ${shopService.getNameColorStyle(stats.nameColor)}`}>
                    {stats.username}
                  </span>
                </button>
              );
            })()}

          </div>
        </div>
      </header>

      {/* Hearts Detail Modal */}
      {showHeartsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center text-white relative">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-rose-500 fill-rose-500 animate-bounce" />
            </div>
            <h3 className="text-xl font-black mb-1">Corações de Prática</h3>
            <p className="text-slate-300 text-sm mb-4">
              Você tem <strong className="text-rose-400">{stats.hearts} de {stats.maxHearts}</strong> corações restantes. Cada erro em exercícios consome 1 coração.
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {[...Array(stats.maxHearts)].map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-7 h-7 ${idx < stats.hearts ? 'text-rose-500 fill-rose-500' : 'text-slate-700 fill-slate-800'}`}
                />
              ))}
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  onRefillHearts();
                  setShowHeartsModal(false);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-rose-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Restaurar Vidas Gratuitamente
              </button>
              <button
                onClick={() => {
                  setShowHeartsModal(false);
                  onOpenShop();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
              >
                Ver Poções na Loja (Gemas)
              </button>
              <button
                onClick={() => setShowHeartsModal(false)}
                className="text-xs text-slate-400 hover:text-white pt-2"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Streak Fire Modal */}
      {showStreakModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center text-white">
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Flame className="w-10 h-10 text-amber-500 fill-amber-500" />
            </div>
            <h3 className="text-2xl font-black text-amber-400 mb-1">
              {stats.streak} Dias em Chamas!
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              Você está praticando Libras todos os dias. Mantenha o ritmo para não perder o multiplicador de XP!
            </p>

            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 mb-5 text-left text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Escudo Protetor de Ofensiva:</span>
                <span className={`font-bold ${stats.hasStreakFreeze ? 'text-cyan-400' : 'text-slate-500'}`}>
                  {stats.hasStreakFreeze ? 'Ativo (1 uso)' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Bônus de Sequência:</span>
                <span className="font-bold text-amber-400">+15% XP em lições</span>
              </div>
            </div>

            <button
              onClick={() => setShowStreakModal(false)}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all cursor-pointer"
            >
              Continuar Aprendendo!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
