import { UserStats } from '../types/libras';
import { userFetch } from './userAuth';

export interface DailyBonusResult {
  success: boolean;
  message: string;
  bonusDiamonds?: number;
  updatedUserStats?: UserStats;
  /** true quando a conta está protegida e o aparelho precisa do código de sincronização. */
  needsCode?: boolean;
}

type Raw = { status: number; data: any; contentType: string; snippet: string };

/** Trecho curto do corpo da resposta, para diagnosticar respostas que não são JSON. */
function bodySnippet(text: string): string {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
}

async function postClaim(username: string, syncCode?: string): Promise<Raw> {
  const res = await userFetch('/api/bonus/resgatar-diario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, syncCode }),
  }, { username, syncCode });
  const text = await res.text().catch(() => '');
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = null; }
  return {
    status: res.status,
    data,
    contentType: res.headers.get('content-type') || 'desconhecido',
    snippet: bodySnippet(text),
  };
}

/** Pede a chave deste aparelho usando o código de sincronização (mesma rota da restauração). */
async function unlockWithCode(code: string): Promise<void> {
  const c = code.trim().toUpperCase();
  await userFetch(`/api/sync/load/${encodeURIComponent(c)}`, {}, { username: c, syncCode: c }).catch(() => null);
}

export const dailyBonusService = {
  /**
   * Resgate do bônus diário. Se o aparelho não tiver a chave da conta, usa o código
   * digitado (ou o código salvo na conta) para liberar a chave e tenta de novo.
   */
  async claim(username: string, syncCode?: string, typedCode?: string): Promise<DailyBonusResult> {
    try {
      const code = (typedCode || '').trim().toUpperCase();
      if (code) await unlockWithCode(code);

      const raw = await postClaim(username, code || syncCode);

      // O bônus não exige mais código de sincronização: o servidor não responde KEY_REQUIRED nesta rota.
      const data = raw.data;
      if (!data || typeof data !== 'object') {
        const detail = `HTTP ${raw.status} · tipo: ${raw.contentType}${raw.snippet ? ` · corpo: "${raw.snippet}"` : ' · corpo vazio'}`;
        console.error('[bonus diário] resposta sem JSON:', detail);
        return {
          success: false,
          message: `Não foi possível falar com o servidor agora (${detail}). Tente novamente em instantes.`,
        };
      }
      return data as DailyBonusResult;
    } catch {
      return { success: false, message: 'Sem conexão com o servidor. Verifique a internet e tente de novo.' };
    }
  },
};

/** Valor do bônus: 30 + 5 por dia de ofensiva, até 7 dias (35 a 65). */
export function dailyBonusAmount(streak: number): number {
  return 30 + Math.min(Math.max(1, Number(streak) || 1), 7) * 5;
}
