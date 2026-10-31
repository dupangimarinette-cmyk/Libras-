import React, { useState } from 'react';
import {
  Gift,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Trophy,
  Heart,
  Flame,
  ArrowRight,
  ClipboardPaste,
  HelpCircle,
  Zap,
  Info,
  ChevronRight,
  RotateCcw,
  PackageCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserStats, MysteryChest } from '../../types/libras';
import { adminService } from '../../services/adminService';
import { audio } from '../../services/audioService';

interface RedeemViewProps {
  userStats: UserStats;
  chests?: MysteryChest[];
  onRedeemSuccess: (rewards: { gems: number; xp: number; hearts?: number; chests?: number }, promoCode: { code: string; description?: string }) => void;
  onOpenMysteryChest?: (chest: MysteryChest) => any;
  onNavigateToShop?: () => void;
}

export const RedeemView: React.FC<RedeemViewProps> = ({
  userStats,
  chests = [],
  onRedeemSuccess,
  onOpenMysteryChest,
  onNavigateToShop,
}) => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    code: string;
    description?: string;
    rewards: { gems: number; xp: number; hearts?: number; chests?: number };
  } | null>(null);

  // Quick fill from suggestion
  const handleQuickFill = (suggestedCode: string) => {
    audio.playClick();
    setCode(suggestedCode.toUpperCase());
    setErrorMsg(null);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      audio.playClick();
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(text.trim().toUpperCase());
        setErrorMsg(null);
      }
    } catch {
      // ignore clipboard error if not permitted
    }
  };

  // Handle code validation & redemption
  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Por favor, digite ou cole um código de recompensa.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await adminService.redeemPromoCode(
        cleanCode,
        userStats.username,
        userStats.syncCode
      );

      if (res.success && res.rewards) {
        // Trigger celebration sound and particles
        audio.playVictory();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#38bdf8', '#fbbf24', '#10b981'],
        });

        const grantedRewards = {
          gems: res.rewards.gems || 0,
          xp: res.rewards.xp || 0,
          hearts: res.rewards.hearts || 0,
          chests: res.rewards.chests || 0,
        };

        const promoMeta = res.promoCode || {
          code: cleanCode,
          description: 'Código de recompensa validado com sucesso!',
        };

        // Notify parent App to persist rewards
        onRedeemSuccess(grantedRewards, promoMeta);

        setSuccessResult({
          code: cleanCode,
          description: promoMeta.description,
          rewards: grantedRewards,
        });
        setCode('');
      } else {
        audio.playError();
        setErrorMsg(res.message || 'Código inválido ou indisponível.');
      }
    } catch (err: any) {
      audio.playError();
      setErrorMsg('Falha ao conectar ao servidor. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Close celebration modal
  const handleCloseModal = () => {
    setSuccessResult(null);
  };

  // Open chest immediately if awarded and chests are available
  const handleOpenEarnedChest = () => {
    if (!onOpenMysteryChest) return;
    const targetChest = chests.length > 0 ? chests[0] : undefined;
    if (targetChest) {
      handleCloseModal();
      onOpenMysteryChest(targetChest);
    }
  };

  const redeemedHistory = userStats.redeemedPromoCodes || [];
  const alreadyRedeemedWelcome = redeemedHistory.some((r) => r.code.toUpperCase() === 'LIBRAS2026');

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-28 space-y-6 animate-fadeIn">
      
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-purple-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-black uppercase tracking-wider">
              <Gift className="w-3.5 h-3.5 text-purple-400" />
              <span>Central Oficial de Recompensas</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Resgate de Códigos <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">LibrasGo</span>
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Insira os códigos promocionais fornecidos pelo Administrador em aulas, campanhas escolares, desafios e eventos da comunidade para receber <strong>Diamantes 💎</strong>, <strong>XP ⚡</strong>, <strong>Vidas ❤️</strong> e <strong>Baús Misteriosos 🎁</strong>!
            </p>
          </div>

          {/* User Resource Balance Pills */}
          <div className="flex flex-wrap sm:flex-col gap-2.5 bg-slate-950/70 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Seu Saldo Atual:
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>{userStats.gems} 💎</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-950/60 border border-amber-500/30 text-amber-300 text-xs font-black">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{userStats.xp} XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-black">
                <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                <span>{userStats.hearts}/{userStats.maxHearts}</span>
              </div>
              {(userStats.unopenedChestsCount || 0) > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-black animate-pulse">
                  <Gift className="w-3.5 h-3.5 text-purple-400" />
                  <span>{userStats.unopenedChestsCount} Baús</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Redeem Form Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Inserir Código de Recompensa
              </h2>
              <p className="text-xs text-slate-400">
                Os códigos não diferenciam maiúsculas de minúsculas.
              </p>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleRedeem} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setErrorMsg(null);
              }}
              placeholder="DIGITE SEU CÓDIGO (EX: LIBRAS2026)"
              disabled={isLoading}
              className="w-full px-5 py-4 pr-24 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 text-white placeholder-slate-500 font-mono font-black text-base sm:text-lg tracking-wider uppercase transition-all shadow-inner outline-none"
            />
            
            {/* Quick Actions inside input: Paste & Clear */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {code ? (
                <button
                  type="button"
                  onClick={() => {
                    setCode('');
                    setErrorMsg(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition-all cursor-pointer"
                  title="Limpar código"
                >
                  ✕
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer border border-purple-500/20 shadow-sm"
                  title="Colar da área de transferência"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Colar</span>
                </button>
              )}
            </div>
          </div>

          {/* Error Message Feedback */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs sm:text-sm animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-semibold">
                {errorMsg}
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className={`w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all cursor-pointer shadow-lg ${
                isLoading || !code.trim()
                  ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-600/30 hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando Código no Banco...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  <span>Resgatar Recompensa</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestion & Starter Code */}
        {!alreadyRedeemedWelcome && (
          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/20 p-4 rounded-2xl border border-purple-500/20">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎁</span>
              <div>
                <p className="text-xs font-black text-purple-200">
                  Código de Boas-Vindas Disponível: <span className="font-mono text-amber-300">LIBRAS2026</span>
                </p>
                <p className="text-[11px] text-purple-300/70">
                  Liberado para novos alunos da temporada 2026 (+250 Diamantes, +150 XP e +1 Baú!).
                </p>
              </div>
            </div>

            <button
              onClick={() => handleQuickFill('LIBRAS2026')}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600/40 hover:bg-purple-600 border border-purple-400/40 text-white font-extrabold text-xs transition-all cursor-pointer shrink-0 self-start sm:self-auto"
            >
              Preencher Código
            </button>
          </div>
        )}
      </div>

      {/* Rules and Abuse Prevention Information Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-white">Uso Único por Aluno</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cada código pode ser resgatado uma única vez por usuário, garantindo equilíbrio nas premiações.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-white">Regras de Validade</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Alguns códigos possuem data de expiração e cotas de resgates globais limitadas pelo administrador.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
            <PackageCheck className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-white">Crédito Instantâneo</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Seus itens, diamantes e baús são creditados na mesma hora e sincronizados em nuvem entre dispositivos.
            </p>
          </div>
        </div>
      </div>

      {/* Redeemed Codes History Section */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Histórico de Códigos Resgatados Por Você ({redeemedHistory.length})
            </h2>
          </div>
          {redeemedHistory.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400">
              Registrado na sua conta
            </span>
          )}
        </div>

        {redeemedHistory.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 space-y-2">
            <Gift className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-bold text-slate-400">
              Você ainda não resgatou nenhum código nesta conta.
            </p>
            <p className="text-[11px] text-slate-500">
              Fique atento aos avisos do administrador no cabeçalho ou use o código de boas-vindas <span className="text-purple-300 font-mono">LIBRAS2026</span>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {redeemedHistory.map((item, index) => (
              <div
                key={`${item.code}_${index}`}
                className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 hover:border-purple-500/30 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-black text-purple-400 tracking-wider">
                      {item.code}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Resgatado
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {item.rewardsSummary || 'Recompensa oficial resgatada'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {new Date(item.redeemedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Where to get codes banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white">Como conseguir mais códigos?</h4>
            <p className="text-[11px] text-slate-400">
              Participe dos desafios semanais da Trilha, acerte expressões faciais na Prática AR e acompanhe comunicados do Administrador.
            </p>
          </div>
        </div>

        {onNavigateToShop && (
          <button
            onClick={() => {
              audio.playClick();
              onNavigateToShop();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white font-black text-xs transition-all shrink-0 cursor-pointer self-start sm:self-auto border border-slate-700"
          >
            Visitar Loja de Itens 💎
          </button>
        )}
      </div>

      {/* ==================================================================== */}
      {/* CELEBRATION MODAL (POPUP QUANDO CÓDIGO É RESGATADO)                  */}
      {/* ==================================================================== */}
      {successResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-purple-500/50 p-6 sm:p-7 shadow-2xl text-white text-center space-y-5 overflow-hidden">
            
            {/* Background glowing flare */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-40 bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400" />

            {/* Big Celebration Icon */}
            <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 p-1 shadow-xl shadow-purple-600/40">
              <div className="w-full h-full rounded-[22px] bg-slate-950 flex items-center justify-center">
                <Gift className="w-10 h-10 text-amber-300 animate-bounce" />
              </div>
            </div>

            {/* Header */}
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Código Válido & Resgatado
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white pt-1">
                Parabéns, {userStats.username}!
              </h2>
              <p className="text-xs text-slate-300 font-mono tracking-wider font-bold">
                [{successResult.code}]
              </p>
              {successResult.description && (
                <p className="text-xs text-slate-400 pt-1">
                  {successResult.description}
                </p>
              )}
            </div>

            {/* Granted Rewards Badges */}
            <div className="relative z-10 grid grid-cols-2 gap-2.5 py-1">
              {successResult.rewards.gems > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-cyan-500/40 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/10">
                  <span className="text-xl mb-0.5">💎</span>
                  <span className="text-base font-black text-cyan-300">
                    +{successResult.rewards.gems}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Diamantes</span>
                </div>
              )}

              {successResult.rewards.xp > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col items-center justify-center shadow-lg shadow-amber-500/10">
                  <span className="text-xl mb-0.5">⚡</span>
                  <span className="text-base font-black text-amber-300">
                    +{successResult.rewards.xp} XP
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Experiência</span>
                </div>
              )}

              {successResult.rewards.hearts !== undefined && successResult.rewards.hearts > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-rose-500/40 flex flex-col items-center justify-center shadow-lg shadow-rose-500/10">
                  <span className="text-xl mb-0.5">❤️</span>
                  <span className="text-base font-black text-rose-300">
                    +{successResult.rewards.hearts}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Vidas Restauradas</span>
                </div>
              )}

              {successResult.rewards.chests !== undefined && successResult.rewards.chests > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950/90 border border-purple-500/40 flex flex-col items-center justify-center shadow-lg shadow-purple-500/10">
                  <span className="text-xl mb-0.5">🎁</span>
                  <span className="text-base font-black text-purple-300">
                    +{successResult.rewards.chests} Baú{successResult.rewards.chests > 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">Misterioso{successResult.rewards.chests > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            {/* Actions in Modal */}
            <div className="relative z-10 flex flex-col gap-2 pt-2">
              {successResult.rewards.chests !== undefined && successResult.rewards.chests > 0 && onOpenMysteryChest && (
                <button
                  onClick={handleOpenEarnedChest}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Gift className="w-4 h-4" />
                  <span>Destrancar Baú Agora!</span>
                </button>
              )}

              <button
                onClick={handleCloseModal}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Concluir e Voltar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
