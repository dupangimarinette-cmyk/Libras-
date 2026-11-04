import React, { useState } from 'react';
import {
  User,
  Edit3,
  Award,
  Flame,
  Sparkles,
  Heart,
  Trophy,
  CheckCircle2,
  Camera,
  LogOut,
  Target,
  Clock,
  Shield,
  X,
  Check,
  Cloud,
  RefreshCw,
  Copy,
  Smartphone,
  Download,
  Share2,
  Palette,
  Shirt,
  Bot,
  Crown,
  Lock,
  Image as ImageIcon,
} from 'lucide-react';
import { UserStats, Achievement, LibrasSign } from '../../types/libras';
import { LIBRAS_SIGNS, SIGNS_BY_ID } from '../../data/signsData';
import { COMPANION_MASCOTS, MASCOT_ITEMS, NAME_COLORS } from '../../data/shopCatalogData';
import { AVATAR_OPTIONS } from '../Auth/LoginView';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';
import { LibrinhaMascot } from '../Mascot/LibrinhaMascot';
import { PWAInstallBanner } from '../common/PWAInstallBanner';
import { audio } from '../../services/audioService';
import { storageService } from '../../services/storageService';
import { shopService } from '../../services/shopService';
import { APP_THEMES, COLOR_PALETTE, getThemeConfig, getProfileColorConfig } from '../../data/themesData';
import { PROFILE_FRAMES, isProfileFrameUnlocked, getEquippedFrame, ProfileFrame } from '../../data/profileFramesData';
import { ProfileAvatar } from '../common/ProfileAvatar';

interface ProfileViewProps {
  stats: UserStats;
  signs?: LibrasSign[];
  achievements: Achievement[];
  onUpdateProfile: (username: string, avatarUrl: string, bio?: string) => void;
  onOpenLogin: () => void;
  onOpenARStudio: (signId?: string) => void;
  onEquipTitle?: (title: string) => void;
  onRestoreCloudSync?: (codeOrUsername: string) => Promise<boolean>;
  onEquipCompanion?: (companionId: string) => void;
  onEquipMascotItem?: (category: 'outfit' | 'hat' | 'glasses' | 'skin', itemId: string) => void;
  onSelectTheme?: (theme: UserStats['activeTheme']) => void;
  onSelectProfileColor?: (color: string) => void;
  onEquipNameColor?: (nameColorId: string) => void;
  onEquipFrame?: (frameId: string | undefined) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  stats,
  signs,
  achievements,
  onUpdateProfile,
  onOpenLogin,
  onOpenARStudio,
  onEquipTitle,
  onRestoreCloudSync,
  onEquipCompanion,
  onEquipMascotItem,
  onSelectTheme,
  onSelectProfileColor,
  onEquipNameColor,
  onEquipFrame,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState<'mascots' | 'accessories' | 'titles' | 'colors' | 'frames'>('mascots');
  const [themeToast, setThemeToast] = useState<string | null>(null);
  const [colorTarget, setColorTarget] = useState<'profile' | 'background' | 'both'>('profile');
  const [customColorHex, setCustomColorHex] = useState(stats.profileColor || '#10b981');
  const [editName, setEditName] = useState(stats.username);
  const [editAvatar, setEditAvatar] = useState(stats.avatarUrl);
  const [editBio, setEditBio] = useState(stats.bio || 'Aprendiz dedicado de LIBRAS com Realidade Aumentada! 🤟');

  // Cloud sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  const masteredSignIds = Object.keys(stats.signMastery);
  const totalMasteredCount = masteredSignIds.length;

