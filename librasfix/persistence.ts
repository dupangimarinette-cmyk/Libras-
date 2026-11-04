import fs from 'fs';
import crypto from 'crypto';

/**
 * PERSISTÊNCIA DO SERVIDOR: Firestore (principal) com reserva em arquivo JSON.
 *
 * - O servidor continua lendo/gravando "o banco inteiro" de forma síncrona (como antes), mas agora
 *   por um cache em memória. As mudanças são enviadas ao Firestore em segundo plano (só o que mudou).
 * - Alunos: 1 registro por aluno na coleção `syncUsers` (dividido em pedaços se passar de ~900 KB).
 * - Conteúdo do admin: 1 campo = 1 grupo de documentos na coleção `adminState` (dividido em pedaços,
 *   porque um documento do Firestore aceita no máximo 1 MiB).
 * - Na primeira vez com o Firestore vazio, importa sync_data.json e admin_state.json sozinho
 *   (grava `meta/migration` para nunca importar duas vezes).
 * - Se o Firestore não estiver acessível (sem credencial), usa os arquivos JSON como antes e avisa no log.
 */

export interface Doc {
  col: string;
  id: string;
  data: Record<string, any>;
}

export interface DocStore {
  loadAll(): Promise<Doc[]>;
  commit(sets: Doc[], deletes: { col: string; id: string }[]): Promise<void>;
}

let lastConnectError = '';
/** Motivo (curto, sem segredos) pelo qual o Firestore não foi usado; vazio se está tudo certo. */
export function getConnectError(): string {
  return lastConnectError;
}

export const COL_USERS = 'syncUsers';
export const COL_ADMIN = 'adminState';
export const COL_META = 'meta';
const CHUNK_CHARS = 300_000; // 300 mil caracteres ≤ ~900 KB mesmo com acentos (limite do doc: 1 MiB)

type Logger = (msg: string) => void;

export interface PersistenceOptions {
  dbFile: string;
  adminFile: string;
  log?: Logger;
  flushDelayMs?: number;
}

function docIdForUser(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** Divide o texto sem cortar um par substituto (emoji), senão o Firestore corromperia o texto. */
export function splitText(text: string, size = CHUNK_CHARS): string[] {
  if (text.length <= size) return [text];
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    if (end < text.length) {
      const c = text.charCodeAt(end - 1);
      if (c >= 0xd800 && c <= 0xdbff) end -= 1;
    }
    out.push(text.slice(i, end));
    i = end;
  }
  return out;
}

function readJsonFile(file: string): any | null {
  try {
    if (!fs.existsSync(file)) return null;
    const raw = fs.readFileSync(file, 'utf-8');
    if (!raw.trim()) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.error(`[PERSISTÊNCIA] Erro lendo ${file}:`, err);
    return null;
  }
}

export class Persistence {
  mode: 'firestore' | 'file' = 'file';

  private users = new Map<string, string>(); // chave do aluno -> JSON do registro
  private admin = new Map<string, string>(); // campo do admin -> JSON do valor
  private persistedUsers = new Map<string, string>();
  private persistedAdmin = new Map<string, string>();
  private persistedChunks = new Map<string, number>();
  private persistedUserChunks = new Map<string, number>();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private inflight: Promise<void> | null = null;
  private retryDelay = 5000;
  private log: Logger;

  constructor(private store: DocStore | null, private opts: PersistenceOptions) {
    this.log = opts.log || ((m) => console.log(m));
    if (store) this.mode = 'firestore';
  }

  // ---------------------------------------------------------- início
  async init(): Promise<void> {
    if (!this.store) {
      this.loadFromFiles();
      this.log('[PERSISTÊNCIA] Modo ARQUIVO (sync_data.json / admin_state.json).');
      return;
    }

    const docs = await this.store.loadAll();
    const hasData = docs.some((d) => d.col === COL_USERS || d.col === COL_ADMIN);
    const migrated = docs.some((d) => d.col === COL_META && d.id === 'migration');

    if (hasData) {
      this.loadFromDocs(docs);
      this.log(`[PERSISTÊNCIA] Firestore carregado: ${this.users.size} alunos, ${this.admin.size} campos do admin.`);
      if (!migrated) await this.markMigrated(0, 0, false);
      return;
    }

    if (migrated) {
      this.log('[PERSISTÊNCIA] Firestore vazio, mas a migração já foi feita antes: começando do zero (não reimporto JSON).');
      return;
    }

    // Firestore vazio: importa os JSON (se tiverem dados).
    this.loadFromFiles();
    if (this.users.size === 0 && this.admin.size === 0) {
      this.log('[PERSISTÊNCIA] Firestore vazio e JSON vazios: começando do zero.');
      return;
    }
    this.log(`[MIGRAÇÃO] Importando ${this.users.size} alunos e ${this.admin.size} campos do admin para o Firestore...`);
    await this.flushNow();
    await this.markMigrated(this.users.size, this.admin.size, true);
    this.retireFile(this.opts.dbFile);
    this.retireFile(this.opts.adminFile);
    this.log('[MIGRAÇÃO] Concluída. Os JSON antigos foram renomeados para *.migrado.bak.');
  }

