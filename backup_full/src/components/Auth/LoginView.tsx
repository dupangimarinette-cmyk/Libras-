import React, { useState } from 'react';
import { HumanCheck } from './HumanCheck';
import { getSignupPass, looksAutomatedName } from '../../services/humanCheck';
import { getUserKey } from '../../services/userAuth';
import {
  User,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Users,
  Lock,
  Eye,
  EyeOff,
  GraduationCap,
  Shield,
  KeyRound,
  Gift,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  Award
} from 'lucide-react';
import { QuickProfile, storageService } from '../../services/storageService';
import { adminService } from '../../services/adminService';
import { audio } from '../../services/audioService';
import { AdminSession, UserRole } from '../../types/libras';

interface LoginViewProps {
  currentUsername: string;
  currentAvatar: string;
  onLogin: (username: string, avatarUrl: string, role?: UserRole) => void;
  onAdminLoginSuccess?: (session: AdminSession, profile?: any) => void;
  onCancel?: () => void;
}

export const AVATAR_OPTIONS = [
  {
    id: 'avatar_1',
    label: 'Praticante 1',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_2',
    label: 'Praticante 2',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_3',
    label: 'Praticante 3',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_4',
    label: 'Praticante 4',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_5',
    label: 'Praticante 5',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar_6',
    label: 'Praticante 6',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  },
];

