import React, { useEffect, useState } from 'react';
import { Gift, Sparkles, Flame, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserStats } from '../../types/libras';
import { audio } from '../../services/audioService';
import { dailyBonusService, dailyBonusAmount } from '../../services/dailyBonusService';
import { getBrazilDateKey } from '../../utils/brazilDate';

interface DailyBonusViewProps {
  userStats: UserStats;
  onStatsUpdated: (stats: UserStats) => void;
}

/** Segundos até a meia-noite de Brasília (o bônus renova nesse horário). */
function secondsUntilBrazilMidnight(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
  return 86400 - (n('hour') * 3600 + n('minute') * 60 + n('second'));
}

function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export const DailyBonusView: React.FC<DailyBonusViewProps> = ({ userStats, onStatsUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [needsCode, setNeedsCode] = useState(false);
  const [codeInput, setCodeInput] = useState('');

  // Atualiza a contagem regressiva a cada 30 segundos.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const today = getBrazilDateKey(now);
  const claimedToday = userStats.lastDailyRewardDate === today;
  const streak = Math.max(1, Number(userStats.streak) || 1);
  const cycleDay = ((streak - 1) % 7) + 1; // dia dentro do ciclo de 7
  const nextAmount = dailyBonusAmount(streak);
  const secondsLeft = secondsUntilBrazilMidnight(now);

  const handleClaim = async (typedCode?: string) => {
    if (claimedToday || loading) return;
    audio.playClick();
    setLoading(true);
    setFeedback(null);
    const res = await dailyBonusService.claim(userStats.username, userStats.syncCode, typedCode);
    setLoading(false);

    if (res.updatedUserStats) onStatsUpdated(res.updatedUserStats);

    if (res.success) {
      audio.playSuccess();
      setNeedsCode(false);
      setCodeInput('');
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.5 }, colors: ['#fbbf24', '#38bdf8', '#a78bfa'] });
      setFeedback({ text: res.message, type: 'success' });
    } else {
      audio.playError();
      setNeedsCode(!!res.needsCode);
      setFeedback({ text: res.message || 'Não foi possível resgatar agora.', type: 'error' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-5 text-white">
      {/* Cabeçalho */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-amber-500/20 via-slate-900 to-violet-600/20 border border-amber-400/30 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-amber-400/20 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black leading-tight">Bônus Diário</h2>
            <p className="text-xs text-slate-300">Volte todo dia para ganhar mais diamantes</p>
          </div>
        </div>
      </div>

      {/* Card principal */}
      <div className="rounded-3xl p-6 bg-slate-900/80 border border-slate-700/70 text-center space-y-4">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          {claimedToday ? 'Bônus de hoje recebido' : 'Disponível agora'}
        </div>

        <div className="flex items-center justify-center gap-2">
          <span className="text-5xl font-black text-cyan-300 font-mono">+{nextAmount}</span>
          <span className="text-3xl">💎</span>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-orange-300">
          <Flame className="w-4 h-4" />
          <span>Ofensiva de {streak} {streak === 1 ? 'dia' : 'dias'}</span>
        </div>

        {/* Trilha dos 7 dias do ciclo */}
        <div className="grid grid-cols-7 gap-1.5 pt-2">
          {Array.from({ length: 7 }, (_, i) => {
            const day = i + 1;
            const done = day < cycleDay || (day === cycleDay && claimedToday);
            const current = day === cycleDay && !claimedToday;
            return (
              <div key={day} className="flex flex-col items-center gap-1">
                <div
                  className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-black border ${
                    done
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                      : current
                        ? 'bg-amber-400 border-amber-300 text-slate-950 animate-pulse'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : day}
                </div>
                <span className="text-[9px] text-slate-500 font-bold">+{30 + day * 5}</span>
              </div>
            );
          })}
        </div>

        {claimedToday ? (
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 flex items-center justify-center gap-2 text-slate-300">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-bold">Próximo bônus em {formatCountdown(secondsLeft)}</span>
          </div>
        ) : (
          <button
            onClick={() => handleClaim()}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-500 shadow-xl shadow-amber-500/30 hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span>{loading ? 'Resgatando...' : 'Resgatar bônus de hoje'}</span>
          </button>
        )}

        {needsCode && !claimedToday && (
          <div className="rounded-2xl bg-slate-950 border border-slate-700 p-4 space-y-3 text-left">
            <label className="text-xs font-black text-slate-300 block">Código de sincronização da sua conta</label>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Digite o código"
              autoCapitalize="characters"
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono tracking-widest outline-none focus:border-amber-400"
            />
            <button
              onClick={() => handleClaim(codeInput.trim())}
              disabled={loading || !codeInput.trim()}
              className="w-full py-3 rounded-xl font-black text-slate-950 bg-amber-400 disabled:opacity-50 cursor-pointer"
            >
              Confirmar código e resgatar
            </button>
            <p className="text-[11px] text-slate-500">Você encontra o código em Perfil &gt; Código de Sincronização.</p>
          </div>
        )}

        {feedback && (
          <p
            className={`text-sm font-bold rounded-2xl p-3 border ${
              feedback.type === 'success'
                ? 'text-emerald-200 bg-emerald-500/10 border-emerald-500/40'
                : 'text-rose-200 bg-rose-500/10 border-rose-500/40'
            }`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-500">
        O bônus renova à meia-noite de Brasília. Quanto maior a ofensiva, maior o bônus (até 7 dias).
      </p>
    </div>
  );
};
