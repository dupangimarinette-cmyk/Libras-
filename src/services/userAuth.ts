/**
 * Chave secreta do aluno. O servidor entrega uma chave na primeira gravação da conta;
 * este aparelho a guarda e a envia no header X-User-Key. Sem ela, ninguém altera a conta.
 */
const STORE = 'librasgo_user_keys';

export interface Identity {
  username?: string;
  syncCode?: string;
}

/**
 * Cópia em memória das chaves desta sessão. Se o navegador bloquear o localStorage
 * (ex.: visualização embutida ou aba privada), a chave recebida continua válida até fechar o app.
 */
const memoryKeys: Record<string, string> = {};

function readMap(): Record<string, string> {
  let stored: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(STORE);
    const parsed = raw ? JSON.parse(raw) : {};
    stored = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    stored = {};
  }
  return { ...stored, ...memoryKeys };
}

function identityKeys(id: Identity): string[] {
  const out: string[] = [];
  const code = (id.syncCode || '').trim().toUpperCase();
  const user = (id.username || '').trim().toLowerCase();
  if (code) out.push('c:' + code);
  if (user) out.push('u:' + user);
  return out;
}

export function getUserKey(id: Identity): string {
  const map = readMap();
  for (const k of identityKeys(id)) {
    if (map[k]) return map[k];
  }
  return '';
}

export function storeUserKey(ids: Identity[], key: string): void {
  for (const id of ids) for (const k of identityKeys(id)) memoryKeys[k] = key;
  try {
    const map = readMap();
    for (const id of ids) for (const k of identityKeys(id)) map[k] = key;
    localStorage.setItem(STORE, JSON.stringify(map));
  } catch {
    // sem armazenamento disponível: o app continua, só não protege esta sessão
  }
}

/** fetch para rotas do aluno: envia a chave e guarda a que o servidor devolver (`authKey`). */
/** Lê a resposta como JSON. Se o servidor devolver HTML ou texto (ex.: erro 502), mostra uma mensagem clara. */
export async function readJsonResponse<T = any>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `O servidor respondeu fora do formato esperado (HTTP ${res.status}). Tente novamente em alguns minutos.`
    );
  }
}

export async function userFetch(input: string, init: RequestInit = {}, identity: Identity = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const key = getUserKey(identity);
  if (key) headers.set('X-User-Key', key);

  const res = await fetch(input, { ...init, headers });

  try {
    const data = await res.clone().json();
    if (data && typeof data.authKey === 'string' && data.authKey) {
      storeUserKey([identity, { username: data?.data?.username, syncCode: data?.data?.syncCode }], data.authKey);
    }
  } catch {
    // resposta sem JSON: nada a guardar
  }
  return res;
}