  // Average accuracy across practiced signs
  const accuracies = Object.values(stats.signMastery);
  const avgAccuracy =
    accuracies.length > 0
      ? Math.round(accuracies.reduce((acc, curr) => acc + curr, 0) / accuracies.length)
      : 88;

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    audio.playSuccess();
    onUpdateProfile(editName.trim(), editAvatar, editBio.trim());
    setIsEditing(false);
  };

  const handleCopySyncCode = () => {
    audio.playClick();
    const code = stats.syncCode || 'LIB-7294';
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTriggerCloudSync = async () => {
    audio.playClick();
    setIsSyncing(true);
    setSyncFeedback(null);

    const res = await storageService.syncWithCloud(stats);
    setIsSyncing(false);
    if (res.success) {
      audio.playSuccess();
      setSyncFeedback('Progresso sincronizado com a nuvem com sucesso!');
    } else {
      setSyncFeedback('Dados salvos localmente. Sincronizará assim que houver conexão!');
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreInput.trim()) return;

    setRestoreLoading(true);
    setRestoreError(null);

    if (onRestoreCloudSync) {
      const ok = await onRestoreCloudSync(restoreInput.trim());
      setRestoreLoading(false);
      if (ok) {
        audio.playVictory();
        setShowRestoreModal(false);
        setRestoreInput('');
      } else {
        audio.playError();
        setRestoreError('Código ou nome não encontrado. Verifique se digitou corretamente.');
      }
    } else {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-28 text-white space-y-6">
      
      {/* PWA Install Notice Banner */}
      <PWAInstallBanner />

      {/* Profile Card Header */}
      {(() => {
        const profileTheme = getProfileColorConfig(stats.profileColor || stats.activeTheme);
        const bgTheme = getThemeConfig(stats.activeTheme);
        return (
          <div
            className="relative p-6 sm:p-7 rounded-3xl bg-slate-900 border shadow-2xl overflow-hidden transition-all duration-300"
            style={{ borderColor: `${profileTheme.colorHex}50` }}
          >
            {/* Dynamic Card Aura */}
            <div
              className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl pointer-events-none transition-all duration-500 opacity-25"
              style={{ backgroundColor: profileTheme.colorHex }}
            />
            <div
              className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full blur-2xl pointer-events-none opacity-20"
              style={{ backgroundColor: profileTheme.colorHex }}
            />

            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar with Equipped Frame & Level Badge */}
              <div
                className="relative group cursor-pointer"
                onClick={() => {
                  audio.playClick();
                  setInventoryCategory('frames');
                  const el = document.getElementById('molduras-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Toque para ver e equipar molduras de perfil"
              >
                <ProfileAvatar
                  avatarUrl={stats.avatarUrl}
                  username={stats.username}
                  frameId={stats.equippedFrame}
                  size="xl"
                  fallbackBorderColor={profileTheme.colorHex}
                  showBadge={true}
                />
                <div
                  className="absolute -bottom-2 inset-x-0 mx-auto w-fit px-2.5 py-0.5 rounded-full text-slate-950 font-black text-xs shadow-md transition-all duration-300 z-30"
                  style={{ backgroundColor: profileTheme.colorHex }}
                >
                  Nível {stats.level}
                </div>
              </div>

              {/* Name & Bio Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between mb-1">
                  <div>
                    <h1 className={`text-2xl sm:text-3xl leading-tight ${shopService.getNameColorStyle(stats.nameColor)} transition-all duration-300`}>
                      {stats.username}
                    </h1>
                    
                    {/* Active Title, Profile Color, Frame, Theme & Role Badges */}
                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>{stats.activeTitle || 'Aprendiz Curioso'}</span>
                      </span>

                      {/* Equipped Profile Frame Badge (or direct button to equip) */}
                      {stats.equippedFrame && getEquippedFrame(stats.equippedFrame) ? (
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            setInventoryCategory('frames');
                            const el = document.getElementById('molduras-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 shadow-sm cursor-pointer hover:opacity-90 ${getEquippedFrame(stats.equippedFrame)?.tagColor}`}
                          title="Clique para gerenciar molduras de perfil"
                        >
                          <span>{getEquippedFrame(stats.equippedFrame)?.badgeEmoji}</span>
                          <span>Moldura: {getEquippedFrame(stats.equippedFrame)?.name}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            audio.playClick();
                            setInventoryCategory('frames');
                            const el = document.getElementById('molduras-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-500/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5 shadow-sm cursor-pointer transition-all animate-pulse"
                          title="Clique para escolher uma moldura de perfil conquistada"
                        >
                          <span>🖼️ Escolher Moldura</span>
                        </button>
                      )}

                      {/* Active Profile Color Badge */}
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 transition-all shadow-sm"
                        style={{
                          backgroundColor: `${profileTheme.colorHex}20`,
                          borderColor: `${profileTheme.colorHex}50`,
                          color: '#ffffff',
                        }}
                      >
                        <span className="w-2 h-2 rounded-full inline-block shadow-sm" style={{ backgroundColor: profileTheme.colorHex }} />
                        <span>Perfil: {profileTheme.name}</span>
                      </span>

                      {/* Active Background Theme Badge */}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all ${bgTheme.activePillBg}`}>
                        <span>🎨 Fundo: {bgTheme.name}</span>
                      </span>

                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span>{stats.role === 'admin' ? 'Administrador' : 'Aprendiz'}</span>
                      </span>
                    </div>
                  </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-2 mt-2 sm:mt-0">
                <button
                  onClick={() => {
                    audio.playClick();
                    setIsEditing(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    audio.playClick();
                    onOpenLogin();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  title="Trocar de conta ou nome de usuário"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Trocar Conta</span>
                </button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 italic">
              "{stats.bio || 'Praticando sinais em tempo real com Realidade Aumentada!'}"
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-6 pt-5 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-bold mb-0.5">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>Ofensiva</span>
            </div>
            <span className="text-lg font-black text-white">{stats.streak} Dias</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Experiência</span>
            </div>
            <span className="text-lg font-black text-white">{stats.xp} XP</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-cyan-400 text-xs font-bold mb-0.5">
              <Target className="w-3.5 h-3.5" />
              <span>Precisão AR</span>
            </div>
            <span className="text-lg font-black text-white">{avgAccuracy}%</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-center">
            <div className="flex items-center justify-center gap-1 text-indigo-400 text-xs font-bold mb-0.5">
              <Award className="w-3.5 h-3.5" />
              <span>Sinais Vistos</span>
            </div>
            <span className="text-lg font-black text-white">{totalMasteredCount} de {(signs || LIBRAS_SIGNS).length}</span>
          </div>
        </div>
      </div>
    );
  })()}

      {/* CLOUD PROGRESS SYNC CARD (ITEM 1) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Sincronização entre Aparelhos</h3>
              <p className="text-xs text-slate-300">
                Continue de onde parou em qualquer celular, tablet ou computador gratuitamente.
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerCloudSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>

        {/* Sync Code Box */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Seu Código de Sincronização Pessoal:
            </span>
            <span className="font-mono text-lg font-black tracking-widest text-cyan-400">
              {stats.syncCode || 'LIB-7294'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySyncCode}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedCode ? 'Copiado!' : 'Copiar Código'}</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setShowRestoreModal(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Importar de Outro Aparelho</span>
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold text-center animate-fadeIn flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{syncFeedback}</span>
          </div>
        )}
      </div>

      {/* ACTIVE COMPANION MASCOT HERO CARD */}
      {(() => {
        const currentCompanionId = stats.activeMascotId || 'librinha';
        const companionInfo =
          COMPANION_MASCOTS.find((m) => m.id === currentCompanionId) || COMPANION_MASCOTS[0];

        return (
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-black tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Mascote Ativo em LibrasGo
                </span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {companionInfo.rarity}
                </span>
              </div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>{companionInfo.name}</span>
                <span className="text-xl">{companionInfo.icon}</span>
              </h3>
              <p className="text-xs text-emerald-400 font-bold mt-0.5">{companionInfo.title}</p>
              <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
                {companionInfo.description}
              </p>
              <span className="text-[11px] text-slate-400 italic block mt-1">
                "{companionInfo.personality}"
              </span>
            </div>

            <div className="flex-shrink-0 relative z-10 flex flex-col items-center">
              <LibrinhaMascot
                mascotId={currentCompanionId}
                size={105}
                equipped={stats.equippedMascot}
                mood="happy"
              />
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          PERSONALIZAÇÃO DE CORES (PERFIL E FUNDO DO APP)
         ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-black text-white">Personalização de Cores</h3>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Escolha uma cor para aplicar imediatamente ao seu <strong className="text-white">Perfil</strong> ou ao <strong className="text-white">Fundo do App</strong>. Salvo automaticamente!
            </p>
          </div>
          {themeToast && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl animate-fadeIn flex items-center gap-1.5 shadow-sm">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{themeToast}</span>
            </span>
          )}
        </div>

        {/* 1. SELETOR DE ELEMENTO ALVO (PERFIL OU FUNDO) */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Onde você quer aplicar a cor selecionada?
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                audio.playClick();
                setColorTarget('profile');
              }}
              className={`py-2 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                colorTarget === 'profile'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/30 scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>👤 Perfil</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audio.playClick();
                setColorTarget('background');
              }}
              className={`py-2 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                colorTarget === 'background'
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30 scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>🖼️ Fundo do App</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audio.playClick();
                setColorTarget('both');
              }}
              className={`py-2 px-3 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                colorTarget === 'both'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 scale-[1.02]'
                  : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>✨ Ambos</span>
            </button>
          </div>
        </div>

        {/* 2. PRÉVIA EM TEMPO REAL DO ELEMENTO ESCOLHIDO */}
        {(() => {
          const profilePreview = getProfileColorConfig(stats.profileColor || stats.activeTheme);
          const bgPreview = getThemeConfig(stats.activeTheme);

          return (
            <div className={`p-4 rounded-2xl ${bgPreview.bgGradient} border border-white/20 shadow-2xl transition-all duration-300 relative overflow-hidden`}>
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30"
                style={{ backgroundColor: colorTarget === 'background' ? bgPreview.colorHex : profilePreview.colorHex }}
              />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-14 h-14 rounded-2xl overflow-hidden shadow-xl shrink-0 relative border-4 transition-all"
                    style={{
                      borderColor: profilePreview.colorHex,
                      boxShadow: `0 0 16px ${profilePreview.colorHex}50`,
                    }}
                  >
                    <img src={stats.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    <span
                      className="absolute -bottom-1 inset-x-0 mx-auto text-[9px] font-black text-slate-950 text-center px-1 py-0.2 rounded-full"
                      style={{ backgroundColor: profilePreview.colorHex }}
                    >
                      Nv.{stats.level}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                      Prévia Imediata: {colorTarget === 'profile' ? '👤 Elementos do Perfil' : colorTarget === 'background' ? '🖼️ Fundo de Tela do App' : '✨ Perfil + Fundo Sincronizados'}
                    </span>
                    <span className={`text-base font-black ${shopService.getNameColorStyle(stats.nameColor)}`}>
                      {stats.username}
                    </span>
                    <p className="text-[11px] text-slate-300 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style={{ backgroundColor: profilePreview.colorHex }} />
                        Perfil: <strong className="text-white">{profilePreview.name}</strong>
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style={{ backgroundColor: bgPreview.colorHex }} />
                        Fundo: <strong className="text-white">{bgPreview.name}</strong>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center">
                  <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-300 shadow-sm flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    Ativo em Celular & PC
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. PALETA DE CORES INSTANTÂNEA */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-300">
              Cores Rápidas (Toque para aplicar no elemento escolhido):
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
            {COLOR_PALETTE.map((colorItem) => {
              const profileActive = getProfileColorConfig(stats.profileColor || stats.activeTheme).colorHex.toLowerCase() === colorItem.hex.toLowerCase() ||
                (stats.profileColor || stats.activeTheme) === colorItem.id;
              const bgActive = getThemeConfig(stats.activeTheme).id === colorItem.id;
              const isSelected = colorTarget === 'profile' ? profileActive : colorTarget === 'background' ? bgActive : (profileActive && bgActive);

              return (
                <button
                  key={colorItem.id}
                  onClick={() => {
                    audio.playClick();
                    if (colorTarget === 'profile' || colorTarget === 'both') {
                      if (onSelectProfileColor) onSelectProfileColor(colorItem.hex);
                    }
                    if (colorTarget === 'background' || colorTarget === 'both') {
                      if (onSelectTheme) onSelectTheme(colorItem.id);
                    }
                    const targetLabel = colorTarget === 'profile' ? 'ao Perfil' : colorTarget === 'background' ? 'ao Fundo do App' : 'ao Perfil e ao Fundo';
                    setThemeToast(`Cor ${colorItem.name} aplicada ${targetLabel}! Salva na conta.`);
                    setTimeout(() => setThemeToast(null), 3500);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative overflow-hidden group ${
                    isSelected
                      ? 'border-white ring-2 bg-slate-800 shadow-xl scale-[1.02]'
                      : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                  style={isSelected ? { borderColor: colorItem.hex, boxShadow: `0 0 16px ${colorItem.hex}35` } : undefined}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-7 h-7 rounded-xl border border-white/30 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `${colorItem.hex}25`, borderColor: colorItem.hex }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full shadow"
                        style={{ backgroundColor: colorItem.hex }}
                      />
                    </div>

                    {isSelected && (
                      <span
                        className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border"
                        style={{ color: colorItem.hex, borderColor: `${colorItem.hex}50`, backgroundColor: `${colorItem.hex}15` }}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" /> Ativo
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-black text-white block truncate">{colorItem.name}</span>
                    <span className="text-[10px] text-slate-400 block truncate">{colorItem.description}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. SELETOR LIVRE DE COR HEXADECIMAL */}
        <div className="pt-3 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={customColorHex}
                  onChange={(e) => {
                    const newHex = e.target.value;
                    setCustomColorHex(newHex);
                    if (colorTarget === 'profile' || colorTarget === 'both') {
                      if (onSelectProfileColor) onSelectProfileColor(newHex);
                    }
                    if (colorTarget === 'background' || colorTarget === 'both') {
                      if (onSelectTheme) onSelectTheme(newHex);
                    }
                    setThemeToast(`Cor ${newHex} aplicada em tempo real!`);
                    setTimeout(() => setThemeToast(null), 3000);
                  }}
                  className="w-10 h-10 rounded-xl cursor-pointer border-2 border-white/20 bg-transparent"
                  title="Clique para escolher qualquer cor livremente"
                />
              </div>
              <div>
                <span className="text-xs font-black text-white block">Seletor Livre de Cor</span>
                <span className="text-[11px] text-slate-400 block">
                  Escolha qualquer cor personalizada ou digite o código Hex
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                placeholder="#10b981"
                maxLength={7}
                className="w-24 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-center text-white focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => {
                  audio.playClick();
                  const targetHex = customColorHex.startsWith('#') ? customColorHex : `#${customColorHex}`;
                  if (colorTarget === 'profile' || colorTarget === 'both') {
                    if (onSelectProfileColor) onSelectProfileColor(targetHex);
                  }
                  if (colorTarget === 'background' || colorTarget === 'both') {
                    if (onSelectTheme) onSelectTheme(targetHex);
                  }
                  setThemeToast(`Cor ${targetHex} aplicada com sucesso!`);
                  setTimeout(() => setThemeToast(null), 3500);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MEU INVENTÁRIO COMPLETO (MASCOTES, ROUPAS, ACESSÓRIOS, TÍTULOS E CORES)
         ========================================================================= */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-black text-white">🎒 Meu Inventário de Mascotes & Itens</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Alterne seu mascote ativo, equipe roupas, chapéus, óculos e títulos conquistados na sua jornada.
            </p>
          </div>

          {/* Sub-tab switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                audio.playClick();
                setInventoryCategory('mascots');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                inventoryCategory === 'mascots'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🤖 Mascotes</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setInventoryCategory('frames');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                inventoryCategory === 'frames'
                  ? 'bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🖼️ Molduras ({PROFILE_FRAMES.filter((f) => isProfileFrameUnlocked(f, achievements, stats)).length}/{PROFILE_FRAMES.length})</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setInventoryCategory('accessories');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                inventoryCategory === 'accessories'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👗 Guarda-Roupa</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setInventoryCategory('titles');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                inventoryCategory === 'titles'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>👑 Títulos</span>
            </button>

            <button
              onClick={() => {
                audio.playClick();
                setInventoryCategory('colors');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                inventoryCategory === 'colors'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>✨ Cores do Nome</span>
            </button>
          </div>
        </div>

        {/* 1. COMPANION MASCOTS INVENTORY */}
        {inventoryCategory === 'mascots' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {COMPANION_MASCOTS.map((companion) => {
              const isUnlocked =
                companion.id === 'librinha' ||
                (stats.unlockedMascotIds || []).includes(companion.id);
              const isActive = (stats.activeMascotId || 'librinha') === companion.id;

              return (
                <div
                  key={companion.id}
                  className={`p-4 rounded-2xl bg-slate-950 border flex flex-col justify-between gap-3.5 transition-all ${
                    isActive
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border"
                        style={{
                          backgroundColor: `${companion.previewColor}20`,
                          borderColor: `${companion.previewColor}50`,
                        }}
                      >
                        {companion.icon}
                      </div>
                      <div>
                        <span className="text-sm font-black text-white block">
                          {companion.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          {companion.title}
                        </span>
                      </div>
                    </div>

                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                      {companion.rarity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-snug">
                    {companion.description}
                  </p>

                  <div>
                    {isActive ? (
                      <button
                        disabled
                        className="w-full py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4 stroke-[3]" /> Mascote Ativo
                      </button>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => {
                          audio.playSuccess();
                          if (onEquipCompanion) {
                            onEquipCompanion(companion.id);
                          }
                        }}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Equipar como Mascote Ativo</span>
                      </button>
                    ) : (
                      <div className="w-full py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                        <span>🔒 Desbloqueie na Loja ({companion.cost} 💎)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. ACCESSORIES / GUARDA-ROUPA INVENTORY */}
        {inventoryCategory === 'accessories' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-400 block">
              Seus itens desbloqueados para vestir na mascote:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {MASCOT_ITEMS.map((item) => {
                const isUnlocked =
                  item.id === 'skin_esmeralda' ||
                  (stats.unlockedMascotItems || []).includes(item.id);
                const isEquipped = stats.equippedMascot?.[item.category] === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-2xl bg-slate-950 border flex flex-col justify-between gap-3 transition-all ${
                      isEquipped
                        ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                        : isUnlocked
                        ? 'border-slate-800 hover:border-slate-700'
                        : 'border-slate-900 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl">{item.icon}</span>
                        <div>
                          <span className="text-xs font-black text-white block truncate max-w-[150px]">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">
                            {item.category === 'outfit'
                              ? 'Roupa'
                              : item.category === 'hat'
                              ? 'Chapéu/Acessório'
                              : item.category === 'glasses'
                              ? 'Óculos/Visor'
                              : 'Skin'}
                          </span>
                        </div>
                      </div>

                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
                        {item.rarity}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                      {item.description}
                    </p>

                    <div>
                      {isEquipped ? (
                        <button
                          onClick={() => {
                            audio.playClick();
                            if (onEquipMascotItem) {
                              onEquipMascotItem(item.category, 'none');
                            }
                          }}
                          className="w-full py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-black flex items-center justify-center gap-1 cursor-pointer hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                          title="Clique para desequipar"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" /> Equipado (Remover)
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => {
                            audio.playSuccess();
                            if (onEquipMascotItem) {
                              onEquipMascotItem(item.category, item.id);
                            }
                          }}
                          className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all cursor-pointer"
                        >
                          Equipar na Mascote
                        </button>
                      ) : (
                        <div className="w-full py-1.5 rounded-xl bg-slate-900 text-slate-500 text-[11px] font-bold text-center">
                          🔒 Disponível na Loja ({item.cost} 💎)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TITLES INVENTORY */}
        {inventoryCategory === 'titles' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-400 block">
              Títulos conquistados em baús ou na Loja Premium:
            </span>
            <div className="flex flex-wrap gap-2">
              {(stats.unlockedTitles || ['Aprendiz Curioso']).map((title) => {
                const isEquipped = stats.activeTitle === title;
                return (
                  <button
                    key={title}
                    onClick={() => {
                      audio.playClick();
                      if (onEquipTitle) onEquipTitle(title);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isEquipped
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                        : 'bg-slate-950 border border-slate-800 text-slate-300 hover:border-purple-500/50'
                    }`}
                  >
                    {isEquipped && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    <span>{title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. NAME COLORS INVENTORY */}
        {inventoryCategory === 'colors' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-400 block">
              Cores especiais para seu nome no ranking e no perfil:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {NAME_COLORS.map((nc) => {
                const isUnlocked = (stats.unlockedNameColors || []).includes(nc.id);
                const isEquipped = stats.nameColor === nc.id;

                return (
                  <div
                    key={nc.id}
                    className={`p-3.5 rounded-2xl bg-slate-950 border flex flex-col justify-between gap-3 ${
                      isEquipped
                        ? 'border-amber-400 ring-2 ring-amber-500/30'
                        : isUnlocked
                        ? 'border-slate-800'
                        : 'border-slate-900 opacity-60'
                    }`}
                  >
                    <div>
                      <span className={`text-sm block ${nc.styleClass}`}>
                        {nc.name}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{nc.description}</p>
                    </div>

                    <div>
                      {isEquipped ? (
                        <button
                          onClick={() => {
                            audio.playClick();
                            if (onEquipNameColor) onEquipNameColor('');
                          }}
                          className="w-full py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black cursor-pointer hover:bg-rose-500/20 hover:text-rose-300"
                        >
                          <Check className="w-3.5 h-3.5" /> Ativo (Remover)
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => {
                            audio.playClick();
                            if (onEquipNameColor) onEquipNameColor(nc.id);
                          }}
                          className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black cursor-pointer"
                        >
                          Ativar Cor do Nome
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 text-center block">
                          🔒 Disponível na Loja ({nc.cost} 💎)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. PROFILE FRAMES INVENTORY (DESBLOQUEADAS POR MEDALHAS) */}
        {inventoryCategory === 'frames' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-cyan-950/40 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg shadow-inner">
                  🖼️
                </div>
                <div>
                  <h4 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Molduras de Perfil Exclusivas</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/30">
                      Conquistas & Medalhas
                    </span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Desbloqueie molduras lendárias conquistando medalhas na sua jornada. Salvo automaticamente na sua conta!
                  </p>
                </div>
              </div>

              {stats.equippedFrame && (
                <button
                  onClick={() => {
                    audio.playClick();
                    if (onEquipFrame) onEquipFrame(undefined);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Remover Moldura</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {PROFILE_FRAMES.map((frame) => {
                const isUnlocked = isProfileFrameUnlocked(frame, achievements, stats);
                const isEquipped = stats.equippedFrame === frame.id;

                return (
                  <div
                    key={frame.id}
                    className={`p-4 rounded-3xl border transition-all flex flex-col justify-between gap-3 relative overflow-hidden ${
                      isEquipped
                        ? 'bg-slate-900 border-white ring-2 ring-purple-500/50 shadow-2xl scale-[1.01]'
                        : isUnlocked
                        ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        : 'bg-slate-950/70 border-slate-900/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Live Avatar Preview with this Frame */}
                      <div className="flex-shrink-0">
                        <ProfileAvatar
                          avatarUrl={stats.avatarUrl}
                          username={stats.username}
                          frameId={isUnlocked ? frame.id : undefined}
                          size="lg"
                          showBadge={true}
                        />
                      </div>

                      {/* Frame Metadata */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${frame.tagColor}`}>
                            {frame.badgeEmoji} {frame.rarityLabel}
                          </span>
                          {isEquipped && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Equipada
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-white truncate">{frame.name}</h4>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                          {frame.description}
                        </p>
                      </div>
                    </div>

                    {/* Medal Requirement Info */}
                    <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-850 text-xs flex items-center gap-2">
                      <Award className={`w-4 h-4 flex-shrink-0 ${isUnlocked ? 'text-emerald-400' : 'text-amber-400'}`} />
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {isUnlocked ? 'Requisito Conquistado' : 'Como Desbloquear'}
                        </span>
                        <span className={`text-[11px] font-semibold leading-tight ${isUnlocked ? 'text-emerald-300' : 'text-amber-200'}`}>
                          {frame.requiredMedalDescription}
                        </span>
                      </div>
                      {isUnlocked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="pt-1">
                      {isEquipped ? (
                        <button
                          onClick={() => {
                            audio.playClick();
                            if (onEquipFrame) onEquipFrame(undefined);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 border border-slate-700 text-slate-300 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remover Moldura</span>
                        </button>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => {
                            audio.playVictory();
                            if (onEquipFrame) onEquipFrame(frame.id);
                          }}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-purple-500/20 flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Equipar {frame.name}</span>
                        </button>
                      ) : (
                        <button
                          disabled
                          className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Bloqueada • Requer Medalha</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sinais Mais Praticados / Dominados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-black text-white">Sinais Dominados na Câmera AR</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {masteredSignIds.length} sinais catalogados
          </span>
        </div>

        {masteredSignIds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {masteredSignIds.map((signId) => {
              const sign = SIGNS_BY_ID[signId] || LIBRAS_SIGNS[0];
              const score = stats.signMastery[signId] || 90;

              return (
                <div
                  key={signId}
                  onClick={() => {
                    audio.playClick();
                    onOpenARStudio(signId);
                  }}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase text-slate-400">{sign.category}</span>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {score}%
                    </span>
                  </div>

                  <div className="p-1 flex items-center justify-center group-hover:scale-105 transition-transform my-1">
                    <LibrasSignIllustration signId={sign.id} size={70} highlightColor="#10b981" />
                  </div>

                  <span className="text-xs font-black text-white block text-center truncate">
                    {sign.name}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400">
            <p className="text-xs">Você ainda não praticou sinais na câmera AR. Acesse o Estúdio AR para começar!</p>
          </div>
        )}
      </div>

      {/* Conquistas Desbloqueadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">Conquistas do Aluno</h2>
          </div>
          <span className="text-xs font-bold text-amber-400">
            {achievements.filter((a) => a.unlocked).length} de {achievements.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                ach.unlocked
                  ? 'bg-slate-900 border-amber-500/30 text-white'
                  : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${
                  ach.unlocked
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-600'
                }`}
              >
                {ach.unlocked ? '🏆' : '🔒'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-black truncate">{ach.title}</h4>
                <p className="text-[11px] text-slate-400 truncate">{ach.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restore Cloud Sync Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black">Restaurar Progresso</h3>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Digite seu <strong>Código de Sincronização</strong> (ex: <code className="text-cyan-400">LIB-4921</code>) ou seu <strong>Nome de Usuário</strong> anterior para restaurar todos os seus níveis, lições, títulos e moedas!
            </p>

            <form onSubmit={handleRestoreSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Ex: LIB-7294 ou seu nome"
                  value={restoreInput}
                  onChange={(e) => setRestoreInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              {restoreError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl font-bold">
                  {restoreError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={restoreLoading || !restoreInput.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {restoreLoading ? 'Buscando...' : 'Restaurar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-black">Editar Perfil</h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nome de Usuário / Apelido:
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Bio / Frase de Apresentação:
                </label>
                <input
                  type="text"
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={80}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Escolha seu Avatar:
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setEditAvatar(av.url)}
                      className={`relative rounded-xl p-0.5 border-2 transition-all cursor-pointer ${
                        editAvatar === av.url ? 'border-emerald-400 scale-105' : 'border-transparent opacity-75'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-10 h-10 rounded-lg object-cover" />
                      {editAvatar === av.url && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center text-[10px]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
