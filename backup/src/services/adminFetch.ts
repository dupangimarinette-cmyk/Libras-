export const STORAGE_ADMIN_SESSION = 'librasgo_admin_session';

/**
 * fetch para rotas /api/admin/*: envia o token da sessão do administrador.
 * Se o servidor responder 401 (sessão expirada/inválida), encerra a sessão local e volta ao login.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token = '';
  try {
    const raw = localStorage.getItem(STORAGE_ADMIN_SESSION);
    if (raw) token = JSON.parse(raw)?.token || '';
  } catch {
    // ignore
  }
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && token) {
    try {
      localStorage.removeItem(STORAGE_ADMIN_SESSION);
    } catch {
      // ignore
    }
    window.location.reload();
  }
  return res;
}
