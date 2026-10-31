/**
 * Verificação "sou uma pessoa" para criar conta.
 * O servidor devolve um passe de uso único; ele vai no header X-Signup-Pass na primeira gravação da conta.
 */
const PASS_STORE = 'librasgo_signup_pass';

export type Challenge =
  | { mode: 'math'; question: string; token: string }
  | { mode: 'turnstile'; siteKey: string; token: string };

export const HUMAN_CHECK_EVENT = 'librasgo:human-check';
export const SIGNUP_BLOCKED_EVENT = 'librasgo:signup-blocked';

export function getSignupPass(): string {
  try {
    return sessionStorage.getItem(PASS_STORE) || '';
  } catch {
    return '';
  }
}

export function clearSignupPass(): void {
  try {
    sessionStorage.removeItem(PASS_STORE);
  } catch {
    // sem armazenamento: nada a limpar
  }
}

function storeSignupPass(pass: string): void {
  try {
    sessionStorage.setItem(PASS_STORE, pass);
  } catch {
    // sem armazenamento: o passe vale só para esta chamada
  }
}

/** Mesma regra do servidor, só para avisar o aluno na hora. O servidor é quem decide de verdade. */
export function looksAutomatedName(name: string): boolean {
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  if (!n) return false;
  if (/https?:|www\.|\.(com|net|org|br|io|xyz|ru)\b|@/.test(n)) return true;
  if (/(^|[^a-z])(bot|robo|chatgpt|gpt|gemini|claude|copilot|assistant|assistente|agente|crawler|scraper)([^a-z]|$)/.test(n)) return true;
  if (/^(user|usuario|aluno|test|teste|player|guest|visitante)[\s_-]?\d{3,}$/.test(n)) return true;
  return /^[^a-z]+$/.test(n);
}

export async function fetchChallenge(): Promise<{ challenge?: Challenge; error?: string }> {
  try {
    const res = await fetch('/api/signup/challenge');
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.token) return { challenge: data as Challenge };
    return { error: data?.message || 'Não foi possível carregar a verificação.' };
  } catch {
    return { error: 'Sem conexão. Verifique a internet e tente de novo.' };
  }
}

export async function submitChallenge(params: {
  token: string;
  answer?: string;
  turnstileToken?: string;
  hp?: string;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/signup/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.success && data.pass) {
      storeSignupPass(data.pass);
      return { ok: true };
    }
    return { ok: false, message: data?.message || 'Não foi possível confirmar. Tente de novo.' };
  } catch {
    return { ok: false, message: 'Sem conexão. Verifique a internet e tente de novo.' };
  }
}