export const LoginView: React.FC<LoginViewProps> = ({
  currentUsername,
  currentAvatar,
  onLogin,
  onAdminLoginSuccess,
  onCancel,
}) => {
  // Mode selection: 'learner' | 'admin'
  const [profileType, setProfileType] = useState<UserRole>('learner');

  // Learner form state
  const [username, setUsername] = useState(
    currentUsername === 'Você (Aprendiz)' ? '' : currentUsername
  );
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar || AVATAR_OPTIONS[0].url);
  const [learnerError, setLearnerError] = useState('');
  const [pendingLearner, setPendingLearner] = useState<string | null>(null);
  const [savedProfiles] = useState<QuickProfile[]>(() => storageService.getSavedProfiles());

  // Admin form state (preserved administrator account)
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // Recovery Modal State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('dupangimarinette@gmail.com');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryNewPass, setRecoveryNewPass] = useState('');
  const [recoveryConfirmPass, setRecoveryConfirmPass] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryFeedback, setRecoveryFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // Promo code state
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoFeedback, setPromoFeedback] = useState<{ text: string; success: boolean } | null>(null);

  // ----------------------------------------------------------------------
  // SUBMIT LEARNER LOGIN
  // ----------------------------------------------------------------------
  const handleLearnerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();

    if (!trimmed) {
      setLearnerError('Por favor, digite seu nome ou apelido!');
      audio.playError();
      return;
    }

    if (trimmed.length < 2) {
      setLearnerError('O nome de usuário deve ter pelo menos 2 caracteres.');
      audio.playError();
      return;
    }

    const normalizedName = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (['marinette', 'carlos andrade real'].includes(normalizedName)) {
      setLearnerError('Esta conta está arquivada e não pode entrar no LibrasGo.');
      audio.playError();
      return;
    }
    if (/^(bot_|testbot|fake_|ai_|ia_)/.test(normalizedName) || ['robot', 'perfil de ia'].includes(normalizedName)) {
      setLearnerError('Perfis automáticos ou de IA não podem criar contas de aluno.');
      audio.playError();
      return;
    }
    if (normalizedName === 'admin') {
      audio.playClick();
      setProfileType('admin');
      setAdminUser('admin');
      setAdminError('Entre com a senha da conta administradora.');
      return;
    }

    if (looksAutomatedName(trimmed)) {
      setLearnerError('Escolha outro nome ou apelido. Nomes de robôs, links ou só números/símbolos não são aceitos.');
      audio.playError();
      return;
    }

    // Nome novo neste aparelho = conta nova: pede a confirmação de que é uma pessoa antes de criar.
    const knownHere =
      savedProfiles.some((p) => p.username.trim().toLowerCase() === trimmed.toLowerCase()) ||
      Boolean(getUserKey({ username: trimmed }));
    if (!knownHere && !getSignupPass()) {
      audio.playClick();
      setPendingLearner(trimmed);
      return;
    }

    finishLearnerLogin(trimmed);
  };

  const finishLearnerLogin = (name: string) => {
    audio.playSuccess();
    setPendingLearner(null);
    storageService.saveProfile(name, selectedAvatar, 'learner');
    onLogin(name, selectedAvatar, 'learner');
  };

  const handleQuickLogin = (profile: QuickProfile) => {
    audio.playClick();
    if (profile.role === 'admin' || profile.username.toLowerCase() === 'admin') {
      setProfileType('admin');
      setAdminUser(profile.username);
      setAdminError('Perfil de administradora selecionado. Digite sua senha de gestora para continuar.');
      return;
    }
    audio.playSuccess();
    storageService.saveProfile(profile.username, profile.avatarUrl, 'learner');
    onLogin(profile.username, profile.avatarUrl, 'learner');
  };

  // ----------------------------------------------------------------------
  // SUBMIT ADMIN LOGIN (usuário + senha, validados no servidor)
  // ----------------------------------------------------------------------
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = adminUser.trim();

    if (!cleanUser) {
      setAdminError('Por favor, digite o nome de usuário do administrador.');
      audio.playError();
      return;
    }

    if (cleanUser.length < 2) {
      setAdminError('O usuário deve ter pelo menos 2 caracteres.');
      audio.playError();
      return;
    }

    if (!adminPassword) {
      setAdminError('Digite a senha do administrador.');
      audio.playError();
      return;
    }

    setAdminLoading(true);
    setAdminError('');

    try {
      const res = await adminService.loginAdmin(cleanUser, adminPassword);
      setAdminLoading(false);

      if (res.success && res.session) {
        audio.playSuccess();
        storageService.saveProfile(cleanUser, res.profile?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'admin');
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(res.session, res.profile);
        } else {
          onLogin(res.session.username, res.profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'admin');
        }
      } else {
        audio.playError();
        setAdminError(res.message || 'Senha incorreta para este usuário de administrador.');
      }
    } catch {
      setAdminLoading(false);
      audio.playError();
      setAdminError('Erro ao autenticar. Verifique sua conexão e tente novamente.');
    }
  };

  // ----------------------------------------------------------------------
  // RECUPERAÇÃO SEGURA DE SENHA DA ADMINISTRADORA
  // ----------------------------------------------------------------------
  const handleRecoverPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(null);

    if (recoveryNewPass.length < 8) {
      setRecoveryFeedback({ text: 'A nova senha deve ter no mínimo 8 caracteres.', success: false });
      audio.playError();
      return;
    }

    if (recoveryNewPass !== recoveryConfirmPass) {
      setRecoveryFeedback({ text: 'As senhas digitadas não coincidem.', success: false });
      audio.playError();
      return;
    }

    setRecoveryLoading(true);
    const res = await adminService.recoverAdminPassword({
      authorizedEmail: recoveryEmail.trim(),
      syncCode: recoveryCode.trim(),
      newPassword: recoveryNewPass.trim(),
    });
    setRecoveryLoading(false);

    if (res.success) {
      audio.playVictory();
      setRecoveryFeedback({ text: res.message, success: true });
      setAdminPassword(recoveryNewPass.trim());
      setAdminUser('admin');
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoveryFeedback(null);
      }, 2000);
    } else {
      audio.playError();
      setRecoveryFeedback({ text: res.message, success: false });
    }
  };

  // ----------------------------------------------------------------------
  // REDEEM PROMO CODE
  // ----------------------------------------------------------------------
  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCodeInput.trim()) return;

    const res = await adminService.redeemPromoCode(promoCodeInput.trim(), username || 'Aprendiz');
    if (res.success && res.rewards) {
      audio.playSuccess();
      setPromoFeedback({ text: res.message, success: true });
      // update local user stats with bonus
      const current = storageService.getUserStats();
      const updated = {
        ...current,
        gems: current.gems + (res.rewards.gems || 0),
        xp: current.xp + (res.rewards.xp || 0),
        hearts: Math.min(current.maxHearts, current.hearts + (res.rewards.hearts || 0)),
      };
      storageService.saveUserStats(updated);
      setPromoCodeInput('');
    } else {
      audio.playError();
      setPromoFeedback({ text: res.message, success: false });
    }
    setTimeout(() => setPromoFeedback(null), 5000);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 pb-28 text-white space-y-6">
      
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-xl shadow-emerald-500/20 text-3xl font-black mx-auto mb-1">
          <span>🤟</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">
          Acesso ao LibrasGo
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Escolha seu tipo de perfil para continuar sua jornada de aprendizado ou administrar o ecossistema.
        </p>
      </div>

      {/* Profile Type Selector Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
        <button
          type="button"
          onClick={() => {
            audio.playClick();
            setProfileType('learner');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
            profileType === 'learner'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Perfil Aprendiz</span>
        </button>

        <button
          type="button"
          onClick={() => {
            audio.playClick();
            setProfileType('admin');
          }}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
            profileType === 'admin'
              ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Administrador</span>
        </button>
      </div>

      {/* ================================================================== */}
      {/* 1. LEARNER / USER PROFILE FORM                                     */}
      {/* ================================================================== */}
      {profileType === 'learner' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Main Learner Form Card */}
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            
            {/* Feature Perks of Learner */}
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
                Vantagens do Perfil Aprendiz:
              </span>
              <p className="text-[11px] text-slate-300">
                Acesse todas as 15 trilhas, pratique gestos na câmera de IA, ganhe gemas, abra baús misteriosos e personalize seu mascote Librinha!
              </p>
            </div>

            <form onSubmit={handleLearnerSubmit} className="space-y-5">
              
              {/* Username Input */}
              <div>
                <label className="block text-xs uppercase font-extrabold text-slate-300 tracking-wider mb-2">
                  Seu Nome ou Apelido de Aprendiz:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (learnerError) setLearnerError('');
                    }}
                    maxLength={20}
                    placeholder="Ex: Ana, Beatriz, CarlosPro..."
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-bold text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    autoFocus
                  />
                </div>
                {learnerError && (
                  <p className="text-xs text-rose-400 font-bold mt-1.5 animate-shake">
                    {learnerError}
                  </p>
                )}
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs uppercase font-extrabold text-slate-300 tracking-wider mb-2">
                  Escolha seu Avatar:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {AVATAR_OPTIONS.map((av) => {
                    const isSelected = selectedAvatar === av.url;
                    return (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => {
                          audio.playClick();
                          setSelectedAvatar(av.url);
                        }}
                        className={`relative rounded-2xl p-1 transition-all cursor-pointer group flex flex-col items-center ${
                          isSelected
                            ? 'ring-3 ring-emerald-400 bg-emerald-500/20 scale-105 shadow-lg shadow-emerald-500/30'
                            : 'hover:bg-slate-800 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={av.url}
                          alt={av.label}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center font-bold">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {pendingLearner && (
                <HumanCheck
                  onVerified={() => finishLearnerLogin(pendingLearner)}
                  onCancel={() => setPendingLearner(null)}
                />
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
              >
                <span>Entrar como Aprendiz e Praticar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Privacy Note */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Seus pontos, ofensivas e mascote ficam salvos neste navegador e sincronizados na nuvem.</span>
            </div>
          </div>

          {/* Quick 1-Click Profile Switcher */}
          {savedProfiles.length > 0 && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Perfis Salvos neste Aparelho:
                </span>
                <span className="text-[10px] text-slate-500 font-bold">Toque para entrar</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedProfiles.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickLogin(p)}
                    className="p-2.5 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition-all flex items-center gap-3 text-left cursor-pointer group"
                  >
                    <img
                      src={p.avatarUrl}
                      alt={p.username}
                      className="w-10 h-10 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black text-white group-hover:text-emerald-300 truncate block">
                        {p.username}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Visto {p.lastActive}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Promo Code Redemption Section */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5" />
              Tem um Cupom de Recompensa do Administrador?
            </span>
            <form onSubmit={handleRedeemPromo} className="flex gap-2">
              <input
                type="text"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                placeholder="Ex: LIBRAS2026, MESTRE"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono font-black text-white uppercase placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                Resgatar
              </button>
            </form>
            {promoFeedback && (
              <p
                className={`text-xs font-bold mt-1.5 flex items-center gap-1.5 ${
                  promoFeedback.success ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {promoFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{promoFeedback.text}</span>
              </p>
            )}
          </div>

        </div>
      )}

      {/* ================================================================== */}
      {/* 2. ADMINISTRATOR PROFILE FORM                                       */}
      {/* ================================================================== */}
      {profileType === 'admin' && (
        <div className="space-y-5 animate-fadeIn">
          
          {/* Main Admin Login Card */}
          <div className="p-5 sm:p-7 rounded-3xl bg-slate-900 border-2 border-indigo-500/40 shadow-2xl shadow-indigo-950/40 space-y-5">
            
            {/* Header info */}
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
              <span className="font-extrabold flex items-center gap-1.5 text-indigo-400">
                <Shield className="w-3.5 h-3.5" />
                Painel Exclusivo de Gestão:
              </span>
              <p className="text-[11px] text-slate-300">
                Acesso protegido para gerenciar alunos, ajustar recompensas, configurar atividades e publicar novas mídias de Libras.
              </p>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              
              {/* Admin Username Input */}
              <div>
                <label className="block text-xs uppercase font-extrabold text-slate-300 tracking-wider mb-2">
                  Nome de Usuário de Administrador:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Shield className="w-5 h-5 text-indigo-400" />
                  </div>
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => {
                      setAdminUser(e.target.value);
                      if (adminError) setAdminError('');
                    }}
                    placeholder="Digite seu usuário de admin (ex: admin)"
                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-bold text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
                {adminError && (
                  <p className="text-xs text-rose-400 font-bold mt-1.5 animate-shake flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{adminError}</span>
                  </p>
                )}
              </div>

              {/* Admin Password */}
              <div>
                <label className="block text-xs uppercase font-extrabold text-slate-300 tracking-wider mb-2">
                  Senha de Administrador:
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (adminError) setAdminError('');
                  }}
                  placeholder="Digite a senha"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-700 text-white font-bold text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={adminLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
              >
                {adminLoading ? (
                  <span>Verificando Credenciais...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Entrar no Painel Administrativo</span>
                  </>
                )}
              </button>

              {/* Forgot / Recover Admin Password Trigger */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    audio.playClick();
                    setShowRecoveryModal(true);
                  }}
                  className="text-xs text-indigo-300 hover:text-white underline cursor-pointer font-bold inline-flex items-center gap-1.5 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Esqueci a Senha / Recuperar Acesso de Administradora</span>
                </button>
              </div>
            </form>

            {/* Security Guarantee */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Sessão protegida por token administrativo e auditoria de ações em tempo real.</span>
            </div>

          </div>

          {/* Secure Admin Password Recovery Modal */}
          {showRecoveryModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-6 shadow-2xl text-white relative space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Recuperar Senha de Administradora</h3>
                      <p className="text-[11px] text-slate-400">Apenas a administradora autorizada pode redefinir o acesso.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      audio.playClick();
                      setShowRecoveryModal(false);
                      setRecoveryFeedback(null);
                    }}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRecoverPasswordSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] uppercase font-extrabold text-slate-300 tracking-wider mb-1">
                      E-mail Autorizado da Administradora:
                    </label>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="dupangimarinette@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:border-indigo-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-extrabold text-slate-300 tracking-wider mb-1">
                      Chave de recuperação (segredo ADMIN_RECOVERY_KEY):
                    </label>
                    <input
                      type="text"
                      value={recoveryCode}
                      onChange={(e) => setRecoveryCode(e.target.value)}
                      placeholder="Chave definida nos Secrets"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs uppercase font-mono focus:border-indigo-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-extrabold text-slate-300 tracking-wider mb-1">
                      Nova Senha (mínimo 8 caracteres):
                    </label>
                    <input
                      type="password"
                      value={recoveryNewPass}
                      onChange={(e) => setRecoveryNewPass(e.target.value)}
                      placeholder="Digite a nova senha segura"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:border-indigo-400 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase font-extrabold text-slate-300 tracking-wider mb-1">
                      Confirmar Nova Senha:
                    </label>
                    <input
                      type="password"
                      value={recoveryConfirmPass}
                      onChange={(e) => setRecoveryConfirmPass(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold text-xs focus:border-indigo-400 focus:outline-none"
                      required
                    />
                  </div>

                  {recoveryFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                        recoveryFeedback.success
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {recoveryFeedback.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      <span>{recoveryFeedback.text}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(false)}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={recoveryLoading}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-black text-xs shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                    >
                      {recoveryLoading ? 'Gravando Nova Senha...' : 'Salvar Nova Senha'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
