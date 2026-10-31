import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Challenge, fetchChallenge, submitChallenge } from '../../services/humanCheck';

interface Props {
  onVerified: () => void;
  onCancel?: () => void;
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile(): Promise<any> {
  const w = window as any;
  if (w.turnstile) return Promise.resolve(w.turnstile);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => resolve(w.turnstile);
    s.onerror = () => reject(new Error('turnstile'));
    document.head.appendChild(s);
  });
}

/** Pergunta simples (ou Turnstile, se o servidor estiver configurado) + armadilha invisível para robôs. */
export const HumanCheck: React.FC<Props> = ({ onVerified, onCancel }) => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [hp, setHp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setChallenge(null);
    setAnswer('');
    const r = await fetchChallenge();
    if (r.challenge) setChallenge(r.challenge);
    else setError(r.error || 'Falha ao carregar.');
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verify = useCallback(
    async (extra: { answer?: string; turnstileToken?: string }) => {
      if (!challenge) return;
      setBusy(true);
      setError('');
      const r = await submitChallenge({ token: challenge.token, hp, ...extra });
      setBusy(false);
      if (r.ok) onVerified();
      else {
        setError(r.message || 'Tente de novo.');
        load();
      }
    },
    [challenge, hp, load, onVerified]
  );

  useEffect(() => {
    if (challenge?.mode !== 'turnstile' || !widgetRef.current) return;
    let widgetId: any;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !widgetRef.current) return;
        widgetId = ts.render(widgetRef.current, {
          sitekey: challenge.siteKey,
          callback: (t: string) => verify({ turnstileToken: t }),
        });
      })
      .catch(() => setError('Não foi possível carregar a verificação. Tente de novo.'));
    return () => {
      cancelled = true;
      try {
        (window as any).turnstile?.remove(widgetId);
      } catch {
        // widget já removido
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge]);

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-slate-950 p-4 space-y-3">
      <div className="flex items-center gap-2 text-emerald-300 font-extrabold text-sm">
        <ShieldCheck className="w-5 h-5" />
        Só para confirmar que você é uma pessoa
      </div>

      {/* Armadilha: pessoas não veem nem preenchem; robôs costumam preencher. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
      />

      {!challenge && !error && <p className="text-xs text-slate-400">Carregando…</p>}

      {challenge?.mode === 'math' && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-white">{challenge.question}</label>
          <input
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (answer.trim() && !busy) verify({ answer: answer.trim() });
              }
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white font-bold text-sm focus:outline-none focus:border-emerald-400"
            placeholder="Sua resposta"
            autoFocus
          />
          <button
            type="button"
            onClick={() => verify({ answer: answer.trim() })}
            disabled={busy || !answer.trim()}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm disabled:opacity-50 cursor-pointer"
          >
            {busy ? 'Confirmando…' : 'Confirmar'}
          </button>
        </div>
      )}

      {challenge?.mode === 'turnstile' && <div ref={widgetRef} />}

      {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}

      {onCancel && (
        <button type="button" onClick={onCancel} className="text-xs text-slate-400 underline cursor-pointer">
          Cancelar
        </button>
      )}
    </div>
  );
};