  private async markMigrated(users: number, fields: number, imported: boolean) {
    await this.store!.commit(
      [{ col: COL_META, id: 'migration', data: { at: new Date().toISOString(), users, fields, imported } }],
      [],
    );
  }

  private retireFile(file: string) {
    try {
      if (fs.existsSync(file)) fs.renameSync(file, `${file}.migrado.bak`);
    } catch (err) {
      console.warn('[MIGRAÇÃO] Não consegui renomear', file, err);
    }
  }

  private loadFromFiles() {
    // 1. Carrega dados de alunos (mesclando sync_data.json e dbFile para preservar todas as contas existentes)
    const fallbackDb = readJsonFile('sync_data.json') || {};
    for (const [k, v] of Object.entries(fallbackDb)) {
      const j = JSON.stringify(v);
      if (j !== undefined) this.users.set(k, j);
    }
    const db = readJsonFile(this.opts.dbFile) || {};
    for (const [k, v] of Object.entries(db)) {
      const j = JSON.stringify(v);
      if (j !== undefined) this.users.set(k, j);
    }

    // 2. Carrega configurações do admin (mesclando admin_state.json e adminFile)
    const fallbackAdmin = readJsonFile('admin_state.json') || {};
    for (const [k, v] of Object.entries(fallbackAdmin)) {
      const j = JSON.stringify(v);
      if (j !== undefined) this.admin.set(k, j);
    }
    const admin = readJsonFile(this.opts.adminFile) || {};
    for (const [k, v] of Object.entries(admin)) {
      const j = JSON.stringify(v);
      if (j !== undefined) this.admin.set(k, j);
    }
    // Em modo Firestore, nada ainda foi enviado: persisted* continuam vazios, então o flush envia tudo.
  }

  private loadFromDocs(docs: Doc[]) {
    this.users.clear();
    this.admin.clear();
    const chunks = new Map<string, { index: number; total: number; json: string }[]>();
    const userChunks = new Map<string, { index: number; total: number; json: string }[]>();
    for (const d of docs) {
      if (d.col === COL_USERS) {
        const { key, index = 0, total = 1, json } = d.data;
        if (typeof key !== 'string' || typeof json !== 'string') continue;
        if (!userChunks.has(key)) userChunks.set(key, []);
        userChunks.get(key)!.push({ index, total, json });
      } else if (d.col === COL_ADMIN) {
        const { field, index, total, json } = d.data;
        if (typeof field !== 'string') continue;
        if (!chunks.has(field)) chunks.set(field, []);
        chunks.get(field)!.push({ index, total, json });
      }
    }
    for (const [key, list] of userChunks) {
      list.sort((a, b) => a.index - b.index);
      const total = list[0].total;
      if (list.length !== total || list.some((c, i) => c.index !== i)) {
        throw new Error(`Registro do aluno "${key}" está incompleto no Firestore (${list.length}/${total} pedaços).`);
      }
      this.users.set(key, list.map((c) => c.json).join(''));
      this.persistedUserChunks.set(key, total);
    }
    for (const [field, list] of chunks) {
      list.sort((a, b) => a.index - b.index);
      const total = list[0].total;
      if (list.length !== total || list.some((c, i) => c.index !== i)) {
        // Melhor parar do que subir com conteúdo do admin pela metade e depois sobrescrever.
        throw new Error(`Campo "${field}" do admin está incompleto no Firestore (${list.length}/${total} pedaços).`);
      }
      this.admin.set(field, list.map((c) => c.json).join(''));
      this.persistedChunks.set(field, total);
    }
    this.persistedUsers = new Map(this.users);
    this.persistedAdmin = new Map(this.admin);
  }

