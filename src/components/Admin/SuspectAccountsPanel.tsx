import React, { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Trash2, RefreshCw } from 'lucide-react';
import { adminFetch } from '../../services/adminFetch';

interface Suspect {
  key: string;
  username: string;
  syncCode: string;
  createdAt: string | null;
  xp: number;
  lessons: number;
  flags: { id: string; label: string; strong: boolean }[];
  score: number;
}

/** Lista contas com sinais de serem falsas e exclui as marcadas, em lote. Nada é apagado sem confirmação. */
export const SuspectAccountsPanel: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/suspects');
      const data = await res.json();
      setSuspects(data?.success ? data.suspects : []);
      setSelected(new Set());
    } catch {
      setMsg('Não foi possível carregar as contas suspeitas.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const purge = async () => {
    const accounts = suspects.filter((s) => selected.has(s.key)).map((s) => ({ key: s.key, username: s.username }));
    if (accounts.length === 0) return;
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/users/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts }),
      });
      const data = await res.json();
      setMsg(data?.message || (res.ok ? 'Contas excluídas.' : 'Erro ao excluir.'));
    } catch {
      setMsg('Erro de conexão ao excluir.');
    }
    setConfirming(false);
    await load();
    onChanged?.();
  };

  if (suspects.length === 0 && !loading && !msg) return null;

  return (
    <div className="p-4 rounded-3xl bg-slate-900 border border-amber-500/30 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          Contas suspeitas ({suspects.length})
        </h3>
        <button onClick={load} disabled={loading} className="text-xs text-slate-300 flex items-center gap-1 cursor-pointer" title="Atualizar">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Marque as que são falsas e exclua. Os sinais “fracos” (mesma rede, sem atividade) podem ser alunos de verdade, então confira antes.
      </p>
      {msg && <p className="text-xs font-bold text-emerald-300">{msg}</p>}

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {suspects.map((s) => (
          <label key={s.key} className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer">
            <input type="checkbox" checked={selected.has(s.key)} onChange={() => toggle(s.key)} className="mt-1" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-white truncate">{s.username}</div>
              <div className="text-[11px] text-slate-400">
                XP {s.xp} · {s.lessons} lições{s.createdAt ? ` · criada em ${new Date(s.createdAt).toLocaleDateString('pt-BR')}` : ''}
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {s.flags.map((f) => (
                  <span
                    key={f.id}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.strong ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>
          </label>
        ))}
      </div>

      {suspects.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelected(new Set(suspects.filter((s) => s.flags.some((f) => f.strong)).map((s) => s.key)))}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer"
          >
            Marcar só nomes de robô
          </button>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={selected.size === 0}
              className="text-xs px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir selecionadas ({selected.size})
            </button>
          ) : (
            <>
              <span className="text-xs text-rose-300 font-bold">Excluir {selected.size} conta(s) para sempre?</span>
              <button onClick={purge} className="text-xs px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold cursor-pointer">
                Sim, excluir
              </button>
              <button onClick={() => setConfirming(false)} className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 font-bold cursor-pointer">
                Cancelar
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
