import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { LibrinhaMascot, MascotEquipped } from './LibrinhaMascot';

/**
 * A Librinha aparece de tempos em tempos com uma frase (dica, incentivo ou lembrete).
 * - Primeira frase ~40s depois de abrir o app; as próximas a cada 1,5 a 2,5 minutos.
 * - Some sozinha em 9s ou ao tocar. Não aparece com a aba do navegador escondida,
 *   nem durante lição, câmera (AR), login ou admin.
 * - O aluno liga/desliga em Perfil > "Dicas da Librinha" (guardado só neste aparelho).
 */

const STORAGE_KEY = 'librasgo_dicas_librinha';
const EVENT_NAME = 'librasgo-dicas-librinha';

export function getMascotTipsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMascotTipsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    /* sem armazenamento: vale só até recarregar */
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: enabled }));
}

interface Props {
  equipped?: MascotEquipped;
  streak: number;
  hearts: number;
  pendingMissions: number;
  hidden?: boolean; // true durante lição, câmera, login, admin
}

const GENERAL_TIPS = [
  'Praticar 5 minutinhos por dia vale mais do que 1 hora só no fim de semana! 💪',
  'Em Libras, a expressão do rosto faz parte do sinal. Capriche na carinha! 😄',
  'Dica: treine na frente da câmera com boa luz para eu reconhecer melhor o seu sinal. 📸',
  'Errou um sinal? Tudo bem! Repetir é como a gente aprende. 🤟',
  'Que tal revisar um sinal antigo hoje? Revisar fixa o que você já sabe. 🔁',
  'Libras é uma língua completa, com gramática própria. Você está aprendendo algo incrível! 🌟',
  'Já conferiu o Libras Dex? Tem sinais novos para descobrir. 📖',
  'Respire fundo, relaxe as mãos e tente de novo. Você consegue! ✨',
];

function pickMessage(p: { streak: number; hearts: number; pendingMissions: number }, last: string): string {
  const pool: string[] = [...GENERAL_TIPS];
  if (p.pendingMissions > 0) {
    pool.push(`Você tem ${p.pendingMissions} ${p.pendingMissions === 1 ? 'missão pronta' : 'missões prontas'} para resgatar! 🎁`);
  }
  if (p.streak >= 2) {
    pool.push(`Sua sequência está em ${p.streak} dias! Não deixe ela quebrar hoje. 🔥`);
  }
  if (p.hearts <= 2) {
    pool.push('Seus corações estão acabando. Vá com calma e capriche nos sinais! ❤️');
  }
  const options = pool.filter((m) => m !== last);
  return options[Math.floor(Math.random() * options.length)] || GENERAL_TIPS[0];
}

export const MascotCompanion: React.FC<Props> = ({ equipped, streak, hearts, pendingMissions, hidden }) => {
  const [enabled, setEnabled] = useState<boolean>(getMascotTipsEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const lastMessage = useRef('');
  const latest = useRef({ streak, hearts, pendingMissions, hidden });
  latest.current = { streak, hearts, pendingMissions, hidden };

  useEffect(() => {
    const onChange = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail;
      setEnabled(value);
      if (!value) setMessage(null);
    };
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const schedule = (ms: number) => {
      showTimer = setTimeout(() => {
        const cur = latest.current;
        if (!cur.hidden && document.visibilityState === 'visible') {
          const msg = pickMessage(cur, lastMessage.current);
          lastMessage.current = msg;
          setMessage(msg);
          hideTimer = setTimeout(() => setMessage(null), 9000);
        }
        schedule(90_000 + Math.random() * 60_000);
      }, ms);
    };

    schedule(40_000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [enabled]);

  // Se entrou numa tela onde não deve aparecer, esconde na hora.
  useEffect(() => {
    if (hidden) setMessage(null);
  }, [hidden]);

  if (!enabled || hidden || !message) return null;

  return (
    <div
      className="fixed right-3 bottom-24 sm:bottom-20 z-30 flex items-end gap-2 max-w-[88vw] animate-in fade-in slide-in-from-bottom-4 duration-300"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={() => setMessage(null)}
        className="relative text-left bg-slate-900/95 border border-emerald-500/40 text-slate-100 pl-4 pr-8 py-3 rounded-2xl rounded-br-sm shadow-xl text-xs font-bold leading-snug"
        aria-label="Fechar dica da Librinha"
      >
        <span className="block text-[10px] uppercase tracking-wider text-emerald-400 mb-0.5">Librinha diz</span>
        {message}
        <X className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-400" />
      </button>
      <LibrinhaMascot mood="encouraging" size={64} equipped={equipped} />
    </div>
  );
};

export const MascotTipsToggle: React.FC = () => {
  const [on, setOn] = useState<boolean>(getMascotTipsEnabled);
  useEffect(() => {
    const onChange = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    window.addEventListener(EVENT_NAME, onChange);
    return () => window.removeEventListener(EVENT_NAME, onChange);
  }, []);
  return (
    <div className="max-w-2xl mx-auto w-full px-4 mt-4">
      <label className="flex items-center justify-between gap-3 bg-slate-900/70 border border-white/10 rounded-2xl px-4 py-3 cursor-pointer">
        <span>
          <span className="block text-sm font-black text-slate-100">Dicas da Librinha</span>
          <span className="block text-xs text-slate-400">A Librinha aparece de vez em quando com uma frase de incentivo.</span>
        </span>
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => setMascotTipsEnabled(e.target.checked)}
          className="w-5 h-5 accent-emerald-500"
        />
      </label>
    </div>
  );
};