  // ---------------------------------------------------------- alunos
  getSyncDb(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [k, j] of this.users) out[k] = JSON.parse(j);
    return out;
  }

  setSyncDb(data: Record<string, any>) {
    const next = new Map<string, string>();
    for (const [k, v] of Object.entries(data)) {
      const j = JSON.stringify(v);
      if (j !== undefined) next.set(k, j);
    }
    this.users = next;
    if (this.mode === 'file') {
      this.writeFileSafe(this.opts.dbFile, JSON.stringify(data, null, 2));
    } else {
      this.scheduleFlush();
    }
  }

  // ---------------------------------------------------------- admin
  /** null = nada salvo ainda. */
  getAdminRaw(): Record<string, any> | null {
    if (this.admin.size === 0) return null;
    const out: Record<string, any> = {};
    for (const [k, j] of this.admin) out[k] = JSON.parse(j);
    return out;
  }

  setAdminRaw(data: Record<string, any>) {
    const next = new Map<string, string>();
    for (const [k, v] of Object.entries(data)) {
      const j = JSON.stringify(v);
      if (j !== undefined) next.set(k, j);
    }
    this.admin = next;
    if (this.mode === 'file') {
      this.writeFileSafe(this.opts.adminFile, JSON.stringify(data, null, 2));
    } else {
      this.scheduleFlush();
    }
  }

  private writeFileSafe(file: string, text: string) {
    try {
      fs.writeFileSync(file, text, 'utf-8');
    } catch (err) {
      console.error('[PERSISTÊNCIA] Erro gravando', file, err);
    }
  }

  // ---------------------------------------------------------- envio ao Firestore
  private scheduleFlush(delay = this.opts.flushDelayMs ?? 700) {
    if (this.mode !== 'firestore' || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushNow().catch(() => {});
    }, delay);
  }

  /** Envia tudo que mudou. Seguro chamar várias vezes; uma execução por vez. */
  async flushNow(): Promise<void> {
    if (!this.store) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    while (this.inflight) await this.inflight.catch(() => {});
    this.inflight = this.runFlush().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async runFlush(): Promise<void> {
    const sets: Doc[] = [];
    const deletes: { col: string; id: string }[] = [];
    const usersSnap = new Map(this.users);
    const adminSnap = new Map(this.admin);
    const newChunkCounts = new Map<string, number>();
    const newUserChunkCounts = new Map<string, number>();
    const now = new Date().toISOString();

    for (const [k, j] of usersSnap) {
      if (this.persistedUsers.get(k) === j) continue;
      const parts = splitText(j);
      const base = docIdForUser(k);
      parts.forEach((json, index) =>
        sets.push({ col: COL_USERS, id: `${base}__${index}`, data: { key: k, index, total: parts.length, json, updatedAt: now } }),
      );
      const old = this.persistedUserChunks.get(k) || 0;
      for (let i = parts.length; i < old; i++) deletes.push({ col: COL_USERS, id: `${base}__${i}` });
      newUserChunkCounts.set(k, parts.length);
    }
    for (const k of this.persistedUsers.keys()) {
      if (usersSnap.has(k)) continue;
      const base = docIdForUser(k);
      const old = this.persistedUserChunks.get(k) || 0;
      for (let i = 0; i < old; i++) deletes.push({ col: COL_USERS, id: `${base}__${i}` });
      newUserChunkCounts.set(k, 0);
    }

    for (const [field, j] of adminSnap) {
      if (this.persistedAdmin.get(field) === j) continue;
      const parts = splitText(j);
      parts.forEach((json, index) =>
        sets.push({ col: COL_ADMIN, id: `${field}__${index}`, data: { field, index, total: parts.length, json, updatedAt: now } }),
      );
      const old = this.persistedChunks.get(field) || 0;
      for (let i = parts.length; i < old; i++) deletes.push({ col: COL_ADMIN, id: `${field}__${i}` });
      newChunkCounts.set(field, parts.length);
    }
    for (const field of this.persistedAdmin.keys()) {
      if (adminSnap.has(field)) continue;
      const old = this.persistedChunks.get(field) || 0;
      for (let i = 0; i < old; i++) deletes.push({ col: COL_ADMIN, id: `${field}__${i}` });
      newChunkCounts.set(field, 0);
    }

    if (sets.length === 0 && deletes.length === 0) return;

    try {
      await this.store!.commit(sets, deletes);
    } catch (err) {
      console.error('[PERSISTÊNCIA] Falha ao gravar no Firestore (vou tentar de novo):', err instanceof Error ? err.message : err);
      this.retryDelay = Math.min(this.retryDelay * 2, 60_000);
      this.scheduleFlush(this.retryDelay);
      throw err;
    }
    this.retryDelay = 5000;
    this.persistedUsers = usersSnap;
    this.persistedAdmin = adminSnap;
    for (const [k, n] of newUserChunkCounts) {
      if (n === 0) this.persistedUserChunks.delete(k);
      else this.persistedUserChunks.set(k, n);
    }
    for (const [f, n] of newChunkCounts) {
      if (n === 0) this.persistedChunks.delete(f);
      else this.persistedChunks.set(f, n);
    }
    // Se algo mudou durante o envio, manda de novo.
    if (this.hasPendingChanges()) this.scheduleFlush(200);
  }

  private hasPendingChanges(): boolean {
    if (this.users.size !== this.persistedUsers.size || this.admin.size !== this.persistedAdmin.size) return true;
    for (const [k, j] of this.users) if (this.persistedUsers.get(k) !== j) return true;
    for (const [k, j] of this.admin) if (this.persistedAdmin.get(k) !== j) return true;
    return false;
  }
}

