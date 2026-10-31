import React, { useEffect, useState } from 'react';
import { HumanCheck } from './HumanCheck';
import { HUMAN_CHECK_EVENT, SIGNUP_BLOCKED_EVENT } from '../../services/humanCheck';
import { storageService } from '../../services/storageService';

/**
 * Aparece quando o servidor pede confirmação humana para criar a conta
 * (ex.: aluno antigo cuja conta ainda não existe no servidor) ou recusa o cadastro.
 */
export const SignupGateModal: React.FC = () => {
  const [mode, setMode] = useState<'check' | 'blocked' | null>(null);
  const [blockedMsg, setBlockedMsg] = useState('');

  useEffect(() => {
    const onCheck = () => setMode((m) => m ?? 'check');
    const onBlocked = (e: Event) => {
      setBlockedMsg(String((e as CustomEvent).detail || 'Não foi possível criar a conta agora.'));
      setMode('blocked');
    };
    window.addEventListener(HUMAN_CHECK_EVENT, onCheck);
    window.addEventListener(SIGNUP_BLOCKED_EVENT, onBlocked);
    return () => {
      window.removeEventListener(HUMAN_CHECK_EVENT, onCheck);
      window.removeEventListener(SIGNUP_BLOCKED_EVENT, onBlocked);
    };
  }, []);

  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-3">
        {mode === 'check' ? (
          <HumanCheck
            onVerified={() => {
              setMode(null);
              storageService.syncWithCloud().catch(() => {});
            }}
            onCancel={() => setMode(null)}
          />
        ) : (
          <>
            <p className="text-sm text-white font-bold">{blockedMsg}</p>
            <button onClick={() => setMode(null)} className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-sm cursor-pointer">
              Entendi
            </button>
          </>
        )}
      </div>
    </div>
  );
};