// -------------------------------------------------------------
// Conexão real com o Firestore (firebase-admin com credencial OU Firebase Client SDK autenticado).
// Assegura persistência definitiva na nuvem Firestore para o servidor.
// -------------------------------------------------------------
async function createClientSdkStore(cfg: any, log: Logger): Promise<DocStore | null> {
  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
    const { getFirestore, doc, collection, getDocs, writeBatch, getDoc } = await import('firebase/firestore');

    const appName = 'serverPersistenceApp';
    const app = getApps().some((a) => a.name === appName) ? getApp(appName) : initializeApp(cfg, appName);
    const auth = getAuth(app);
    const serverEmail = 'server-backend@librasgo.app';
    const serverPass = 'LibrasGo#2026ServerBackend!';

    if (!auth.currentUser) {
      await signInWithEmailAndPassword(auth, serverEmail, serverPass);
    }
    log(`[PERSISTÊNCIA] Servidor autenticado no Firebase Auth (${serverEmail}).`);

    const db = getFirestore(app, cfg.firestoreDatabaseId || '(default)');

    // Teste de conexão real ao Firestore
    await Promise.race([
      getDoc(doc(db, COL_META, 'migration')),
      new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado ao falar com o Firestore')), 15_000)),
    ]);
    log(`[PERSISTÊNCIA] Firestore conectado com sucesso via Firebase Client SDK (banco: ${cfg.firestoreDatabaseId || '(default)'}).`);

    const ensureAuth = async () => {
      if (auth.currentUser) {
        try {
          await auth.currentUser.getIdToken(false);
          return;
        } catch {}
      }
      await signInWithEmailAndPassword(auth, serverEmail, serverPass);
    };

    return {
      async loadAll() {
        await ensureAuth();
        const out: Doc[] = [];
        for (const col of [COL_USERS, COL_ADMIN, COL_META]) {
          const snap = await getDocs(collection(db, col));
          snap.forEach((d) => out.push({ col, id: d.id, data: d.data() as Record<string, any> }));
        }
        return out;
      },
      async commit(sets, deletes) {
        await ensureAuth();
        type Op = { kind: 'set'; doc: Doc } | { kind: 'del'; col: string; id: string };
        const ops: Op[] = [
          ...sets.map((d): Op => ({ kind: 'set', doc: d })),
          ...deletes.map((d): Op => ({ kind: 'del', col: d.col, id: d.id })),
        ];
        for (let i = 0; i < ops.length; i += 400) {
          const batch = writeBatch(db);
          for (const op of ops.slice(i, i + 400)) {
            if (op.kind === 'set') batch.set(doc(db, op.doc.col, op.doc.id), op.doc.data);
            else batch.delete(doc(db, op.col, op.id));
          }
          await batch.commit();
        }
      },
    };
  } catch (clientErr) {
    log(`[PERSISTÊNCIA] Client SDK aviso: ${clientErr instanceof Error ? clientErr.message : clientErr}`);
    return null;
  }
}

export async function createFirestoreStore(configPath: string, log: Logger = console.log): Promise<DocStore | null> {
  if ((process.env.PERSISTENCE || '').toLowerCase() === 'file') {
    lastConnectError = 'PERSISTENCE=file está definido nos Secrets.';
    log('[PERSISTÊNCIA] PERSISTENCE=file: usando arquivos JSON.');
    return null;
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const projectIdClean = (cfg.projectId || '').trim().replace(/\.+$/, '');
    const databaseIdClean = (cfg.firestoreDatabaseId || '').trim();

    // 1. Tenta firebase-admin se houver uma chave de serviço válida (FIREBASE_SERVICE_ACCOUNT)
    const rawSa = (process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
    let sa: any = null;
    if (rawSa) {
      try {
        const text = rawSa.startsWith('{') ? rawSa : Buffer.from(rawSa, 'base64').toString('utf-8');
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.private_key === 'string' && typeof parsed.client_email === 'string') sa = parsed;
      } catch {}
    }

    if (sa) {
      try {
        const appMod: any = await import('firebase-admin/app');
        const fsMod: any = await import('firebase-admin/firestore');
        if (typeof sa.private_key === 'string') sa.private_key = sa.private_key.replace(/\\n/g, '\n');
        const credential = appMod.cert(sa);
        const adminProjectId = sa.project_id || projectIdClean;
        const adminDatabaseId =
          (process.env.FIREBASE_DATABASE_ID || '').trim() ||
          (sa.project_id && sa.project_id === projectIdClean && databaseIdClean ? databaseIdClean : '(default)');
        const adminApp = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp({ credential, projectId: adminProjectId });
        const adminDb = adminDatabaseId && adminDatabaseId !== '(default)' ? fsMod.getFirestore(adminApp, adminDatabaseId) : fsMod.getFirestore(adminApp);

        await Promise.race([
          adminDb.collection(COL_META).doc('migration').get(),
          new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado ao falar com o Firestore')), 10_000)),
        ]);

        log(`[PERSISTÊNCIA] Conectado ao Firestore via firebase-admin (Projeto: ${adminProjectId}, Banco: ${adminDatabaseId}).`);
        lastConnectError = '';
        return {
          async loadAll() {
            const out: Doc[] = [];
            for (const col of [COL_USERS, COL_ADMIN, COL_META]) {
              const snap = await adminDb.collection(col).get();
              snap.forEach((d: any) => out.push({ col, id: d.id, data: d.data() }));
            }
            return out;
          },
          async commit(sets, deletes) {
            type Op = { kind: 'set'; doc: Doc } | { kind: 'del'; col: string; id: string };
            const ops: Op[] = [
              ...sets.map((doc): Op => ({ kind: 'set', doc })),
              ...deletes.map((d): Op => ({ kind: 'del', col: d.col, id: d.id })),
            ];
            for (let i = 0; i < ops.length; i += 400) {
              const batch = adminDb.batch();
              for (const op of ops.slice(i, i + 400)) {
                if (op.kind === 'set') batch.set(adminDb.collection(op.doc.col).doc(op.doc.id), op.doc.data);
                else batch.delete(adminDb.collection(op.col).doc(op.id));
              }
              await batch.commit();
            }
          },
        };
      } catch (adminErr) {
        log(`[PERSISTÊNCIA] firebase-admin indisponível, alternando para Firebase Client SDK...`);
      }
    }

    // 2. Conecta via Firebase Client SDK autenticado (sempre funcional, conectado diretamente à nuvem)
    const clientStore = await createClientSdkStore({ ...cfg, projectId: projectIdClean, firestoreDatabaseId: databaseIdClean }, log);
    if (clientStore) {
      lastConnectError = '';
      return clientStore;
    }

    lastConnectError = 'Não foi possível conectar ao Firestore.';
    return null;
  } catch (err) {
    lastConnectError = String(err instanceof Error ? err.message : err).replace(/\s+/g, ' ').slice(0, 300);
    console.error('[PERSISTÊNCIA] Erro geral ao inicializar Firestore:', err);
    return null;
  }
}

// Instância única usada pelo server.ts
export function shutdownHook(p: Persistence) {
  let done = false;
  const handler = async (sig: string) => {
    if (done) return;
    done = true;
    try {
      await p.flushNow();
    } catch {
      /* já registrado */
    }
    process.exit(sig === 'SIGINT' ? 130 : 0);
  };
  process.on('SIGTERM', () => handler('SIGTERM'));
  process.on('SIGINT', () => handler('SIGINT'));
}
