import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { LEARNING_MODULES } from './src/data/lessonsData';
import { LIBRAS_SIGNS } from './src/data/signsData';
import { MYSTERY_CHESTS, MASCOT_ITEMS, COMPANION_MASCOTS, PRESTIGE_TITLES, NAME_COLORS, SPECIAL_TRACKS, PREMIUM_POWERUPS } from './src/data/shopCatalogData';
import { LearningModule, LibrasSign, MysteryChest, MediaItem, PromoCode, SystemAnnouncement, AdminAuditLog, Lesson, UserFeedback } from './src/types/libras';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(__dirname, 'sync_data.json');
const ADMIN_STATE_FILE = path.join(__dirname, 'admin_state.json');

app.set('trust proxy', 1);
app.use(express.json({ limit: '15mb' }));

// -------------------------------------------------------------
// USER PROGRESS DATABASE (SHARED JSON DATABASE)
// -------------------------------------------------------------
function readSyncDb(): Record<string, any> {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading sync DB:', err);
  }
  return {};
}

function writeSyncDb(data: Record<string, any>) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing sync DB:', err);
  }
}


// === USER-KEY BEGIN ===
// -------------------------------------------------------------
// CHAVE SECRETA POR ALUNO, PREÇOS NO SERVIDOR E LIMITES DE SALVAMENTO
// -------------------------------------------------------------
const MAX_DEVICE_KEYS = 5;
const PLACEHOLDER_SYNC_CODES = new Set(['LIB-9999', 'LIB-7294', 'LIB-0000']);

// Ajuste estes números se alunos legítimos forem barrados (ver LEIA-ME).
const STAT_LIMITS = {
  newAccount: { gems: 20000, xp: 50000, streak: 400 }, // conta nova ou restaurada de backup local
  initialCredit: { gems: 4000, xp: 4000 },              // quanto um aluno pode ganhar "de uma vez"
  creditPerHour: { gems: 150, xp: 150 },                // e quanto esse crédito recarrega por hora
  maxCredit: { gems: 20000, xp: 20000 },
  maxLevel: 200,
};

function hashUserKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function readUserKey(req: Request): string {
  return String(req.headers['x-user-key'] || '').trim().slice(0, 200);
}

function recordKeyMatches(record: any, key: string): boolean {
  if (!key || !record || !Array.isArray(record.authKeyHashes)) return false;
  const given = Buffer.from(hashUserKey(key), 'hex');
  return record.authKeyHashes.some((h: string) => {
    try {
      const stored = Buffer.from(String(h), 'hex');
      return stored.length === given.length && crypto.timingSafeEqual(stored, given);
    } catch {
      return false;
    }
  });
}

function issueUserKey(record: any): string {
  const key = crypto.randomBytes(24).toString('hex');
  const hashes: string[] = Array.isArray(record.authKeyHashes) ? record.authKeyHashes : [];
  record.authKeyHashes = [...hashes, hashUserKey(key)].slice(-MAX_DEVICE_KEYS);
  return key;
}

function normalizeAccountKeys(username?: unknown, syncCode?: unknown): string[] {
  const keys: string[] = [];
  const u = typeof username === 'string' ? username.trim() : '';
  const c = typeof syncCode === 'string' ? syncCode.toUpperCase().trim() : '';
  if (c && !PLACEHOLDER_SYNC_CODES.has(c)) keys.push(c);
  if (u) keys.push(`USER_${u.toLowerCase()}`);
  return keys;
}

type AuthResult =
  | { ok: true; keys: string[]; records: any[]; hashes: string[] }
  | { ok: false; status: number; message: string };

/**
 * Contas com chave exigem o header X-User-Key. Contas antigas (sem chave) e contas novas
 * passam, e recebem a chave na primeira gravação (finalizeUserKey).
 */
function authorizeUser(req: Request, db: Record<string, any>, username: unknown, syncCode: unknown): AuthResult {
  if (isArchivedBlockedIdentity(username, syncCode)) {
    return { ok: false, status: 403, message: 'Esta conta foi arquivada e está bloqueada. Entre em contato com a administração.' };
  }
  if (isAutomatedAccountName(username)) {
    return { ok: false, status: 400, message: 'Contas automáticas ou perfis de IA não podem acessar como alunos.' };
  }
  const keys = normalizeAccountKeys(username, syncCode).filter((k) => db[k]);
  const records = keys.map((k) => db[k]);
  const protectedRecords = records.filter((r) => Array.isArray(r.authKeyHashes) && r.authKeyHashes.length > 0);
  const key = readUserKey(req);
  if (protectedRecords.length > 0 && !protectedRecords.every((r) => recordKeyMatches(r, key))) {
    return {
      ok: false,
      status: 403,
      message: 'Esta conta é protegida. Restaure-a neste dispositivo com o seu Código de Sincronização (Perfil > Restaurar).',
    };
  }
  const hashes = Array.from(new Set(records.flatMap((r) => (Array.isArray(r.authKeyHashes) ? r.authKeyHashes : []))));
  return { ok: true, keys, records, hashes };
}

/** Une as chaves de todos os apelidos da conta e, se ainda não houver nenhuma, emite a primeira. */
function finalizeUserKey(db: Record<string, any>, keys: string[], primary: any, priorHashes: string[]): string | undefined {
  const all = new Set<string>(priorHashes);
  for (const k of keys) for (const h of db[k]?.authKeyHashes || []) all.add(h);
  for (const h of primary.authKeyHashes || []) all.add(h);
  primary.authKeyHashes = Array.from(all).slice(-MAX_DEVICE_KEYS);
  let issued: string | undefined;
  if (primary.authKeyHashes.length === 0) issued = issueUserKey(primary);
  for (const k of keys) {
    if (db[k] && db[k] !== primary) db[k].authKeyHashes = [...primary.authKeyHashes];
  }
  return issued;
}

type StatsCheck =
  | { ok: true; stats: any; credit: { gems: number; xp: number; at: string }; streakBumpAt?: string }
  | { ok: false; message: string };

/** Valida o que o app enviou contra o que o servidor já sabe. Ganhos grandes demais são recusados. */
function checkStatsChange(prevRecord: any, incoming: any, now: number): StatsCheck {
  const next: any = { ...(incoming && typeof incoming === 'object' ? incoming : {}) };
  const prev = prevRecord?.userStats || null;
  const nowIso = new Date(now).toISOString();

  for (const f of ['gems', 'xp', 'level', 'streak']) {
    if (f in next) {
      const n = Number(next[f]);
      if (!Number.isFinite(n) || n < 0) return { ok: false, message: `Valor inválido em "${f}".` };
      next[f] = Math.floor(n);
    }
  }
  if (next.level !== undefined && next.level > STAT_LIMITS.maxLevel) {
    return { ok: false, message: 'Nível acima do permitido.' };
  }

  if (!prev) {
    const n = STAT_LIMITS.newAccount;
    if ((next.gems ?? 0) > n.gems || (next.xp ?? 0) > n.xp || (next.streak ?? 0) > n.streak) {
      return { ok: false, message: 'Valores iniciais da conta acima do permitido.' };
    }
    return { ok: true, stats: next, credit: { gems: STAT_LIMITS.initialCredit.gems, xp: STAT_LIMITS.initialCredit.xp, at: nowIso } };
  }

  const prevCredit = prevRecord.gainCredit;
  const creditAt = Date.parse(prevCredit?.at || '') || Date.parse(prevRecord.updatedAt || '') || now;
  const hours = Math.min(Math.max((now - creditAt) / 3.6e6, 0), 24 * 30);
  const credit = { gems: 0, xp: 0 };
  for (const f of ['gems', 'xp'] as const) {
    const base = prevCredit && Number.isFinite(Number(prevCredit[f])) ? Number(prevCredit[f]) : STAT_LIMITS.initialCredit[f];
    const available = Math.min(STAT_LIMITS.maxCredit[f], base + STAT_LIMITS.creditPerHour[f] * hours);
    const before = Number(prev[f]) || 0;
    const after = next[f] === undefined ? before : next[f];
    const gain = after - before;
    if (gain > available) {
      return { ok: false, message: `Ganho de ${f === 'gems' ? 'diamantes' : 'XP'} acima do permitido para este período.` };
    }
    credit[f] = available - Math.max(0, gain);
  }

  // Ofensiva: sobe no máximo 1 por dia (com folga de 12h). O excesso é cortado, sem recusar o resto do salvamento.
  let streakBumpAt: string | undefined;
  const prevStreak = Number(prev.streak) || 0;
  if (next.streak !== undefined && next.streak > prevStreak) {
    const bumpAt = Date.parse(prevRecord.streakBumpAt || '') || now - 2 * 8.64e7;
    const allowed = Math.floor((now - bumpAt + 4.32e7) / 8.64e7);
    if (next.streak - prevStreak > allowed) next.streak = prevStreak + allowed;
    if (next.streak > prevStreak) streakBumpAt = nowIso;
  }

  // O bônus diário é controlado pelo servidor: o app não pode "voltar" essa data para resgatar de novo.
  if (prev.lastDailyRewardDate && (!next.lastDailyRewardDate || String(next.lastDailyRewardDate) < String(prev.lastDailyRewardDate))) {
    next.lastDailyRewardDate = prev.lastDailyRewardDate;
  }

  return { ok: true, stats: next, credit: { gems: credit.gems, xp: credit.xp, at: nowIso }, streakBumpAt };
}

function makeLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    limited(id: string): boolean {
      const e = hits.get(id);
      return !!e && e.resetAt > Date.now() && e.count >= max;
    },
    hit(id: string) {
      const now = Date.now();
      const e = hits.get(id);
      if (!e || e.resetAt <= now) hits.set(id, { count: 1, resetAt: now + windowMs });
      else e.count += 1;
    },
  };
}

const restoreLimiter = makeLimiter(20, 15 * 60 * 1000);
const lastRejectLog = new Map<string, number>();

function randomSyncCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = 'LIB-';
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

/** Preço e nome oficiais do item: o servidor nunca usa o custo enviado pelo app. */
function getCatalogItem(category: string, itemId: string): { cost: number; name: string } | null {
  const pick = (list: any[], nameKey: string) => {
    const it = list.find((x) => x.id === itemId);
    if (!it) return null;
    const cost = Number(it.cost);
    return Number.isFinite(cost) && cost >= 0 ? { cost, name: String(it[nameKey] ?? itemId) } : null;
  };
  switch (category) {
    case 'accessory': return pick(MASCOT_ITEMS as any[], 'name');
    case 'companion': return pick(COMPANION_MASCOTS as any[], 'name');
    case 'title': return pick(PRESTIGE_TITLES as any[], 'title');
    case 'name_color': return pick(NAME_COLORS as any[], 'name');
    case 'special_track': return pick(SPECIAL_TRACKS as any[], 'title');
    case 'chest': {
      const base = (MYSTERY_CHESTS as any[]).find((c) => c.id === itemId);
      if (!base) return null;
      const ov: any = readAdminState().chestOverrides?.[itemId];
      const cost = Number(ov?.cost ?? base.cost);
      return Number.isFinite(cost) && cost >= 0 ? { cost, name: String(ov?.name ?? base.name) } : null;
    }
    case 'hearts_refill':
    case 'heart_shield':
    case 'xp_boost':
    case 'streak_freeze': {
      const pu = (PREMIUM_POWERUPS as any[]).find((x) => x.id === category);
      return pu ? { cost: Number(pu.cost), name: String(pu.title) } : null;
    }
    default:
      return null;
  }
}
// === USER-KEY END ===

// === ANTI-BOT BEGIN ===
// -------------------------------------------------------------
// BLOQUEIO DE CONTAS FALSAS (ROBÔS / IA) NO CADASTRO
// Conta nova só nasce com um "passe" de verificação humana, de uso único.
// Verificação: Cloudflare Turnstile (se TURNSTILE_SECRET_KEY e TURNSTILE_SITE_KEY existirem)
// ou, sem isso, uma pergunta simples + armadilha invisível + tempo mínimo + limite por IP.
// -------------------------------------------------------------
const SIGNUP_SECRET = process.env.SIGNUP_SECRET || crypto.randomBytes(32).toString('hex');
const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const PASS_TTL_MS = 30 * 60 * 1000;
const MIN_FILL_MS = 2500;
const SIGNUP_LIMITS = { newAccountsPerIpPerHour: 8, failedChecksPer10Min: 12, challengesPer10Min: 60 };
const usedSignupNonces = new Map<string, number>();

const challengeLimiter = makeLimiter(SIGNUP_LIMITS.challengesPer10Min, 10 * 60 * 1000);
const failedCheckLimiter = makeLimiter(SIGNUP_LIMITS.failedChecksPer10Min, 10 * 60 * 1000);
const newAccountLimiter = makeLimiter(SIGNUP_LIMITS.newAccountsPerIpPerHour, 60 * 60 * 1000);
const lastSignupAlert = new Map<string, number>();

function b64u(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64url');
}
function signToken(payload: Record<string, any>): string {
  const body = b64u(JSON.stringify(payload));
  const mac = crypto.createHmac('sha256', SIGNUP_SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}
function readToken(token: unknown): Record<string, any> | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', SIGNUP_SECRET).update(body).digest('base64url');
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    return p && typeof p === 'object' && Number(p.exp) > Date.now() ? p : null;
  } catch {
    return null;
  }
}
function pruneNonces() {
  const now = Date.now();
  for (const [n, exp] of usedSignupNonces) if (exp < now) usedSignupNonces.delete(n);
}
function ipHashOf(req: Request): string {
  return crypto.createHash('sha256').update(`${SIGNUP_SECRET}|${req.ip || 'unknown'}`).digest('hex').slice(0, 16);
}
function alertOnce(key: string, action: string, details: string) {
  const last = lastSignupAlert.get(key) || 0;
  if (Date.now() - last > 30 * 60 * 1000) {
    lastSignupAlert.set(key, Date.now());
    logAdminAction(action, details, 'Sistema');
  }
}

/** Nomes que parecem de robô, IA, spam ou link. Usado no cadastro e na lista de suspeitas (não esconde ninguém). */
function looksAutomatedName(username: unknown): boolean {
  const n = normalizeString(String(username || ''));
  if (!n) return false;
  if (/https?:|www\.|\.(com|net|org|br|io|xyz|ru)\b|@/.test(n)) return true;
  if (/(^|[^a-z])(bot|robo|chatgpt|gpt|gemini|claude|copilot|assistant|assistente|agente|crawler|scraper)([^a-z]|$)/.test(n)) return true;
  if (/^(user|usuario|aluno|test|teste|player|guest|visitante)[\s_-]?\d{3,}$/.test(n)) return true;
  if (/^[^a-z]+$/.test(n) && n.length > 0) return true; // só símbolos/números
  return false;
}

async function checkTurnstile(token: string, req: Request): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token || token.length > 2100) return false;
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: req.ip || '' });
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
    const j: any = await r.json();
    return !!j?.success;
  } catch {
    return false;
  }
}

type SignupGate = { ok: true; consume: () => void } | { ok: false; status: number; code: string; message: string };

/** Chamado quando /api/sync/save vai CRIAR uma conta. */
function checkSignupGate(req: Request, username: unknown): SignupGate {
  const ip = req.ip || 'unknown';
  if (looksAutomatedName(username)) {
    alertOnce(`name:${ip}`, 'Cadastro Bloqueado', `Nome com cara de robô/IA recusado: "${String(username).slice(0, 40)}".`);
    return { ok: false, status: 400, code: 'NAME_BLOCKED', message: 'Escolha outro nome ou apelido. Nomes de robôs, links ou só números/símbolos não são aceitos.' };
  }
  if (newAccountLimiter.limited(ip)) {
    alertOnce(`rate:${ip}`, 'Cadastro Bloqueado', `Muitas contas novas seguidas vindas da mesma rede (limite ${SIGNUP_LIMITS.newAccountsPerIpPerHour}/hora). Último nome: "${String(username).slice(0, 40)}".`);
    return { ok: false, status: 429, code: 'SIGNUP_RATE', message: 'Muitos cadastros desta rede em pouco tempo. Tente novamente mais tarde.' };
  }
  const pass = readToken(req.headers['x-signup-pass']);
  pruneNonces();
  if (!pass || pass.t !== 'pass' || typeof pass.n !== 'string' || usedSignupNonces.has(pass.n)) {
    return { ok: false, status: 428, code: 'SIGNUP_CHECK_REQUIRED', message: 'Confirme que você é uma pessoa para criar a conta.' };
  }
  return {
    ok: true,
    consume: () => {
      usedSignupNonces.set(pass.n, pass.exp);
      newAccountLimiter.hit(ip);
    },
  };
}
// === ANTI-BOT END ===

// -------------------------------------------------------------
// ADMIN STATE & SHARED APPLICATION CONTENT PERSISTENCE
// -------------------------------------------------------------
interface AdminStateData {
  adminCredentials: { username: string; passwordHash: string };
  mediaItems: MediaItem[];
  customModules: LearningModule[];
  moduleOverrides: Record<string, {
    enabled?: boolean;
    customTitle?: string;
    customSubtitle?: string;
    customDescription?: string;
    customTheme?: string;
    customIcon?: string;
    level?: number;
    lessons?: Lesson[];
  }>;
  deletedModuleIds: string[];
  customSigns: LibrasSign[];
  editedSigns: Record<string, Partial<LibrasSign>>;
  deletedSignIds: string[];
  chestOverrides: Record<string, Partial<MysteryChest>>;
  promoCodes: PromoCode[];
  announcements: SystemAnnouncement[];
  auditLogs: AdminAuditLog[];
  feedbacks: UserFeedback[];
  lastContentVersion: number;
  lastUpdatedAt: string;
}

const DEFAULT_ADMIN_STATE: AdminStateData = {
  adminCredentials: {
    username: 'admin',
    // Preenchido na inicialização (ver ensureAdminCredentials): nunca guardar senha em texto puro.
    passwordHash: '',
  },
  mediaItems: [
    {
      id: 'media_yt_alfabeto',
      title: 'Alfabeto Completo em Libras (A a Z)',
      category: 'video',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      description: 'Vídeo oficial demonstrando os 26 sinais do alfabeto dactilológico com postura e articulação correta.',
      tags: ['alfabeto', 'datilologia', 'iniciante'],
      createdAt: new Date().toISOString(),
      isCustom: false,
    },
    {
      id: 'media_yt_saudacoes',
      title: 'Saudações e Expressões Cotidianas',
      category: 'video',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      description: 'Como cumprimentar, agradecer e se despedir usando expressão facial adequada.',
      tags: ['saudações', 'bom-dia', 'obrigado'],
      createdAt: new Date().toISOString(),
      isCustom: false,
    },
    {
      id: 'media_img_pose_a',
      title: 'Ilustração Vetorial: Configuração Mão em A',
      category: 'image',
      url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
      description: 'Diagrama anatômico dos dedos recolhidos com polegar lateral.',
      tags: ['anatomia', 'mao', 'letra_a'],
      createdAt: new Date().toISOString(),
      isCustom: false,
    },
  ],
  customModules: [],
  moduleOverrides: {},
  deletedModuleIds: [],
  customSigns: [],
  editedSigns: {},
  deletedSignIds: [],
  chestOverrides: {},
  promoCodes: [
    {
      id: 'promo_1',
      code: 'LIBRAS2026',
      rewardGems: 250,
      rewardXp: 150,
      rewardHearts: 5,
      rewardChests: 1,
      maxUses: 1000,
      usedCount: 15,
      active: true,
      expiresAt: '2026-12-31T23:59:59.000Z',
      redeemedUsers: [],
      createdAt: new Date().toISOString(),
      createdBy: 'Administração LibrasGo',
      description: 'Código oficial de boas-vindas com Diamantes, XP e 1 Baú Misterioso!',
    },
    {
      id: 'promo_2',
      code: 'MESTRE',
      rewardGems: 500,
      rewardXp: 300,
      rewardHearts: 5,
      rewardChests: 2,
      maxUses: 500,
      usedCount: 42,
      active: true,
      expiresAt: '2026-12-31T23:59:59.000Z',
      redeemedUsers: [],
      createdAt: new Date().toISOString(),
      createdBy: 'Administração LibrasGo',
      description: 'Bônus especial de dedicação aos estudos da Libras com Baús Raros.',
    },
    {
      id: 'promo_3',
      code: 'BAUMAGICO',
      rewardGems: 150,
      rewardXp: 200,
      rewardHearts: 5,
      rewardChests: 3,
      maxUses: 300,
      usedCount: 8,
      active: true,
      expiresAt: '2026-12-31T23:59:59.000Z',
      redeemedUsers: [],
      createdAt: new Date().toISOString(),
      createdBy: 'Administração LibrasGo',
      description: 'Pacote triplo de Baús Misteriosos para destrancar itens na Loja!',
    },
  ],
  announcements: [
    {
      id: 'ann_1',
      title: '🎉 Bem-vindo ao LibrasGo Atualizado!',
      message: 'Novas lições interativas, baús misteriosos com títulos exclusivos, câmera AR e sincronização compartilhada em tempo real!',
      type: 'celebration',
      active: true,
      createdAt: new Date().toISOString(),
      ctaText: 'Ver Trilha',
      ctaTab: 'path',
    },
  ],
  auditLogs: [
    {
      id: 'log_init',
      timestamp: new Date().toISOString(),
      action: 'Sistema Inicializado',
      details: 'Serviço de administração configurado com sincronização em nuvem compartilhada.',
      adminName: 'Sistema',
    },
  ],
  feedbacks: [],
  lastContentVersion: Date.now(),
  lastUpdatedAt: new Date().toISOString(),
};

function readAdminState(): AdminStateData {
  try {
    if (fs.existsSync(ADMIN_STATE_FILE)) {
      const raw = fs.readFileSync(ADMIN_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_ADMIN_STATE,
        ...parsed,
        mediaItems: parsed.mediaItems || DEFAULT_ADMIN_STATE.mediaItems,
        customModules: parsed.customModules || [],
        moduleOverrides: parsed.moduleOverrides || {},
        deletedModuleIds: parsed.deletedModuleIds || [],
        customSigns: parsed.customSigns || [],
        editedSigns: parsed.editedSigns || {},
        deletedSignIds: parsed.deletedSignIds || [],
        chestOverrides: parsed.chestOverrides || {},
        promoCodes: parsed.promoCodes || DEFAULT_ADMIN_STATE.promoCodes,
        announcements: parsed.announcements || DEFAULT_ADMIN_STATE.announcements,
        auditLogs: parsed.auditLogs || DEFAULT_ADMIN_STATE.auditLogs,
        feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : [],
        lastContentVersion: parsed.lastContentVersion || Date.now(),
        lastUpdatedAt: parsed.lastUpdatedAt || new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Error reading admin state:', err);
  }
  return DEFAULT_ADMIN_STATE;
}

function writeAdminState(data: AdminStateData) {
  try {
    data.lastContentVersion = Date.now();
    data.lastUpdatedAt = new Date().toISOString();
    fs.writeFileSync(ADMIN_STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing admin state:', err);
  }
}


// -------------------------------------------------------------
// ADMIN AUTH: senha com hash (scrypt), sessões com token e limite de tentativas
// -------------------------------------------------------------
const ADMIN_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_ADMIN_PASSWORD_LENGTH = 8;

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (typeof stored !== 'string' || !stored.startsWith('scrypt$')) return false;
  const [, salt, hashHex] = stored.split('$');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/**
 * Garante que a conta admin tenha senha com hash.
 * - Se ADMIN_PASSWORD estiver definida no ambiente, ela passa a ser a senha do admin.
 * - Se a senha salva ainda estiver em texto puro (versão antiga) ou vazia, gera uma senha
 *   aleatória, salva só o hash e mostra a senha UMA vez no log do servidor.
 */
function ensureAdminCredentials() {
  console.log(`[ADMIN] ADMIN_PASSWORD no ambiente: ${process.env.ADMIN_PASSWORD ? 'SIM' : 'NÃO'}`);
  const state = readAdminState();
  const stored = state.adminCredentials?.passwordHash || '';
  const envPassword = (process.env.ADMIN_PASSWORD || '').trim();

  if (envPassword) {
    if (envPassword.length < MIN_ADMIN_PASSWORD_LENGTH) {
      console.error(`[ADMIN] ADMIN_PASSWORD precisa ter pelo menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres. Ignorada.`);
    } else if (!verifyPassword(envPassword, stored)) {
      state.adminCredentials = { username: state.adminCredentials?.username || 'admin', passwordHash: hashPassword(envPassword) };
      writeAdminState(state);
      console.log('[ADMIN] Senha do administrador definida a partir de ADMIN_PASSWORD.');
      return;
    } else {
      console.log('[ADMIN] Senha do administrador definida a partir de ADMIN_PASSWORD.');
      return;
    }
  }

  if (!stored.startsWith('scrypt$')) {
    const generated = crypto.randomBytes(12).toString('base64url');
    state.adminCredentials = { username: state.adminCredentials?.username || 'admin', passwordHash: hashPassword(generated) };
    writeAdminState(state);
    console.log('==================================================================');
    console.log('[ADMIN] Senha antiga em texto puro removida.');
    console.log(`[ADMIN] Usuário: ${state.adminCredentials.username}`);
    console.log(`[ADMIN] Nova senha temporária: ${generated}`);
    console.log('[ADMIN] Anote agora (não será mostrada de novo) e troque no painel,');
    console.log('[ADMIN] ou defina a variável ADMIN_PASSWORD para escolher a sua.');
    console.log('==================================================================');
  }
}

interface AdminSessionRecord {
  token: string;
  username: string;
  role: 'admin';
  loggedInAt: string;
  expiresAt: string;
  permissions: string[];
}

const adminSessions = new Map<string, AdminSessionRecord>();

function pruneAdminSessions() {
  const now = Date.now();
  for (const [token, session] of adminSessions) {
    if (new Date(session.expiresAt).getTime() <= now) adminSessions.delete(token);
  }
}

function getBearerToken(req: Request): string {
  const header = String(req.headers['authorization'] || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function requireAdmin(req: Request, res: Response, next: () => void) {
  pruneAdminSessions();
  const token = getBearerToken(req);
  const session = token ? adminSessions.get(token) : undefined;
  if (!session) {
    return res.status(401).json({ success: false, message: 'Sessão de administrador inválida ou expirada. Faça login novamente.' });
  }
  (req as any).adminSession = session;
  next();
}

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

function loginRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) return false;
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function registerFailedLogin(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function logAdminAction(action: string, details: string, adminName: string = 'Administrador') {
  const state = readAdminState();
  state.auditLogs = state.auditLogs || [];
  state.auditLogs.unshift({
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    action,
    details,
    adminName,
  });
  if (state.auditLogs.length > 100) {
    state.auditLogs = state.auditLogs.slice(0, 100);
  }
  writeAdminState(state);
}

// -------------------------------------------------------------
// COMPUTE SYNCHRONIZED SHARED CONTENT
// Merges hardcoded defaults with admin overrides, custom additions & deletions
// -------------------------------------------------------------
function computeSharedContent(state: AdminStateData) {
  // 1. Modules & Activities
  const baseModules: LearningModule[] = JSON.parse(JSON.stringify(LEARNING_MODULES));
  const deletedModSet = new Set(state.deletedModuleIds || []);

  let mergedModules: LearningModule[] = baseModules
    .filter((m) => !deletedModSet.has(m.id))
    .map((m) => {
      const override = state.moduleOverrides?.[m.id];
      if (!override) return { ...m, enabled: true };
      return {
        ...m,
        title: override.customTitle ?? m.title,
        subtitle: override.customSubtitle ?? m.subtitle,
        description: override.customDescription ?? m.description,
        themeColor: override.customTheme ?? m.themeColor,
        icon: override.customIcon ?? m.icon,
        level: override.level ?? m.level,
        enabled: override.enabled !== false,
        lessons: override.lessons ?? m.lessons,
      };
    });

  if (Array.isArray(state.customModules)) {
    const custom = state.customModules.filter((m) => !deletedModSet.has(m.id));
    mergedModules = [...mergedModules, ...custom];
  }

  // 2. Signs
  const baseSigns: LibrasSign[] = JSON.parse(JSON.stringify(LIBRAS_SIGNS));
  const deletedSignSet = new Set(state.deletedSignIds || []);

  let mergedSigns: LibrasSign[] = baseSigns
    .filter((s) => !deletedSignSet.has(s.id))
    .map((s) => {
      const edit = state.editedSigns?.[s.id];
      if (!edit) return s;
      return { ...s, ...edit };
    });

  if (Array.isArray(state.customSigns)) {
    const custom = state.customSigns.filter((s) => !deletedSignSet.has(s.id));
    mergedSigns = [...custom, ...mergedSigns];
  }

  // 3. Mystery Chests
  const baseChests: MysteryChest[] = JSON.parse(JSON.stringify(MYSTERY_CHESTS));
  const mergedChests: MysteryChest[] = baseChests.map((c) => {
    const override = state.chestOverrides?.[c.id];
    if (!override) return c;
    return { ...c, ...override };
  });

  return {
    version: state.lastContentVersion || 1,
    updatedAt: state.lastUpdatedAt || new Date().toISOString(),
    modules: mergedModules,
    signs: mergedSigns,
    chests: mergedChests,
    media: state.mediaItems || [],
    announcements: (state.announcements || []).filter((a) => a.active),
    allAnnouncements: state.announcements || [],
  };
}

// -------------------------------------------------------------
// PUBLIC SHARED CONTENT SYNC (CROSS-DEVICE: MOBILE, TABLET, PC)
// -------------------------------------------------------------
app.get('/api/content/shared', (_req: Request, res: Response) => {
  try {
    const state = readAdminState();
    const shared = computeSharedContent(state);
    res.json({
      success: true,
      ...shared,
    });
  } catch (err: any) {
    console.error('Error serving shared content:', err);
    res.status(500).json({ success: false, error: 'Falha ao sincronizar conteúdos compartilhados do servidor.' });
  }
});

// Quick version check endpoint for lightweight polling
app.get('/api/content/version', (_req: Request, res: Response) => {
  const state = readAdminState();
  res.json({
    success: true,
    version: state.lastContentVersion || 1,
    updatedAt: state.lastUpdatedAt || new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// INDIVIDUAL USER PROGRESS SYNC
// -------------------------------------------------------------
// === ANTI-BOT ROUTES BEGIN ===
app.get('/api/signup/challenge', (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  if (challengeLimiter.limited(ip)) {
    return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde alguns minutos.' });
  }
  challengeLimiter.hit(ip);
  const now = Date.now();
  const siteKey = process.env.TURNSTILE_SITE_KEY;
  if (siteKey && process.env.TURNSTILE_SECRET_KEY) {
    return res.json({ success: true, mode: 'turnstile', siteKey, token: signToken({ t: 'ch', ts: now, exp: now + CHALLENGE_TTL_MS, n: crypto.randomBytes(8).toString('hex') }) });
  }
  const a = crypto.randomInt(3, 15);
  const b = crypto.randomInt(2, 10);
  const op = crypto.randomInt(0, 2) === 0 ? '+' : '-';
  const answer = op === '+' ? a + b : a - b;
  const answerHash = crypto.createHmac('sha256', SIGNUP_SECRET).update(`ans|${answer}`).digest('hex').slice(0, 24);
  return res.json({
    success: true,
    mode: 'math',
    question: `Quanto é ${a} ${op === '+' ? 'mais' : 'menos'} ${b}?`,
    token: signToken({ t: 'ch', ts: now, exp: now + CHALLENGE_TTL_MS, n: crypto.randomBytes(8).toString('hex'), h: answerHash }),
  });
});

app.post('/api/signup/verify', async (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  const fail = (status: number, message: string) => {
    failedCheckLimiter.hit(ip);
    return res.status(status).json({ success: false, message });
  };
  if (failedCheckLimiter.limited(ip)) {
    alertOnce(`verify:${ip}`, 'Cadastro Bloqueado', 'Muitas verificações humanas falhas seguidas vindas da mesma rede (possível robô).');
    return res.status(429).json({ success: false, message: 'Muitas tentativas erradas. Aguarde alguns minutos.' });
  }
  const { token, answer, turnstileToken, hp } = req.body || {};
  const ch = readToken(token);
  if (!ch || ch.t !== 'ch') return fail(400, 'A verificação expirou. Tente de novo.');
  pruneNonces();
  if (usedSignupNonces.has(ch.n)) return fail(400, 'Esta verificação já foi usada. Tente de novo.');
  if (typeof hp === 'string' && hp.trim() !== '') return fail(400, 'Não foi possível confirmar. Tente de novo.');
  if (Date.now() - Number(ch.ts) < MIN_FILL_MS) return fail(400, 'Calma! Leia a pergunta com atenção e tente de novo.');

  if (ch.h) {
    const given = crypto.createHmac('sha256', SIGNUP_SECRET).update(`ans|${String(answer ?? '').trim()}`).digest('hex').slice(0, 24);
    if (given !== ch.h) return fail(400, 'Resposta incorreta. Tente de novo.');
  } else if (!(await checkTurnstile(String(turnstileToken || ''), req))) {
    return fail(400, 'Não foi possível confirmar. Tente de novo.');
  }

  usedSignupNonces.set(ch.n, ch.exp);
  const now = Date.now();
  const passNonce = crypto.randomBytes(12).toString('hex');
  res.json({ success: true, pass: signToken({ t: 'pass', n: passNonce, exp: now + PASS_TTL_MS }) });
});
// === ANTI-BOT ROUTES END ===

app.get('/api/sync/generate-code', (_req: Request, res: Response) => {
  const db = readSyncDb();
  let code = randomSyncCode();
  while (db[code]) code = randomSyncCode();
  res.json({ success: true, syncCode: code });
});

app.post('/api/sync/save', (req: Request, res: Response) => {
  const { syncCode, username, userStats, missions } = req.body || {};
  if (!syncCode && !username) {
    return res.status(400).json({ error: 'Código de sincronização ou nome de usuário é obrigatório.' });
  }
  if (isArchivedBlockedIdentity(username, syncCode)) {
    return res.status(403).json({ success: false, code: 'ACCOUNT_ARCHIVED', message: 'Esta conta foi arquivada e está bloqueada.' });
  }
  if (isAutomatedAccountName(username)) {
    return res.status(400).json({ success: false, code: 'AI_PROFILE_BLOCKED', message: 'Não é permitido criar perfis automáticos ou de IA como alunos.' });
  }

  const db = readSyncDb();
  const rawCode = (syncCode || '').toString().toUpperCase().trim();
  const codeKey = rawCode && !PLACEHOLDER_SYNC_CODES.has(rawCode) ? rawCode : '';
  const userKey = username ? `USER_${String(username).toLowerCase().trim()}` : null;

  const auth = authorizeUser(req, db, username, syncCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  // Retrieve any existing taught signs so they are never lost on sync
  // A conta existe em duas cópias (pelo código e pelo nome). Vale a mais recente.
  const existingRecord =
    ([codeKey && db[codeKey], userKey && db[userKey]].filter(Boolean) as any[])
      .sort((a, b) => (Date.parse(b.updatedAt || '') || 0) - (Date.parse(a.updatedAt || '') || 0))[0] || null;
  const existingSigns = existingRecord?.taughtSigns || [];
  const existingFacial = existingRecord?.taughtFacialExpressions || [];

  const check = checkStatsChange(existingRecord, userStats, Date.now());
  if (!check.ok) {
    const who = String(username || codeKey || 'desconhecido').slice(0, 40);
    const last = lastRejectLog.get(who) || 0;
    if (Date.now() - last > 30 * 60 * 1000) {
      lastRejectLog.set(who, Date.now());
      logAdminAction('Salvamento Recusado', `Alteração suspeita de "${who}": ${check.message}`, 'Sistema');
    }
    return res.status(422).json({ success: false, code: 'STATS_REJECTED', message: check.message });
  }

  const nowIso = new Date().toISOString();
  const isNewUser = (!codeKey || !db[codeKey]) && (!userKey || !db[userKey]);

  // Conta nova exige verificação humana (exceto o perfil padrão oculto, que nunca aparece para ninguém).
  const gate: SignupGate | null =
    isNewUser && String(username || '').trim() !== 'Você (Aprendiz)' ? checkSignupGate(req, username) : null;
  if (gate && !gate.ok) {
    return res.status(gate.status).json({ success: false, code: gate.code, message: gate.message });
  }
  const createdAt = existingRecord?.createdAt || existingRecord?.userStats?.createdAt || (isNewUser ? nowIso : existingRecord?.updatedAt || nowIso);

  const mergedStats = {
    ...check.stats,
    createdAt: check.stats?.createdAt || createdAt,
  };

  const payload: any = {
    syncCode: codeKey,
    username: (username || '').trim(),
    userStats: mergedStats,
    missions,
    taughtSigns: existingSigns,
    taughtFacialExpressions: existingFacial,
    createdAt,
    updatedAt: nowIso,
    gainCredit: check.credit,
    streakBumpAt: check.streakBumpAt || existingRecord?.streakBumpAt,
    authKeyHashes: existingRecord?.authKeyHashes || [],
    signupIpHash: isNewUser ? ipHashOf(req) : existingRecord?.signupIpHash,
    signupAt: isNewUser ? nowIso : existingRecord?.signupAt,
  };

  if (codeKey) {
    db[codeKey] = {
      ...payload,
      taughtSigns: db[codeKey]?.taughtSigns || existingSigns,
      taughtFacialExpressions: db[codeKey]?.taughtFacialExpressions || existingFacial,
    };
  }
  if (userKey) {
    db[userKey] = {
      ...payload,
      taughtSigns: db[userKey]?.taughtSigns || existingSigns,
      taughtFacialExpressions: db[userKey]?.taughtFacialExpressions || existingFacial,
    };
  }

  const savedKeys = [codeKey, userKey].filter(Boolean) as string[];
  const issuedKey = finalizeUserKey(db, savedKeys, db[savedKeys[0]], auth.hashes);

  writeSyncDb(db);
  if (gate && gate.ok) gate.consume();

  if (isNewUser && username && username !== 'Você (Aprendiz)') {
    logAdminAction('Novo Aluno Registrado', `Novo estudante cadastrado no sistema: "${username}" com código ${codeKey}`);
  }

  res.json({ success: true, updatedAt: payload.updatedAt, createdAt: payload.createdAt, syncCode: payload.syncCode, authKey: issuedKey });
});

app.get('/api/sync/load/:code', (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  if (restoreLimiter.limited(ip)) {
    return res.status(429).json({ success: false, error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' });
  }

  const rawCode = req.params.code.trim();
  const db = readSyncDb();
  const byCode = db[rawCode.toUpperCase()];
  const found = byCode || db[`USER_${rawCode.toLowerCase()}`];

  if (found && isArchivedBlockedAccount(found.username || found.userStats?.username)) {
    return res.status(403).json({ success: false, code: 'ACCOUNT_ARCHIVED', error: 'Esta conta foi arquivada e está bloqueada.' });
  }
  if (found && isAutomatedAccountName(found.username || found.userStats?.username)) {
    return res.status(403).json({ success: false, code: 'AI_PROFILE_BLOCKED', error: 'Perfis automáticos ou de IA não podem ser restaurados como alunos.' });
  }
  if (!found) {
    restoreLimiter.hit(ip);
    return res.status(404).json({ success: false, error: 'Nenhum progresso encontrado com este código ou nome.' });
  }

  const hasKey = recordKeyMatches(found, readUserKey(req));

  let issuedKey: string | undefined;
  if (!hasKey) {
    issuedKey = issueUserKey(found);
    const aliasKeys = [String(found.syncCode || '').toUpperCase(), found.username ? `USER_${String(found.username).toLowerCase().trim()}` : '']
      .filter((k) => k && !PLACEHOLDER_SYNC_CODES.has(k));
    finalizeUserKey(db, aliasKeys, found, []);
    writeSyncDb(db);
    logAdminAction('Conta Restaurada', `A conta "${found.username || rawCode}" foi restaurada em um novo dispositivo.`, 'Sistema');
  }

  const { authKeyHashes, gainCredit, streakBumpAt, ...safe } = found;
  return res.json({ success: true, data: safe, authKey: issuedKey });
});

app.get('/api/user/custom-signs/:codeOrUser', (req: Request, res: Response) => {
  const rawParam = decodeURIComponent(req.params.codeOrUser).trim();
  const db = readSyncDb();

  let entry = db[rawParam.toUpperCase()];
  if (!entry) {
    entry = db[`USER_${rawParam.toLowerCase()}`];
  }
  if (!entry) {
    // Search across records by username or syncCode
    entry = Object.values(db).find((e: any) =>
      e && (
        (e.username && e.username.toLowerCase() === rawParam.toLowerCase()) ||
        (e.syncCode && e.syncCode.toUpperCase() === rawParam.toUpperCase())
      )
    );
  }

  const signs = entry?.taughtSigns || [];
  res.json({ success: true, signs });
});

// GET all community taught signs across all learners
app.get('/api/community/taught-signs', (_req: Request, res: Response) => {
  try {
    const db = readSyncDb();
    const allSigns: any[] = [];
    const seenIds = new Set<string>();

    Object.values(db).forEach((entry: any) => {
      if (entry && Array.isArray(entry.taughtSigns)) {
        entry.taughtSigns.forEach((sign: any) => {
          if (sign && sign.id && !seenIds.has(sign.id)) {
            seenIds.add(sign.id);
            allSigns.push(sign);
          }
        });
      }
    });

    res.json({ success: true, signs: allSigns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar sinais da comunidade.' });
  }
});

app.post('/api/user/custom-signs', (req: Request, res: Response) => {
  const { username, syncCode, sign } = req.body;
  if (!sign || !sign.name) {
    return res.status(400).json({ success: false, message: 'Dados do sinal inválidos.' });
  }

  const db = readSyncDb();
  const cleanUsername = (username || '').trim();
  const cleanCode = (syncCode || '').toUpperCase().trim();
  const userKey = cleanUsername ? `USER_${cleanUsername.toLowerCase()}` : (cleanCode ? cleanCode : null);

  if (!userKey) {
    return res.status(400).json({ success: false, message: 'Usuário não identificado para salvar o sinal.' });
  }

  const auth = authorizeUser(req, db, cleanUsername, cleanCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  const baseRecord = db[userKey] || (cleanCode ? db[cleanCode] : null) || {
    username: cleanUsername || 'Aluno',
    syncCode: cleanCode || 'LIB-9999',
    taughtSigns: [],
    updatedAt: new Date().toISOString(),
  };

  const currentSigns: any[] = Array.isArray(baseRecord.taughtSigns) ? [...baseRecord.taughtSigns] : [];

  const savedSign = {
    ...sign,
    id: sign.id || `taught_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername || baseRecord.username,
    createdAt: sign.createdAt || new Date().toISOString(),
  };

  const existingIdx = currentSigns.findIndex((s: any) => s.id === savedSign.id);
  if (existingIdx >= 0) {
    currentSigns[existingIdx] = savedSign;
  } else {
    currentSigns.unshift(savedSign);
  }

  const updatedRecord = {
    ...baseRecord,
    taughtSigns: currentSigns,
    updatedAt: new Date().toISOString(),
  };

  if (userKey) {
    db[userKey] = updatedRecord;
  }
  if (cleanCode) {
    db[cleanCode] = {
      ...(db[cleanCode] || updatedRecord),
      taughtSigns: currentSigns,
      updatedAt: new Date().toISOString(),
    };
  }

  const signKeys = [userKey, cleanCode].filter((k) => k && db[k]) as string[];
  const issuedKey = finalizeUserKey(db, signKeys, db[signKeys[0]], auth.hashes);
  writeSyncDb(db);
  res.json({ success: true, message: `Sinal "${savedSign.name}" aprendido e salvo com sucesso na sua conta!`, sign: savedSign, authKey: issuedKey });
});

app.delete('/api/user/custom-signs/:id', (req: Request, res: Response) => {
  const signId = req.params.id;
  const { username, syncCode } = req.query;

  const db = readSyncDb();
  const auth = authorizeUser(req, db, username, syncCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  // Só apaga sinais da própria conta (antes, qualquer pessoa apagava o sinal de qualquer aluno).
  let deleted = false;
  for (const val of auth.records) {
    if (val && Array.isArray(val.taughtSigns)) {
      const initLen = val.taughtSigns.length;
      val.taughtSigns = val.taughtSigns.filter((s: any) => s.id !== signId);
      if (val.taughtSigns.length < initLen) deleted = true;
    }
  }

  if (deleted) {
    writeSyncDb(db);
    return res.json({ success: true, message: 'Exemplo do sinal excluído com sucesso.' });
  }

  res.status(404).json({ success: false, message: 'Sinal não encontrado.' });
});

// -------------------------------------------------------------
// TAUGHT FACIAL EXPRESSIONS & AI VALIDATION
// -------------------------------------------------------------
app.get('/api/user/facial-expressions/:codeOrUser', (req: Request, res: Response) => {
  const rawParam = decodeURIComponent(req.params.codeOrUser).trim();
  const db = readSyncDb();

  let entry = db[rawParam.toUpperCase()];
  if (!entry) {
    entry = db[`USER_${rawParam.toLowerCase()}`];
  }
  if (!entry) {
    entry = Object.values(db).find((e: any) =>
      e && (
        (e.username && e.username.toLowerCase() === rawParam.toLowerCase()) ||
        (e.syncCode && e.syncCode.toUpperCase() === rawParam.toUpperCase())
      )
    );
  }

  const expressions = entry?.taughtFacialExpressions || [];
  res.json({ success: true, expressions });
});

app.get('/api/community/facial-expressions', (_req: Request, res: Response) => {
  try {
    const db = readSyncDb();
    const allExpressions: any[] = [];
    const seenIds = new Set<string>();

    Object.values(db).forEach((entry: any) => {
      if (entry && Array.isArray(entry.taughtFacialExpressions)) {
        entry.taughtFacialExpressions.forEach((exp: any) => {
          if (exp && exp.id && !seenIds.has(exp.id)) {
            seenIds.add(exp.id);
            allExpressions.push(exp);
          }
        });
      }
    });

    res.json({ success: true, expressions: allExpressions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Erro ao listar expressões faciais da comunidade.' });
  }
});

app.post('/api/user/facial-expressions', (req: Request, res: Response) => {
  const { username, syncCode, expression } = req.body || {};
  if (!expression || !expression.name) {
    return res.status(400).json({ success: false, message: 'Dados da expressão facial incompletos.' });
  }

  const db = readSyncDb();
  const cleanUsername = (username || '').trim();
  const cleanCode = (syncCode || '').toUpperCase().trim();
  const userKey = cleanUsername ? `USER_${cleanUsername.toLowerCase()}` : (cleanCode ? cleanCode : null);

  if (!userKey) {
    return res.status(400).json({ success: false, message: 'Usuário não identificado para salvar expressão.' });
  }

  const auth = authorizeUser(req, db, cleanUsername, cleanCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  const baseRecord = db[userKey] || (cleanCode ? db[cleanCode] : null) || {
    username: cleanUsername || 'Aluno',
    syncCode: cleanCode || 'LIB-9999',
    taughtFacialExpressions: [],
    updatedAt: new Date().toISOString(),
  };

  const currentExpressions: any[] = Array.isArray(baseRecord.taughtFacialExpressions)
    ? [...baseRecord.taughtFacialExpressions]
    : [];

  const savedExp = {
    ...expression,
    id: expression.id || `face_taught_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername || baseRecord.username,
    createdAt: expression.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = currentExpressions.findIndex((e: any) => e.id === savedExp.id);
  if (existingIdx >= 0) {
    currentExpressions[existingIdx] = savedExp;
  } else {
    currentExpressions.unshift(savedExp);
  }

  const updatedRecord = {
    ...baseRecord,
    taughtFacialExpressions: currentExpressions,
    updatedAt: new Date().toISOString(),
  };

  if (userKey) {
    db[userKey] = updatedRecord;
  }
  if (cleanCode) {
    db[cleanCode] = {
      ...(db[cleanCode] || updatedRecord),
      taughtFacialExpressions: currentExpressions,
      updatedAt: new Date().toISOString(),
    };
  }

  const expKeys = [userKey, cleanCode].filter((k) => k && db[k]) as string[];
  const issuedKey = finalizeUserKey(db, expKeys, db[expKeys[0]], auth.hashes);
  writeSyncDb(db);

  logAdminAction(
    'Expressão Facial Ensinada',
    `Aluno "${cleanUsername || 'Aluno'}" ensinou a expressão facial "${savedExp.name}" (${savedExp.category || 'geral'}).`,
    'Aluno'
  );

  res.json({
    success: true,
    message: `Expressão facial "${savedExp.name}" memorizada com sucesso na sua conta e na trilha!`,
    expression: savedExp,
    authKey: issuedKey,
  });
});

app.put('/api/user/facial-expressions/:id', (req: Request, res: Response) => {
  const expId = req.params.id;
  const { username, syncCode, expression } = req.body || {};

  const db = readSyncDb();
  const auth = authorizeUser(req, db, username, syncCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  let updatedExp: any = null;
  for (const record of auth.records) {
    if (record && Array.isArray(record.taughtFacialExpressions)) {
      const idx = record.taughtFacialExpressions.findIndex((e: any) => e.id === expId);
      if (idx >= 0) {
        record.taughtFacialExpressions[idx] = {
          ...record.taughtFacialExpressions[idx],
          ...expression,
          updatedAt: new Date().toISOString(),
        };
        updatedExp = record.taughtFacialExpressions[idx];
      }
    }
  }

  if (updatedExp) {
    writeSyncDb(db);
    return res.json({ success: true, message: 'Expressão facial atualizada!', expression: updatedExp });
  }

  res.status(404).json({ success: false, message: 'Expressão facial não encontrada.' });
});

app.delete('/api/user/facial-expressions/:id', (req: Request, res: Response) => {
  const expId = req.params.id;
  const { username, syncCode } = req.query;

  const db = readSyncDb();
  const auth = authorizeUser(req, db, username, syncCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  let deleted = false;
  for (const val of auth.records) {
    if (val && Array.isArray(val.taughtFacialExpressions)) {
      const initLen = val.taughtFacialExpressions.length;
      val.taughtFacialExpressions = val.taughtFacialExpressions.filter((e: any) => e.id !== expId);
      if (val.taughtFacialExpressions.length < initLen) deleted = true;
    }
  }

  if (deleted) {
    writeSyncDb(db);
    return res.json({ success: true, message: 'Expressão facial excluída com sucesso.' });
  }

  res.status(404).json({ success: false, message: 'Expressão facial não encontrada.' });
});

app.post('/api/ai/validate-facial-expression', (req: Request, res: Response) => {
  const { category, currentParameters, name } = req.body || {};
  const p = currentParameters || {};

  const eyebrows = p.eyebrows || (category === 'interrogativas' ? 'raised' : 'neutral');
  const headMovement = p.headMovement || (category === 'afirmacao_negacao' ? 'nod_yes' : 'neutral');
  const mouth = p.mouth || (category === 'sentimentos' ? 'smile' : 'neutral');

  const detectedFeatures: string[] = ['Rosto Enquadrado'];
  if (eyebrows === 'raised') detectedFeatures.push('Sobrancelhas Levantadas');
  else if (eyebrows === 'furrowed') detectedFeatures.push('Sobrancelhas Franzidas');

  if (headMovement === 'nod_yes') detectedFeatures.push('Aceno Afirmativo');
  else if (headMovement === 'shake_no') detectedFeatures.push('Balanço de Negação');

  if (mouth === 'smile') detectedFeatures.push('Sorriso Acolhedor');
  else if (mouth === 'open') detectedFeatures.push('Boca Marcada');

  res.json({
    success: true,
    validation: {
      eyebrows,
      headMovement,
      mouth,
      confidence: 94,
      isValidInLibras: true,
      detectedFeatures,
      feedback: `Expressão facial "${name || 'em Libras'}" validada com sucesso! Parâmetros não-manuais congruentes com a gramática da Libras.`,
    },
  });
});

// -------------------------------------------------------------
// SERVER-AUTHORITATIVE PREMIUM SHOP PURCHASES
// Somente o servidor valida saldos, compras e alterações de inventário.
// -------------------------------------------------------------
app.post('/api/shop/purchase', (req: Request, res: Response) => {
  const { username, syncCode, itemId, category, itemName } = req.body || {};

  if (!itemId || !category) {
    return res.status(400).json({ success: false, message: 'Dados do item incompletos.' });
  }

  // O preço vem do catálogo do servidor; o custo enviado pelo app é ignorado.
  const catalogItem = getCatalogItem(String(category), String(itemId));
  if (!catalogItem) {
    return res.status(400).json({ success: false, message: 'Item não encontrado no catálogo da loja.' });
  }
  const cost = catalogItem.cost;

  const db = readSyncDb();
  const userKey = username ? `USER_${username.toLowerCase()}` : (syncCode ? syncCode.toUpperCase() : null);

  if (!userKey) {
    return res.status(400).json({ success: false, message: 'Identificação do usuário necessária para compra.' });
  }

  const auth = authorizeUser(req, db, username, syncCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  if (!db[userKey]) {
    db[userKey] = {
      username: username || 'Aluno',
      syncCode: syncCode || `LIB-${Math.floor(1000 + Math.random() * 9000)}`,
      userStats: {
        username: username || 'Aluno',
        gems: 180,
        hearts: 5,
        maxHearts: 5,
        xp: 320,
        level: 3,
        streak: 5,
        unlockedMascotItems: ['skin_esmeralda'],
        unlockedMascotIds: ['librinha'],
        unlockedTitles: ['Aprendiz Curioso'],
        unlockedNameColors: [],
        unlockedSpecialTracks: [],
        equippedMascot: { outfit: 'none', hat: 'none', glasses: 'none', skin: 'skin_esmeralda' },
      },
      missions: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const userRecord = db[userKey];
  if (!userRecord.userStats) {
    userRecord.userStats = {
      username: username || 'Aluno',
      gems: 180,
      hearts: 5,
      maxHearts: 5,
      xp: 320,
      level: 3,
      streak: 5,
      unlockedMascotItems: ['skin_esmeralda'],
      unlockedMascotIds: ['librinha'],
      unlockedTitles: ['Aprendiz Curioso'],
      unlockedNameColors: [],
      unlockedSpecialTracks: [],
    };
  }

  const currentGems = Number(userRecord.userStats.gems) || 0;

  // Strictest Server Balance Check (Negative Balance Prevention)
  if (currentGems < cost) {
    return res.status(400).json({
      success: false,
      message: `Saldo insuficiente! Você possui ${currentGems} Diamantes, mas o item custa ${cost} 💎. Realize lições ou desafios para ganhar mais.`,
      currentBalance: currentGems,
      required: cost,
    });
  }

  // Duplicate Check for Unique/Permanent Items
  const stats = userRecord.userStats;
  if (!Array.isArray(stats.unlockedMascotItems)) stats.unlockedMascotItems = ['skin_esmeralda'];
  if (!Array.isArray(stats.unlockedMascotIds)) stats.unlockedMascotIds = ['librinha'];
  if (!Array.isArray(stats.unlockedTitles)) stats.unlockedTitles = ['Aprendiz Curioso'];
  if (!Array.isArray(stats.unlockedNameColors)) stats.unlockedNameColors = [];
  if (!Array.isArray(stats.unlockedSpecialTracks)) stats.unlockedSpecialTracks = [];

  const titleName = catalogItem.name;

  if (category === 'accessory' && stats.unlockedMascotItems.includes(itemId)) {
    return res.status(400).json({ success: false, message: 'Você já possui este acessório exclusivo no inventário!' });
  }

  if (category === 'companion' && stats.unlockedMascotIds.includes(itemId)) {
    return res.status(400).json({ success: false, message: 'Você já desbloqueou este mascote companheiro!' });
  }

  if (category === 'title' && stats.unlockedTitles.includes(titleName)) {
    return res.status(400).json({ success: false, message: 'Você já possui este título honorário!' });
  }

  if (category === 'name_color' && stats.unlockedNameColors.includes(itemId)) {
    return res.status(400).json({ success: false, message: 'Você já possui este efeito de cor para o seu nome!' });
  }

  if (category === 'special_track' && stats.unlockedSpecialTracks.includes(itemId)) {
    return res.status(400).json({ success: false, message: 'Você já desbloqueou esta trilha de aprendizado avançada!' });
  }

  // Deduct diamonds strictly on server
  stats.gems = currentGems - cost;

  let rewardDetails: any = { type: category, id: itemId };

  // Apply item effects
  if (category === 'accessory') {
    stats.unlockedMascotItems.push(itemId);
  } else if (category === 'companion') {
    stats.unlockedMascotIds.push(itemId);
    stats.activeMascotId = itemId;
  } else if (category === 'title') {
    stats.unlockedTitles.push(titleName);
    stats.activeTitle = titleName;
  } else if (category === 'name_color') {
    stats.unlockedNameColors.push(itemId);
    stats.nameColor = itemId;
  } else if (category === 'special_track') {
    stats.unlockedSpecialTracks.push(itemId);
  } else if (category === 'hearts_refill') {
    stats.hearts = stats.maxHearts || 5;
  } else if (category === 'heart_shield') {
    stats.hasHeartShield = true;
  } else if (category === 'streak_freeze') {
    stats.hasStreakFreeze = true;
  } else if (category === 'xp_boost') {
    stats.xpBoostUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  } else if (category === 'chest') {
    let xpBonus = 60;
    let gemBonus = 20;
    let titleDrop: string | null = null;

    if (itemId === 'comum') {
      xpBonus = Math.floor(40 + Math.random() * 50);
      gemBonus = Math.floor(15 + Math.random() * 20);
      titleDrop = 'Aprendiz Curioso';
    } else if (itemId === 'raro') {
      xpBonus = Math.floor(120 + Math.random() * 100);
      gemBonus = Math.floor(40 + Math.random() * 45);
      titleDrop = 'Sinalizador Ágil';
    } else if (itemId === 'epico') {
      xpBonus = Math.floor(300 + Math.random() * 250);
      gemBonus = Math.floor(90 + Math.random() * 110);
      titleDrop = 'Mestre da Expressão';
    } else if (itemId === 'lendario') {
      xpBonus = Math.floor(800 + Math.random() * 600);
      gemBonus = Math.floor(250 + Math.random() * 200);
      titleDrop = 'Lenda Viva da Libras';
    }

    stats.xp = (stats.xp || 0) + xpBonus;
    stats.gems = stats.gems + gemBonus;
    if (titleDrop && !stats.unlockedTitles.includes(titleDrop)) {
      stats.unlockedTitles.push(titleDrop);
    }

    rewardDetails = {
      type: 'chest',
      xpBonus,
      gemBonus,
      titleDrop,
    };
  }

  userRecord.updatedAt = new Date().toISOString();
  const issuedKey = finalizeUserKey(db, Array.from(new Set([userKey, ...auth.keys])), userRecord, auth.hashes);
  writeSyncDb(db);

  logAdminAction(
    'Compra Loja Premium',
    `Usuário "${stats.username}" comprou "${itemName || itemId}" por ${cost} Diamantes. Saldo restante: ${stats.gems} 💎.`,
    'Servidor de Transações'
  );

  res.json({
    success: true,
    message: `Compra de "${itemName || itemId}" validada e confirmada pelo servidor!`,
    updatedUserStats: stats,
    rewardDetails,
    remainingBalance: stats.gems,
    authKey: issuedKey,
  });
});

// -------------------------------------------------------------
// DAILY REWARD DIAMONDS CLAIM (SERVER-AUTHORITATIVE)
// -------------------------------------------------------------
app.post('/api/rewards/daily-claim', (req: Request, res: Response) => {
  const { username, syncCode } = req.body;
  const db = readSyncDb();
  const userKey = username ? `USER_${username.toLowerCase()}` : (syncCode ? syncCode.toUpperCase() : null);

  if (!userKey || !db[userKey]) {
    return res.status(400).json({ success: false, message: 'Usuário não localizado para resgate do bônus diário.' });
  }

  const auth = authorizeUser(req, db, username, syncCode);
  if (!auth.ok) {
    return res.status(auth.status).json({ success: false, code: 'KEY_REQUIRED', message: auth.message });
  }

  const userRecord = db[userKey];
  const stats = userRecord.userStats;
  if (!stats) {
    return res.status(400).json({ success: false, message: 'Estatísticas do usuário indisponíveis.' });
  }

  const today = new Date().toISOString().split('T')[0];
  if (stats.lastDailyRewardDate === today) {
    return res.status(400).json({
      success: false,
      message: 'Você já resgatou o seu Bônus Diário de Diamantes hoje! Volte amanhã para continuar sua sequência.',
    });
  }

  const streak = Number(stats.streak) || 1;
  const bonus = 30 + Math.min(streak, 7) * 5;

  stats.gems = (Number(stats.gems) || 0) + bonus;
  stats.lastDailyRewardDate = today;
  userRecord.updatedAt = new Date().toISOString();

  const issuedKey = finalizeUserKey(db, Array.from(new Set([userKey, ...auth.keys])), userRecord, auth.hashes);
  writeSyncDb(db);

  logAdminAction(
    'Bônus Diário Resgatado',
    `Usuário "${stats.username}" resgatou +${bonus} Diamantes (Ofensiva: ${streak} dias). Novo saldo: ${stats.gems} 💎.`,
    'Servidor de Recompensas'
  );

  res.json({
    success: true,
    message: `Parabéns! Você recebeu +${bonus} Diamantes pelo seu Bônus Diário de presença!`,
    bonusDiamonds: bonus,
    updatedUserStats: stats,
    authKey: issuedKey,
  });
});

// -------------------------------------------------------------
// PROMO CODE REDEMPTION (LEARNER FACING)
// -------------------------------------------------------------
app.post('/api/promo/redeem', (req: Request, res: Response) => {
  const { code, username, syncCode } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, message: 'Digite um código de recompensa.' });
  }

  const cleanCode = code.toUpperCase().trim();

  // Se o aluno já tem conta protegida, só o próprio aparelho (com a chave) pode resgatar em nome dele.
  const redeemAuth = authorizeUser(req, readSyncDb(), username, syncCode);
  if (!redeemAuth.ok) {
    return res.status(redeemAuth.status).json({ success: false, code: 'KEY_REQUIRED', message: redeemAuth.message });
  }

  const adminState = readAdminState();
  const promo = (adminState.promoCodes || []).find((p) => p.code.toUpperCase() === cleanCode);

  if (!promo) {
    return res.status(404).json({ success: false, message: 'Código de recompensa inválido ou não encontrado.' });
  }

  if (!promo.active) {
    return res.status(400).json({ success: false, message: 'Este código de recompensa foi desativado pelo administrador.' });
  }

  // Validity rule: Expiration date
  if (promo.expiresAt) {
    const expDate = new Date(promo.expiresAt);
    if (!isNaN(expDate.getTime()) && Date.now() > expDate.getTime()) {
      return res.status(400).json({
        success: false,
        message: `Este código de recompensa expirou em ${expDate.toLocaleDateString('pt-BR')} e não é mais válido.`,
      });
    }
  }

  // Validity rule: Global max redemptions
  if (promo.usedCount >= promo.maxUses) {
    return res.status(400).json({ success: false, message: 'Este código atingiu o limite máximo global de resgates.' });
  }

  // Validity rule: Prevent multiple redemptions by the same user
  const userIdentifier = (username || syncCode || 'aluno').toLowerCase().trim();
  promo.redeemedUsers = promo.redeemedUsers || [];
  const alreadyRedeemed = promo.redeemedUsers.some(
    (u) => u.toLowerCase() === userIdentifier || (syncCode && u.toLowerCase() === syncCode.toLowerCase())
  );

  if (alreadyRedeemed) {
    return res.status(400).json({
      success: false,
      message: 'Você já resgatou este código anteriormente! Cada usuário pode resgatar cada código apenas uma vez.',
    });
  }

  // Apply redemption
  promo.usedCount = (promo.usedCount || 0) + 1;
  promo.redeemedUsers.push(username || syncCode || 'Aluno');
  promo.lastRedeemedAt = new Date().toISOString();
  writeAdminState(adminState);

  const rewardParts: string[] = [];
  if (promo.rewardGems) rewardParts.push(`+${promo.rewardGems} Diamantes 💎`);
  if (promo.rewardXp) rewardParts.push(`+${promo.rewardXp} XP ⚡`);
  if (promo.rewardHearts) rewardParts.push(`+${promo.rewardHearts} Vidas ❤️`);
  if (promo.rewardChests) rewardParts.push(`+${promo.rewardChests} Baú${promo.rewardChests > 1 ? 's' : ''} Misterioso${promo.rewardChests > 1 ? 's' : ''} 🎁`);

  logAdminAction(
    'Cupom Resgatado',
    `Usuário "${username || 'Anônimo'}" resgatou o código "${cleanCode}" (${rewardParts.join(', ')}).`,
    'Aluno'
  );

  res.json({
    success: true,
    message: `Parabéns! Recompensa resgatada com sucesso: ${rewardParts.join(' • ')}`,
    rewards: {
      gems: promo.rewardGems || 0,
      xp: promo.rewardXp || 0,
      hearts: promo.rewardHearts || 0,
      chests: promo.rewardChests || 0,
    },
    promoCode: {
      id: promo.id,
      code: promo.code,
      description: promo.description,
    },
  });
});

// -------------------------------------------------------------
// PUBLIC ANNOUNCEMENTS
// -------------------------------------------------------------
app.get('/api/announcements', (_req: Request, res: Response) => {
  const adminState = readAdminState();
  const active = (adminState.announcements || []).filter((a) => a.active);
  res.json({ success: true, announcements: active });
});

// -------------------------------------------------------------
// ADMIN AUTHENTICATION
// -------------------------------------------------------------
// Tudo em /api/admin/* exige token de administrador, exceto login e recuperação de senha autorizada.
app.use('/api/admin', (req: Request, res: Response, next: () => void) => {
  if (req.path === '/auth/login' || req.path === '/auth/recover-password') return next();
  return requireAdmin(req, res, next);
});

app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  if (loginRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde 5 minutos (ou reinicie o app) e tente novamente.' });
  }

  const { username, password } = req.body || {};
  const adminState = readAdminState();
  const db = readSyncDb();
  const cleanUser = typeof username === 'string' ? username.trim() : '';
  const cleanPassword = typeof password === 'string' ? password.trim() : '';
  const creds = adminState.adminCredentials;

  const normUser = cleanUser.toLowerCase();
  const isAuthorizedAdminUser =
    !isArchivedBlockedAccount(cleanUser) && (
    normUser === String(creds.username || '').toLowerCase() ||
    normUser === 'admin' ||
    db[`USER_${normUser}`]?.userStats?.role === 'admin' ||
    db[`USER_${normUser}`]?.role === 'admin');

  const passOk = cleanPassword.length > 0 && verifyPassword(cleanPassword, creds.passwordHash);

  if (!isAuthorizedAdminUser || !passOk) {
    console.log(`[ADMIN] Login recusado: usuário ${isAuthorizedAdminUser ? 'ok' : 'ERRADO'}, senha ${passOk ? 'ok' : 'ERRADA'}.`);
    registerFailedLogin(ip);
    logAdminAction('Tentativa de Login Falhou', `Tentativa de acesso administrativo recusada (usuário informado: "${cleanUser.slice(0, 40)}").`, 'Sistema');
    return res.status(401).json({ success: false, message: 'Usuário ou senha de administrador incorretos.' });
  }

  loginAttempts.delete(ip);
  pruneAdminSessions();
  const now = Date.now();
  const effectiveUsername = 'admin';
  const session: AdminSessionRecord = {
    token: `adm_${crypto.randomBytes(32).toString('hex')}`,
    username: effectiveUsername,
    role: 'admin',
    loggedInAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ADMIN_SESSION_TTL_MS).toISOString(),
    permissions: ['manage_users', 'manage_activities', 'manage_media', 'manage_rewards', 'manage_content'],
  };
  adminSessions.set(session.token, session);

  // Recupera o perfil completo da administradora do banco compartilhado
  const adminRecord = db['USER_admin'];
  const adminProfile = adminRecord?.userStats || {
    username: effectiveUsername,
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: 'admin',
    activeTitle: 'Administradora',
    equippedFrame: 'frame_ouro',
    level: 4,
    xp: 450,
    gems: 250,
    streak: 6,
    hearts: 5,
    maxHearts: 5,
    syncCode: 'LIB-ADMIN',
  };

  logAdminAction('Login Administrativo', `Administradora "${effectiveUsername}" acessou o painel de gestão.`, effectiveUsername);
  return res.json({ success: true, session, profile: adminProfile });
});

app.post('/api/admin/auth/recover-password', (req: Request, res: Response) => {
  const ip = req.ip || 'unknown';
  if (loginRateLimited(ip)) {
    return res.status(429).json({ success: false, message: 'Muitas tentativas. Aguarde 5 minutos (ou reinicie o app) e tente novamente.' });
  }
  const { syncCode, newPassword } = req.body || {};
  const given = String(syncCode || '').trim();
  const cleanPass = String(newPassword || '').trim();

  // O e-mail e o código LIB-ADMIN apareciam na própria tela, então qualquer pessoa podia tomar o painel.
  // Agora a recuperação exige uma chave secreta, definida só por você nos Secrets do AI Studio.
  const recoveryKey = (process.env.ADMIN_RECOVERY_KEY || '').trim();
  if (recoveryKey.length < 8) {
    return res.status(403).json({
      success: false,
      message: 'Recuperação desativada por segurança. Defina o segredo ADMIN_PASSWORD (ou ADMIN_RECOVERY_KEY) nas configurações do AI Studio e reinicie o app.',
    });
  }
  const a = Buffer.from(given);
  const b = Buffer.from(recoveryKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    registerFailedLogin(ip);
    logAdminAction('Recuperação de Senha Recusada', 'Chave de recuperação incorreta.', 'Sistema');
    return res.status(403).json({ success: false, message: 'Chave de recuperação incorreta.' });
  }

  if (cleanPass.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `A nova senha deve ter no mínimo ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.`,
    });
  }

  const adminState = readAdminState();
  adminState.adminCredentials = {
    username: 'admin',
    passwordHash: hashPassword(cleanPass),
  };
  writeAdminState(adminState);

  // Atualiza somente a conta administrativa preservada; a conta arquivada Marinette não é tocada.
  const db = readSyncDb();
  for (const key of ['USER_admin', 'LIB-ADMIN']) {
    if (db[key]) {
      db[key].role = 'admin';
      if (db[key].userStats) db[key].userStats.role = 'admin';
    }
  }
  writeSyncDb(db);

  logAdminAction('Senha de Administradora Redefinida', 'Acesso da conta admin redefinido com a chave de recuperação.', 'admin');

  return res.json({
    success: true,
    message: 'Senha de administradora redefinida com sucesso! Você já pode entrar com seu usuário "admin" e a nova senha.',
  });
});

app.post('/api/admin/auth/logout', (req: Request, res: Response) => {
  adminSessions.delete(getBearerToken(req));
  res.json({ success: true });
});

app.post('/api/admin/auth/change-password', (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body || {};
  const adminState = readAdminState();

  if (typeof currentPassword !== 'string' || !verifyPassword(currentPassword.trim(), adminState.adminCredentials.passwordHash)) {
    return res.status(403).json({ success: false, message: 'Senha atual incorreta.' });
  }

  if (typeof newPassword !== 'string' || newPassword.trim().length < MIN_ADMIN_PASSWORD_LENGTH) {
    return res.status(400).json({ success: false, message: `A nova senha deve ter pelo menos ${MIN_ADMIN_PASSWORD_LENGTH} caracteres.` });
  }

  adminState.adminCredentials.passwordHash = hashPassword(newPassword.trim());
  writeAdminState(adminState);

  // Encerra as outras sessões; mantém só a atual.
  const currentToken = getBearerToken(req);
  for (const token of Array.from(adminSessions.keys())) {
    if (token !== currentToken) adminSessions.delete(token);
  }

  logAdminAction('Senha Alterada', 'Senha mestra de administrador atualizada.');
  res.json({ success: true, message: 'Senha mestra atualizada com sucesso!' });
});

// -------------------------------------------------------------
// ADMIN MODULES / UNITS MANAGEMENT (CRUD)
// -------------------------------------------------------------
app.post('/api/admin/modules', (req: Request, res: Response) => {
  try {
    const { title, subtitle, description, themeColor, accentColor, icon, level } = req.body;
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Título e descrição da unidade são obrigatórios.' });
    }

    const adminState = readAdminState();
    const newModuleId = `mod_custom_${Date.now()}`;
    const newModule: LearningModule = {
      id: newModuleId,
      title: title.trim(),
      subtitle: (subtitle || 'Nova unidade prática criada pelo Administrador').trim(),
      description: description.trim(),
      themeColor: themeColor || 'from-indigo-600 to-purple-600',
      accentColor: accentColor || '#6366f1',
      icon: icon || 'Sparkles',
      level: Number(level) || (adminState.customModules.length + 16),
      enabled: true,
      isCustom: true,
      lessons: [
        {
          id: `lesson_${newModuleId}_1`,
          moduleId: newModuleId,
          title: 'Primeiros Passos da Unidade',
          description: 'Aprenda os sinais fundamentais com instrução visual guiada.',
          xpReward: 35,
          gemsReward: 15,
          icon: 'Sparkles',
          targetSignIds: ['letra_a', 'letra_b'],
          exercises: [
            {
              id: `ex_${newModuleId}_1`,
              type: 'learn',
              title: 'Apresentação do Conteúdo',
              instruction: 'Observe com atenção a articulação dos sinais selecionados.',
              signId: 'letra_a',
            },
            {
              id: `ex_${newModuleId}_2`,
              type: 'ar_challenge',
              title: 'Desafio Prático na Câmera',
              instruction: 'Posicione sua mão em frente à câmera e execute o sinal com precisão!',
              signId: 'letra_a',
              targetHoldSeconds: 1.5,
            },
          ],
        },
      ],
    };

    adminState.customModules.push(newModule);
    writeAdminState(adminState);

    logAdminAction('Unidade Criada', `Nova unidade "${newModule.title}" adicionada e sincronizada.`);
    res.json({
      success: true,
      message: 'Nova unidade criada e sincronizada com sucesso em todos os dispositivos!',
      module: newModule,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao criar unidade: ' + err.message });
  }
});

app.put('/api/admin/modules/:id', (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    const { title, subtitle, description, themeColor, accentColor, icon, level, enabled } = req.body;
    const adminState = readAdminState();

    // Check if custom module
    const customIdx = adminState.customModules.findIndex((m) => m.id === moduleId);
    if (customIdx >= 0) {
      adminState.customModules[customIdx] = {
        ...adminState.customModules[customIdx],
        ...(title !== undefined && { title }),
        ...(subtitle !== undefined && { subtitle }),
        ...(description !== undefined && { description }),
        ...(themeColor !== undefined && { themeColor }),
        ...(accentColor !== undefined && { accentColor }),
        ...(icon !== undefined && { icon }),
        ...(level !== undefined && { level: Number(level) }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      };
    } else {
      // It's a baseline module, save in moduleOverrides
      const existing = adminState.moduleOverrides[moduleId] || {};
      adminState.moduleOverrides[moduleId] = {
        ...existing,
        ...(title !== undefined && { customTitle: title }),
        ...(subtitle !== undefined && { customSubtitle: subtitle }),
        ...(description !== undefined && { customDescription: description }),
        ...(themeColor !== undefined && { customTheme: themeColor }),
        ...(icon !== undefined && { customIcon: icon }),
        ...(level !== undefined && { level: Number(level) }),
        ...(enabled !== undefined && { enabled: Boolean(enabled) }),
      };
    }

    writeAdminState(adminState);
    logAdminAction('Unidade Atualizada', `Unidade ID "${moduleId}" editada.`);
    res.json({ success: true, message: 'Unidade atualizada e sincronizada com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar unidade: ' + err.message });
  }
});

app.post('/api/admin/modules/:id/toggle', (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    const adminState = readAdminState();

    const customMod = adminState.customModules.find((m) => m.id === moduleId);
    let nextStatus = true;
    if (customMod) {
      customMod.enabled = customMod.enabled === false ? true : false;
      nextStatus = customMod.enabled;
    } else {
      const existing = adminState.moduleOverrides[moduleId] || {};
      const current = existing.enabled !== false;
      nextStatus = !current;
      adminState.moduleOverrides[moduleId] = {
        ...existing,
        enabled: nextStatus,
      };
    }

    writeAdminState(adminState);
    logAdminAction('Status de Unidade Alterado', `Unidade "${moduleId}" ${nextStatus ? 'ativada' : 'pausada'}.`);
    res.json({
      success: true,
      enabled: nextStatus,
      message: `Unidade ${nextStatus ? 'ativada' : 'pausada / em manutenção'} para todos os usuários!`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao alterar status da unidade: ' + err.message });
  }
});

app.delete('/api/admin/modules/:id', (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    const adminState = readAdminState();

    adminState.customModules = adminState.customModules.filter((m) => m.id !== moduleId);
    if (!adminState.deletedModuleIds.includes(moduleId)) {
      adminState.deletedModuleIds.push(moduleId);
    }
    delete adminState.moduleOverrides[moduleId];

    writeAdminState(adminState);
    logAdminAction('Unidade Removida', `Unidade ID "${moduleId}" foi excluída permanentemente.`);
    res.json({ success: true, message: 'Unidade removida com sucesso do aplicativo!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao remover unidade: ' + err.message });
  }
});

// -------------------------------------------------------------
// ADMIN ACTIVITIES / LESSONS MANAGEMENT (CRUD)
// -------------------------------------------------------------
app.post('/api/admin/modules/:id/lessons', (req: Request, res: Response) => {
  try {
    const moduleId = req.params.id;
    const { title, description, xpReward, gemsReward, icon, targetSignIds } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'O título da atividade é obrigatório.' });
    }

    const adminState = readAdminState();
    const newLessonId = `lesson_${Date.now()}`;
    const cleanSignIds = Array.isArray(targetSignIds) && targetSignIds.length > 0 ? targetSignIds : ['letra_a'];

    const newLesson: Lesson = {
      id: newLessonId,
      moduleId,
      title: title.trim(),
      description: (description || 'Pratique os sinais indicados com feedback em tempo real.').trim(),
      xpReward: Number(xpReward) || 30,
      gemsReward: Number(gemsReward) || 15,
      icon: icon || 'Sparkles',
      targetSignIds: cleanSignIds,
      exercises: [
        {
          id: `ex_${newLessonId}_1`,
          type: 'learn',
          title: `Aprendizado: ${title.trim()}`,
          instruction: 'Conheça e memorize o sinal em Libras com seus parâmetros de execução.',
          signId: cleanSignIds[0],
        },
        {
          id: `ex_${newLessonId}_2`,
          type: 'ar_challenge',
          title: 'Prática Guiada com Câmera',
          instruction: 'Execute o sinal indicado em frente à câmera e mantenha a pose!',
          signId: cleanSignIds[0],
          targetHoldSeconds: 1.5,
        },
      ],
    };

    // If custom module
    const customMod = adminState.customModules.find((m) => m.id === moduleId);
    if (customMod) {
      customMod.lessons = customMod.lessons || [];
      customMod.lessons.push(newLesson);
    } else {
      // Find base module
      const baseMod = LEARNING_MODULES.find((m) => m.id === moduleId);
      const existingLessons = adminState.moduleOverrides[moduleId]?.lessons || (baseMod ? [...baseMod.lessons] : []);
      existingLessons.push(newLesson);
      adminState.moduleOverrides[moduleId] = {
        ...(adminState.moduleOverrides[moduleId] || {}),
        lessons: existingLessons,
      };
    }

    writeAdminState(adminState);
    logAdminAction('Atividade Criada', `Nova lição "${newLesson.title}" adicionada ao módulo "${moduleId}".`);
    res.json({
      success: true,
      message: 'Atividade adicionada e sincronizada com sucesso no banco compartilhado!',
      lesson: newLesson,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao criar atividade: ' + err.message });
  }
});

app.put('/api/admin/modules/:id/lessons/:lessonId', (req: Request, res: Response) => {
  try {
    const { id: moduleId, lessonId } = req.params;
    const { title, description, xpReward, gemsReward, icon } = req.body;
    const adminState = readAdminState();

    const updateLessonObj = (lesson: Lesson): Lesson => ({
      ...lesson,
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(xpReward !== undefined && { xpReward: Number(xpReward) }),
      ...(gemsReward !== undefined && { gemsReward: Number(gemsReward) }),
      ...(icon !== undefined && { icon }),
    });

    const customMod = adminState.customModules.find((m) => m.id === moduleId);
    if (customMod) {
      customMod.lessons = (customMod.lessons || []).map((l) => (l.id === lessonId ? updateLessonObj(l) : l));
    } else {
      const baseMod = LEARNING_MODULES.find((m) => m.id === moduleId);
      const currentLessons = adminState.moduleOverrides[moduleId]?.lessons || (baseMod ? [...baseMod.lessons] : []);
      const updated = currentLessons.map((l) => (l.id === lessonId ? updateLessonObj(l) : l));
      adminState.moduleOverrides[moduleId] = {
        ...(adminState.moduleOverrides[moduleId] || {}),
        lessons: updated,
      };
    }

    writeAdminState(adminState);
    logAdminAction('Atividade Editada', `Lição "${lessonId}" atualizada no módulo "${moduleId}".`);
    res.json({ success: true, message: 'Atividade atualizada e sincronizada com sucesso!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao atualizar atividade: ' + err.message });
  }
});

app.delete('/api/admin/modules/:id/lessons/:lessonId', (req: Request, res: Response) => {
  try {
    const { id: moduleId, lessonId } = req.params;
    const adminState = readAdminState();

    const customMod = adminState.customModules.find((m) => m.id === moduleId);
    if (customMod) {
      customMod.lessons = (customMod.lessons || []).filter((l) => l.id !== lessonId);
    } else {
      const baseMod = LEARNING_MODULES.find((m) => m.id === moduleId);
      const currentLessons = adminState.moduleOverrides[moduleId]?.lessons || (baseMod ? [...baseMod.lessons] : []);
      const filtered = currentLessons.filter((l) => l.id !== lessonId);
      adminState.moduleOverrides[moduleId] = {
        ...(adminState.moduleOverrides[moduleId] || {}),
        lessons: filtered,
      };
    }

    writeAdminState(adminState);
    logAdminAction('Atividade Removida', `Lição "${lessonId}" removida do módulo "${moduleId}".`);
    res.json({ success: true, message: 'Atividade removida com sucesso do aplicativo!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao remover atividade: ' + err.message });
  }
});

// -------------------------------------------------------------
// ADMIN LIBRAS SIGNS (LIBRASDEX) MANAGEMENT (CRUD)
// -------------------------------------------------------------
app.post('/api/admin/signs', (req: Request, res: Response) => {
  try {
    const {
      name,
      category,
      difficulty,
      meaning,
      contextSentence,
      contextTranslation,
      cm,
      pa,
      m,
      o,
      ef,
      videoUrl,
      imageUrl,
      tips,
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'O nome do sinal é obrigatório.' });
    }

    const adminState = readAdminState();
    const newSignId = `sign_custom_${Date.now()}`;
    const cleanTips = Array.isArray(tips)
      ? tips
      : tips ? tips.split('\n').map((t: string) => t.trim()).filter(Boolean) : ['Mantenha boa postura.', 'Articule com fluência.'];

    const newSign: LibrasSign = {
      id: newSignId,
      name: name.trim(),
      category: category || 'saudacoes',
      difficulty: difficulty || 'iniciante',
      meaning: (meaning || `Sinal oficial em Libras para ${name}.`).trim(),
      contextSentence: (contextSentence || `Exemplo de uso prático do sinal de ${name}.`).trim(),
      contextTranslation: (contextTranslation || 'Tradução direta em Libras.').trim(),
      parameters: {
        cm: cm?.trim() || "Mão aberta ou em 'L'",
        pa: pa?.trim() || 'Espaço neutro na frente do peito',
        m: m?.trim() || 'Movimento retilíneo para frente',
        o: o?.trim() || 'Palma voltada para frente',
        ef: ef?.trim() || 'Neutra ou amigável',
      },
      svgHandShape: 'a',
      poseRule: {
        thumbExtended: true,
        indexExtended: true,
        middleExtended: false,
        ringExtended: false,
        pinkyExtended: false,
        palmOrientation: 'camera',
        descriptionHint: 'Posicione a mão com clareza em frente à câmera.',
      },
      tips: cleanTips,
      videoUrl: videoUrl?.trim() || undefined,
      imageUrl: imageUrl?.trim() || undefined,
      isCustom: true,
    };

    adminState.customSigns.unshift(newSign);
    writeAdminState(adminState);

    logAdminAction('Sinal de Libras Adicionado', `Novo sinal "${newSign.name}" cadastrado no LibrasDex.`);
    res.json({
      success: true,
      message: `Sinal "${newSign.name}" salvo no banco compartilhado e disponível para todos os usuários!`,
      sign: newSign,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao cadastrar sinal: ' + err.message });
  }
});

app.put('/api/admin/signs/:id', (req: Request, res: Response) => {
  try {
    const signId = req.params.id;
    const {
      name,
      category,
      difficulty,
      meaning,
      contextSentence,
      contextTranslation,
      cm,
      pa,
      m,
      o,
      ef,
      videoUrl,
      imageUrl,
      tips,
    } = req.body;

    const adminState = readAdminState();
    const customIdx = adminState.customSigns.findIndex((s) => s.id === signId);

    const updateSignData: Partial<LibrasSign> = {
      ...(name !== undefined && { name }),
      ...(category !== undefined && { category }),
      ...(difficulty !== undefined && { difficulty }),
      ...(meaning !== undefined && { meaning }),
      ...(contextSentence !== undefined && { contextSentence }),
      ...(contextTranslation !== undefined && { contextTranslation }),
      ...(videoUrl !== undefined && { videoUrl }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(tips !== undefined && {
        tips: Array.isArray(tips) ? tips : tips.split('\n').map((t: string) => t.trim()).filter(Boolean),
      }),
    };

    if (cm || pa || m || o || ef) {
      updateSignData.parameters = {
        cm: cm || "Mão em 'L'",
        pa: pa || 'Espaço neutro',
        m: m || 'Para a frente',
        o: o || 'Palma para frente',
        ef: ef || 'Neutra',
      };
    }

    if (customIdx >= 0) {
      adminState.customSigns[customIdx] = {
        ...adminState.customSigns[customIdx],
        ...updateSignData,
      };
    } else {
      adminState.editedSigns[signId] = {
        ...(adminState.editedSigns[signId] || {}),
        ...updateSignData,
      };
    }

    writeAdminState(adminState);
    logAdminAction('Sinal de Libras Editado', `Sinal "${signId}" atualizado.`);
    res.json({ success: true, message: 'Sinal atualizado e sincronizado para todos os dispositivos!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao editar sinal: ' + err.message });
  }
});

app.delete('/api/admin/signs/:id', (req: Request, res: Response) => {
  try {
    const signId = req.params.id;
    const adminState = readAdminState();

    adminState.customSigns = adminState.customSigns.filter((s) => s.id !== signId);
    if (!adminState.deletedSignIds.includes(signId)) {
      adminState.deletedSignIds.push(signId);
    }
    delete adminState.editedSigns[signId];

    writeAdminState(adminState);
    logAdminAction('Sinal de Libras Excluído', `Sinal ID "${signId}" removido.`);
    res.json({ success: true, message: 'Sinal excluído com sucesso do LibrasDex!' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao remover sinal: ' + err.message });
  }
});

// -------------------------------------------------------------
// ADMIN REWARDS & MYSTERY CHESTS CONFIGURATION
// -------------------------------------------------------------
app.put('/api/admin/chests', (req: Request, res: Response) => {
  try {
    const { chestOverrides } = req.body;
    if (!chestOverrides || typeof chestOverrides !== 'object') {
      return res.status(400).json({ success: false, message: 'Configurações de baús inválidas.' });
    }

    const adminState = readAdminState();
    adminState.chestOverrides = {
      ...adminState.chestOverrides,
      ...chestOverrides,
    };
    writeAdminState(adminState);

    logAdminAction('Recompensas Atualizadas', 'Custos e recompensas dos Baús Misteriosos foram atualizados.');
    res.json({
      success: true,
      message: 'Configurações dos Baús salvas e sincronizadas para todos os usuários!',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Erro ao salvar baús: ' + err.message });
  }
});

// -------------------------------------------------------------
// ADMIN USERS MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/users', (_req: Request, res: Response) => {
  const db = readSyncDb();
  const usersList: any[] = [];
  const seenUsernames = new Set<string>();

  for (const [key, val] of Object.entries(db)) {
    if (val && val.userStats) {
      const uname = (val.username || val.userStats.username || key.replace(/^USER_/, '')).trim();
      const norm = normalizeString(uname);
      // Filter out bots, AI placeholders, empty names (never confuse the AI with real users or admin)
      if (isHiddenFromRealUsers(uname)) {
        continue;
      }
      if (!seenUsernames.has(norm)) {
        seenUsernames.add(norm);
        const role = val.role || val.userStats.role || (norm === 'marinette' || norm === 'admin' ? 'admin' : 'learner');
        usersList.push({
          key,
          syncCode: val.syncCode || val.userStats.syncCode || '---',
          username: uname,
          avatarUrl: val.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          xp: val.userStats.xp || 0,
          level: val.userStats.level || 1,
          gems: val.userStats.gems || 0,
          hearts: val.userStats.hearts ?? 5,
          streak: val.userStats.streak || 0,
          completedLessonsCount: val.userStats.completedLessonIds ? val.userStats.completedLessonIds.length : 0,
          lastActive: val.updatedAt || val.userStats.lastActiveDate || 'Hoje',
          createdAt: val.createdAt || val.userStats.createdAt || val.updatedAt || new Date().toISOString(),
          activeTitle: val.userStats.activeTitle || (role === 'admin' ? 'Administradora' : 'Aprendiz Curioso'),
          equippedSkin: val.userStats.equippedMascot?.skin || 'skin_esmeralda',
          perfectSignsCount: val.userStats.perfectSignsCount || 0,
          signMasteryCount: val.userStats.signMastery ? Object.keys(val.userStats.signMastery).length : 0,
          taughtSignsCount: Array.isArray(val.taughtSigns) ? val.taughtSigns.length : 0,
          completedLessons: val.userStats.completedLessonIds || [],
          friendsCount: Array.isArray(val.userStats.friends) ? val.userStats.friends.length : 0,
          challengesCount: Array.isArray(val.userStats.weeklyChallenges) ? val.userStats.weeklyChallenges.length : 0,
          friends: val.userStats.friends || [],
          weeklyChallenges: val.userStats.weeklyChallenges || [],
          role,
        });
      }
    }
  }

  // Ordena com a Administradora no topo, seguida pelos estudantes por XP
  usersList.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return (b.xp || 0) - (a.xp || 0);
  });

  res.json({ success: true, users: usersList });
});

// -------------------------------------------------------------
// REAL LEARNERS DIRECTORY & SEARCH FOR FRIENDS & LEADERBOARD
// -------------------------------------------------------------
// -------------------------------------------------------------
// REAL LEARNERS DIRECTORY, SEARCH, FRIENDS & CHALLENGES
// -------------------------------------------------------------
function normalizeString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Contas arquivadas a pedido da proprietária. Os dados permanecem no JSON/backup,
// mas essas identidades não podem autenticar, sincronizar nem aparecer nas listas.
const ARCHIVED_BLOCKED_ACCOUNT_NAMES = new Set(['marinette', 'carlos andrade real']);
const ARCHIVED_BLOCKED_SYNC_CODES = new Set(['LIB-TEST1', 'LIB-8899']);
const AUTOMATED_ACCOUNT_NAMES = new Set(['perfil de ia', 'perfil ia', 'usuario ia', 'usuário ia', 'robot', 'robô']);
const CONFIRMED_TEST_ACCOUNT_NAMES = new Set(['tester', 'voce (aprendiz)']);

function isArchivedBlockedAccount(username: unknown): boolean {
  return ARCHIVED_BLOCKED_ACCOUNT_NAMES.has(normalizeString(String(username || '')));
}

function isArchivedBlockedIdentity(username: unknown, syncCode: unknown): boolean {
  const code = String(syncCode || '').toUpperCase().trim();
  return isArchivedBlockedAccount(username) || ARCHIVED_BLOCKED_SYNC_CODES.has(code);
}

function isAutomatedAccountName(username: unknown): boolean {
  const name = normalizeString(String(username || ''));
  if (!name) return false;
  return AUTOMATED_ACCOUNT_NAMES.has(name) || /^(bot_|testbot|fake_|ai_|ia_)/i.test(name);
}

function isHiddenFromRealUsers(username: unknown): boolean {
  const name = normalizeString(String(username || ''));
  return !name || isArchivedBlockedAccount(name) || isAutomatedAccountName(name) || CONFIRMED_TEST_ACCOUNT_NAMES.has(name);
}

function findUserRecord(db: Record<string, any>, usernameOrCode: string): { key: string; record: any } | null {
  if (!usernameOrCode || isArchivedBlockedAccount(usernameOrCode) || ARCHIVED_BLOCKED_SYNC_CODES.has(usernameOrCode.toUpperCase().trim())) return null;
  const target = normalizeString(usernameOrCode);
  const targetCode = usernameOrCode.toUpperCase().trim();

  // Try direct key matches first
  if (db[targetCode]) return { key: targetCode, record: db[targetCode] };
  const userKey = `USER_${usernameOrCode.toLowerCase().trim()}`;
  if (db[userKey]) return { key: userKey, record: db[userKey] };

  // Scan across entries
  for (const [k, val] of Object.entries(db)) {
    if (!val || !val.userStats) continue;
    const uname = (val.username || val.userStats.username || '').trim();
    const scode = (val.syncCode || val.userStats.syncCode || '').trim();
    if (normalizeString(uname) === target || scode.toUpperCase() === targetCode) {
      return { key: k, record: val };
    }
  }
  return null;
}

function updateUserRecord(db: Record<string, any>, updatedRecord: any) {
  const username = updatedRecord.username || updatedRecord.userStats?.username;
  const syncCode = updatedRecord.syncCode || updatedRecord.userStats?.syncCode;
  if (syncCode) {
    db[syncCode.toUpperCase().trim()] = updatedRecord;
  }
  if (username) {
    db[`USER_${username.toLowerCase().trim()}`] = updatedRecord;
  }
}

app.get('/api/users/real', (_req: Request, res: Response) => {
  const db = readSyncDb();
  const userMap = new Map<string, any>();

  for (const [key, val] of Object.entries(db)) {
    if (val && val.userStats) {
      const uname = (val.username || val.userStats.username || key.replace(/^USER_/, '')).trim();
      const norm = normalizeString(uname);
      // Filter out bots, synthetic AI accounts, or blank names (never show generic AI in real learners list)
      if (!norm || norm === 'admin' || isHiddenFromRealUsers(uname)) {
        continue;
      }

      const currentXp = Number(val.userStats.xp) || 0;
      const existing = userMap.get(norm);
      if (!existing || currentXp > (Number(existing.userStats?.xp) || 0)) {
        userMap.set(norm, val);
      }
    }
  }

  const realUsers: any[] = [];
  for (const [norm, val] of userMap.entries()) {
    const uname = (val.username || val.userStats.username || norm).trim();
    const xp = Number(val.userStats.xp) || 0;
    realUsers.push({
      id: `user_${norm}`,
      syncCode: '', // o código de sincronização é privado (restaura a conta)
      name: uname,
      username: uname,
      avatar: val.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      avatarUrl: val.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      xp,
      level: Number(val.userStats.level) || 1,
      streak: Number(val.userStats.streak) || 0,
      league: xp > 1000 ? 'Diamante' : xp > 600 ? 'Safira' : xp > 300 ? 'Ouro' : xp > 100 ? 'Prata' : 'Bronze',
      activeTitle: val.userStats.activeTitle || 'Aprendiz Curioso',
      badge: val.userStats.activeTitle || '🌱 Aluno Real',
      location: 'Brasil',
      lastActive: val.updatedAt || val.userStats.lastActiveDate || 'Hoje',
    });
  }

  // Sort real users by XP descending and set ranks
  realUsers.sort((a, b) => b.xp - a.xp);
  realUsers.forEach((u, idx) => {
    u.rank = idx + 1;
  });

  res.json({ success: true, users: realUsers });
});

app.get('/api/users/search', (req: Request, res: Response) => {
  const rawQ = (req.query.q as string || '').trim();
  const q = normalizeString(rawQ);

  const db = readSyncDb();
  const userMap = new Map<string, any>();

  for (const [key, val] of Object.entries(db)) {
    if (val && val.userStats) {
      const uname = (val.username || val.userStats.username || key.replace(/^USER_/, '')).trim();
      const norm = normalizeString(uname);
      if (isHiddenFromRealUsers(uname)) {
        continue;
      }
      const currentXp = Number(val.userStats.xp) || 0;
      const existing = userMap.get(norm);
      if (!existing || currentXp > (Number(existing.userStats?.xp) || 0)) {
        userMap.set(norm, val);
      }
    }
  }

  const matches: any[] = [];
  for (const [norm, val] of userMap.entries()) {
    const uname = (val.username || val.userStats.username || norm).trim();
    const isMatch = !q || norm.includes(q);

    if (isMatch) {
      matches.push({
        username: uname,
        syncCode: '',
        avatarUrl: val.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        xp: Number(val.userStats.xp) || 0,
        level: Number(val.userStats.level) || 1,
        streak: Number(val.userStats.streak) || 0,
        activeTitle: val.userStats.activeTitle || 'Aprendiz Curioso',
        league: (val.userStats.xp || 0) > 1000 ? 'Diamante' : (val.userStats.xp || 0) > 500 ? 'Safira' : 'Ouro',
      });
    }
  }

  matches.sort((a, b) => b.xp - a.xp);
  res.json({ success: true, users: matches });
});

// FRIEND REQUESTS & RELATIONSHIPS
app.post('/api/friends/request', (req: Request, res: Response) => {
  const { fromUsername, toUsername } = req.body;
  if (!fromUsername || !toUsername) {
    return res.status(400).json({ success: false, message: 'Usuários de origem e destino obrigatórios.' });
  }
  if (normalizeString(fromUsername) === normalizeString(toUsername)) {
    return res.status(400).json({ success: false, message: 'Você não pode enviar solicitação para si mesmo.' });
  }

  const db = readSyncDb();
  const senderFound = findUserRecord(db, fromUsername);
  const targetFound = findUserRecord(db, toUsername);

  if (!senderFound || !targetFound) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado no banco de dados.' });
  }

  const sender = senderFound.record;
  const target = targetFound.record;

  sender.userStats = sender.userStats || {};
  target.userStats = target.userStats || {};
  sender.userStats.friends = sender.userStats.friends || [];
  target.userStats.friends = target.userStats.friends || [];
  sender.userStats.friendRequestsSent = sender.userStats.friendRequestsSent || [];
  target.userStats.friendRequestsReceived = target.userStats.friendRequestsReceived || [];

  // Check if already friends
  const alreadyFriends = sender.userStats.friends.some(
    (f: any) => normalizeString(f.username) === normalizeString(toUsername)
  );
  if (alreadyFriends) {
    return res.status(400).json({ success: false, message: 'Vocês já são amigos!' });
  }

  // Check if request already pending
  const alreadySent = target.userStats.friendRequestsReceived.some(
    (r: any) => normalizeString(r.fromUsername) === normalizeString(fromUsername)
  );
  if (alreadySent) {
    return res.status(400).json({ success: false, message: 'Solicitação de amizade já enviada anteriormente!' });
  }

  const newReq = {
    id: `freq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fromUsername: sender.username || sender.userStats.username || fromUsername,
    fromAvatarUrl: sender.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    fromXp: Number(sender.userStats.xp) || 0,
    fromLevel: Number(sender.userStats.level) || 1,
    requestedAt: new Date().toISOString(),
  };

  target.userStats.friendRequestsReceived.unshift(newReq);
  const targetName = target.username || target.userStats.username || toUsername;
  if (!sender.userStats.friendRequestsSent.includes(targetName)) {
    sender.userStats.friendRequestsSent.push(targetName);
  }

  updateUserRecord(db, sender);
  updateUserRecord(db, target);
  writeSyncDb(db);

  res.json({ success: true, message: `Solicitação de amizade enviada para ${toUsername}!`, request: newReq });
});

app.get('/api/friends/requests/:username', (req: Request, res: Response) => {
  const username = req.params.username;
  const db = readSyncDb();
  const userFound = findUserRecord(db, username);
  if (!userFound) {
    return res.json({ success: true, requests: [] });
  }
  const requests = userFound.record.userStats?.friendRequestsReceived || [];
  res.json({ success: true, requests });
});

app.post('/api/friends/respond', (req: Request, res: Response) => {
  const { username, requesterUsername, action } = req.body;
  if (!username || !requesterUsername || !action) {
    return res.status(400).json({ success: false, message: 'Parâmetros incompletos.' });
  }

  const db = readSyncDb();
  const userFound = findUserRecord(db, username);
  const requesterFound = findUserRecord(db, requesterUsername);

  if (!userFound || !requesterFound) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  const user = userFound.record;
  const requester = requesterFound.record;

  user.userStats = user.userStats || {};
  requester.userStats = requester.userStats || {};
  user.userStats.friends = user.userStats.friends || [];
  requester.userStats.friends = requester.userStats.friends || [];
  user.userStats.friendRequestsReceived = user.userStats.friendRequestsReceived || [];
  requester.userStats.friendRequestsSent = requester.userStats.friendRequestsSent || [];

  // Remove request from user's received
  user.userStats.friendRequestsReceived = user.userStats.friendRequestsReceived.filter(
    (r: any) => normalizeString(r.fromUsername) !== normalizeString(requesterUsername)
  );
  // Remove request from requester's sent
  requester.userStats.friendRequestsSent = requester.userStats.friendRequestsSent.filter(
    (u: string) => normalizeString(u) !== normalizeString(username)
  );

  if (action === 'accept') {
    // Add to user's friends list
    if (!user.userStats.friends.some((f: any) => normalizeString(f.username) === normalizeString(requesterUsername))) {
      user.userStats.friends.push({
        username: requester.username || requester.userStats.username || requesterUsername,
        avatarUrl: requester.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        xp: Number(requester.userStats.xp) || 0,
        level: Number(requester.userStats.level) || 1,
        streak: Number(requester.userStats.streak) || 0,
        activeTitle: requester.userStats.activeTitle || 'Aluno de Libras',
        addedAt: new Date().toISOString(),
      });
    }

    // Add to requester's friends list
    if (!requester.userStats.friends.some((f: any) => normalizeString(f.username) === normalizeString(username))) {
      requester.userStats.friends.push({
        username: user.username || user.userStats.username || username,
        avatarUrl: user.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        xp: Number(user.userStats.xp) || 0,
        level: Number(user.userStats.level) || 1,
        streak: Number(user.userStats.streak) || 0,
        activeTitle: user.userStats.activeTitle || 'Aluno de Libras',
        addedAt: new Date().toISOString(),
      });
    }
  }

  updateUserRecord(db, user);
  updateUserRecord(db, requester);
  writeSyncDb(db);

  res.json({
    success: true,
    message: action === 'accept' ? `Amizade com ${requesterUsername} confirmada!` : `Solicitação de ${requesterUsername} recusada.`,
    friends: user.userStats.friends,
  });
});

app.get('/api/friends/list/:username', (req: Request, res: Response) => {
  const username = req.params.username;
  const db = readSyncDb();
  const userFound = findUserRecord(db, username);

  if (!userFound) {
    return res.json({ success: true, friends: [] });
  }

  const user = userFound.record;
  const storedFriends = user.userStats?.friends || [];

  // Re-hydrate each friend with fresh stats from database
  const liveFriends = storedFriends.map((f: any) => {
    const friendRecord = findUserRecord(db, f.username);
    if (friendRecord && friendRecord.record.userStats) {
      const stats = friendRecord.record.userStats;
      return {
        username: f.username,
        avatarUrl: stats.avatarUrl || f.avatarUrl,
        xp: Number(stats.xp) ?? f.xp ?? 0,
        level: Number(stats.level) ?? f.level ?? 1,
        streak: Number(stats.streak) ?? f.streak ?? 0,
        activeTitle: stats.activeTitle || f.activeTitle || 'Aluno de Libras',
        addedAt: f.addedAt || new Date().toISOString(),
      };
    }
    return f;
  });

  liveFriends.sort((a: any, b: any) => b.xp - a.xp);
  res.json({ success: true, friends: liveFriends });
});

app.delete('/api/friends/remove', (req: Request, res: Response) => {
  const { username, friendUsername } = req.body;
  if (!username || !friendUsername) {
    return res.status(400).json({ success: false, message: 'Usuários obrigatórios.' });
  }

  const db = readSyncDb();
  const userFound = findUserRecord(db, username);
  const friendFound = findUserRecord(db, friendUsername);

  if (userFound && userFound.record.userStats?.friends) {
    userFound.record.userStats.friends = userFound.record.userStats.friends.filter(
      (f: any) => normalizeString(f.username) !== normalizeString(friendUsername)
    );
    updateUserRecord(db, userFound.record);
  }

  if (friendFound && friendFound.record.userStats?.friends) {
    friendFound.record.userStats.friends = friendFound.record.userStats.friends.filter(
      (f: any) => normalizeString(f.username) !== normalizeString(username)
    );
    updateUserRecord(db, friendFound.record);
  }

  writeSyncDb(db);
  res.json({ success: true, message: 'Amigo removido com sucesso.' });
});

// WEEKLY CHALLENGES
app.post('/api/challenges/create', (req: Request, res: Response) => {
  const { challengerUsername, targetUsername, goalXp } = req.body;
  if (!challengerUsername || !targetUsername) {
    return res.status(400).json({ success: false, message: 'Dados incompletos para criar desafio.' });
  }

  const db = readSyncDb();
  const challengerFound = findUserRecord(db, challengerUsername);
  const targetFound = findUserRecord(db, targetUsername);

  if (!challengerFound || !targetFound) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  const challenger = challengerFound.record;
  const target = targetFound.record;

  challenger.userStats = challenger.userStats || {};
  target.userStats = target.userStats || {};
  challenger.userStats.weeklyChallenges = challenger.userStats.weeklyChallenges || [];
  target.userStats.weeklyChallenges = target.userStats.weeklyChallenges || [];

  const goal = Number(goalXp) || 300;
  const challengeId = `chal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const sharedChallenge = {
    id: challengeId,
    challengerUsername: challenger.username || challenger.userStats.username || challengerUsername,
    challengerAvatarUrl: challenger.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    targetUsername: target.username || target.userStats.username || targetUsername,
    targetAvatarUrl: target.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    challengerXpAtStart: Number(challenger.userStats.xp) || 0,
    targetXpAtStart: Number(target.userStats.xp) || 0,
    goalXp: goal,
    weekStartDate: new Date().toISOString(),
    weekEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    xpReward: goal,
    gemsReward: goal >= 500 ? 150 : 80,
    status: 'em_andamento',
    isClaimed: false,
  };

  challenger.userStats.weeklyChallenges.unshift(sharedChallenge);
  target.userStats.weeklyChallenges.unshift(sharedChallenge);

  updateUserRecord(db, challenger);
  updateUserRecord(db, target);
  writeSyncDb(db);

  res.json({ success: true, challenge: sharedChallenge });
});

app.get('/api/challenges/:username', (req: Request, res: Response) => {
  const username = req.params.username;
  const db = readSyncDb();
  const userFound = findUserRecord(db, username);

  if (!userFound) {
    return res.json({ success: true, challenges: [] });
  }

  const rawChallenges = userFound.record.userStats?.weeklyChallenges || [];

  const updatedChallenges = rawChallenges.map((c: any) => {
    const isChallenger = normalizeString(c.challengerUsername) === normalizeString(username);
    const oppName = isChallenger ? c.targetUsername : c.challengerUsername;
    const oppRecord = findUserRecord(db, oppName);
    const currUserRecord = findUserRecord(db, username);

    const userCurrentXp = Number(currUserRecord?.record.userStats?.xp) || 0;
    const oppCurrentXp = Number(oppRecord?.record.userStats?.xp) || 0;

    const userStart = isChallenger ? c.challengerXpAtStart : c.targetXpAtStart;
    const oppStart = isChallenger ? c.targetXpAtStart : c.challengerXpAtStart;

    const userGained = Math.max(0, userCurrentXp - userStart);
    const oppGained = Math.max(0, oppCurrentXp - oppStart);

    let status = c.status;
    if (status === 'em_andamento') {
      if (userGained >= c.goalXp && userGained > oppGained) {
        status = 'vitoria';
      } else if (oppGained >= c.goalXp && oppGained > userGained) {
        status = 'derrota';
      } else if (userGained >= c.goalXp && oppGained >= c.goalXp) {
        status = 'vitoria';
      }
    }

    return {
      ...c,
      userXpGained: userGained,
      oppXpGained: oppGained,
      status,
    };
  });

  res.json({ success: true, challenges: updatedChallenges });
});

app.post('/api/challenges/claim', (req: Request, res: Response) => {
  const { username, challengeId } = req.body;
  const db = readSyncDb();
  const userFound = findUserRecord(db, username);

  if (!userFound || !userFound.record.userStats) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }

  const user = userFound.record;
  const challenges = user.userStats.weeklyChallenges || [];
  const targetChallenge = challenges.find((c: any) => c.id === challengeId);

  if (!targetChallenge) {
    return res.status(404).json({ success: false, message: 'Desafio não encontrado.' });
  }

  if (targetChallenge.isClaimed) {
    return res.status(400).json({ success: false, message: 'Recompensa deste desafio já foi resgatada.' });
  }

  targetChallenge.isClaimed = true;
  targetChallenge.status = 'vitoria';
  user.userStats.xp = (Number(user.userStats.xp) || 0) + targetChallenge.xpReward;
  user.userStats.gems = (Number(user.userStats.gems) || 0) + targetChallenge.gemsReward;

  updateUserRecord(db, user);
  writeSyncDb(db);

  res.json({
    success: true,
    message: `Parabéns! Você resgatou +${targetChallenge.xpReward} XP e +${targetChallenge.gemsReward} diamantes!`,
    userStats: user.userStats,
  });
});

app.post('/api/admin/users/adjust', (req: Request, res: Response) => {
  const { username, gemsDelta, xpDelta, refillHearts, resetProgress } = req.body;
  if (!username) {
    return res.status(400).json({ success: false, message: 'Nome de usuário obrigatório.' });
  }

  const db = readSyncDb();
  let targetEntry: any = null;

  for (const [_, val] of Object.entries(db)) {
    if (val && (val.username === username || (val.userStats && val.userStats.username === username))) {
      targetEntry = val;
      break;
    }
  }

  if (targetEntry && targetEntry.userStats) {
    if (gemsDelta) {
      targetEntry.userStats.gems = Math.max(0, (targetEntry.userStats.gems || 0) + Number(gemsDelta));
    }
    if (xpDelta) {
      targetEntry.userStats.xp = Math.max(0, (targetEntry.userStats.xp || 0) + Number(xpDelta));
      targetEntry.userStats.level = Math.max(1, Math.floor(targetEntry.userStats.xp / 150) + 1);
    }
    if (refillHearts) {
      targetEntry.userStats.hearts = targetEntry.userStats.maxHearts || 5;
    }
    if (resetProgress) {
      targetEntry.userStats.completedLessonIds = [];
      targetEntry.userStats.xp = 0;
      targetEntry.userStats.level = 1;
      targetEntry.userStats.streak = 1;
    }
    targetEntry.updatedAt = new Date().toISOString();
    writeSyncDb(db);
  }

  logAdminAction(
    'Ajuste de Usuário',
    `Usuário "${username}" ajustado (Gems Delta: ${gemsDelta || 0}, XP Delta: ${xpDelta || 0}).`
  );

  res.json({ success: true, message: `Ajustes aplicados ao usuário ${username} com sucesso!` });
});

// === ANTI-BOT ADMIN BEGIN ===
function deleteAccounts(targetKey: string, targetUsername: string): number {
  const db = readSyncDb();
  let deletedCount = 0;
  for (const [k, val] of Object.entries(db)) {
    const valUsername = (val?.username || val?.userStats?.username || '').toLowerCase().trim();
    const valSyncCode = (val?.syncCode || val?.userStats?.syncCode || '').toUpperCase().trim();
    const matchesKey = k === targetKey || k.toLowerCase() === targetKey.toLowerCase();
    const matchesUsername = targetUsername && valUsername === targetUsername;
    const matchesUserKey = targetKey && valUsername === targetKey.toLowerCase();
    const matchesSyncCode = targetKey && valSyncCode === targetKey.toUpperCase();
    if (matchesKey || matchesUsername || matchesUserKey || matchesSyncCode) {
      delete db[k];
      deletedCount++;
    }
  }
  writeSyncDb(db);
  return deletedCount;
}

/** Contas com sinais de serem falsas. Inclui as que a lista normal de alunos esconde (nomes de robô). */
app.get('/api/admin/suspects', (_req: Request, res: Response) => {
  const db = readSyncDb();
  const byName = new Map<string, any>();
  for (const [key, val] of Object.entries(db)) {
    if (!val?.userStats) continue;
    const uname = String(val.username || val.userStats.username || key.replace(/^USER_/, '')).trim();
    const norm = normalizeString(uname);
    if (!norm || CONFIRMED_TEST_ACCOUNT_NAMES.has(norm)) continue;
    const prev = byName.get(norm);
    if (!prev || (Date.parse(val.updatedAt || '') || 0) > (Date.parse(prev.val.updatedAt || '') || 0)) byName.set(norm, { key, uname, val });
  }
  const ipCount = new Map<string, number>();
  for (const { val } of byName.values()) {
    if (val.signupIpHash) ipCount.set(val.signupIpHash, (ipCount.get(val.signupIpHash) || 0) + 1);
  }
  const now = Date.now();
  const suspects: any[] = [];
  for (const { key, uname, val } of byName.values()) {
    const flags: { id: string; label: string; strong: boolean }[] = [];
    if (isAutomatedAccountName(uname) || looksAutomatedName(uname)) {
      flags.push({ id: 'name', label: 'Nome com cara de robô/IA', strong: true });
    }
    const sameIp = val.signupIpHash ? ipCount.get(val.signupIpHash) || 0 : 0;
    if (sameIp >= 4) flags.push({ id: 'ip', label: `${sameIp} contas criadas da mesma rede`, strong: false });
    const st = val.userStats;
    const created = Date.parse(val.createdAt || st.createdAt || '') || 0;
    const idle = (Number(st.xp) || 0) === 0 && (st.completedLessonIds?.length || 0) === 0 && (Number(st.perfectSignsCount) || 0) === 0;
    if (idle && created && now - created > 7 * 86400000) flags.push({ id: 'idle', label: 'Sem nenhuma atividade há mais de 7 dias', strong: false });
    if (flags.length === 0) continue;
    suspects.push({
      key,
      username: uname,
      syncCode: val.syncCode || st.syncCode || '',
      createdAt: val.createdAt || st.createdAt || null,
      xp: Number(st.xp) || 0,
      lessons: st.completedLessonIds?.length || 0,
      flags,
      score: flags.reduce((s, f) => s + (f.strong ? 3 : 1), 0),
    });
  }
  suspects.sort((a, b) => b.score - a.score);
  res.json({ success: true, suspects });
});

app.post('/api/admin/users/purge', (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.accounts) ? req.body.accounts.slice(0, 200) : [];
  if (items.length === 0) return res.status(400).json({ success: false, message: 'Nenhuma conta selecionada.' });
  let deleted = 0;
  const names: string[] = [];
  for (const it of items) {
    const key = String(it?.key || '').trim();
    const username = String(it?.username || '').toLowerCase().trim();
    if (!key && !username) continue;
    if (deleteAccounts(key, username) > 0) {
      deleted++;
      names.push(String(it?.username || key).slice(0, 30));
    }
  }
  logAdminAction('Contas Suspeitas Excluídas', `${deleted} conta(s) removida(s) em lote: ${names.slice(0, 20).join(', ')}${names.length > 20 ? '…' : ''}.`);
  res.json({ success: true, deleted, message: `${deleted} conta(s) excluída(s).` });
});
// === ANTI-BOT ADMIN END ===

app.delete('/api/admin/users/:key', (req: Request, res: Response) => {
  const targetKey = decodeURIComponent(req.params.key).trim();
  const targetUsername = (req.query.username as string || '').toLowerCase().trim();
  const deletedCount = deleteAccounts(targetKey, targetUsername);

  logAdminAction(
    'Conta de Aluno Excluída',
    `Aluno "${targetUsername || targetKey}" removido permanentemente do banco de dados (${deletedCount} chaves limpas).`
  );
  res.json({
    success: true,
    message: `Conta do aluno "${targetUsername || targetKey}" foi excluída com sucesso.`,
    deletedCount,
  });
});

// -------------------------------------------------------------
// ADMIN USER SOCIAL MANAGEMENT (FRIENDS & WEEKLY CHALLENGES)
// -------------------------------------------------------------
app.get('/api/admin/users/:username/social', (req: Request, res: Response) => {
  const username = decodeURIComponent(req.params.username);
  const db = readSyncDb();
  const found = findUserRecord(db, username);
  if (!found || !found.record.userStats) {
    return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
  }
  const friends = found.record.userStats.friends || [];
  const weeklyChallenges = found.record.userStats.weeklyChallenges || [];
  res.json({
    success: true,
    friends,
    weeklyChallenges,
    friendRequestsReceived: found.record.userStats.friendRequestsReceived || [],
    friendRequestsSent: found.record.userStats.friendRequestsSent || [],
  });
});

app.post('/api/admin/users/:username/friends/add', (req: Request, res: Response) => {
  const username = decodeURIComponent(req.params.username);
  const { friendUsername } = req.body;
  if (!friendUsername) {
    return res.status(400).json({ success: false, message: 'Nome do amigo é obrigatório.' });
  }

  const db = readSyncDb();
  const userFound = findUserRecord(db, username);
  const friendFound = findUserRecord(db, friendUsername);

  if (!userFound || !friendFound) {
    return res.status(404).json({ success: false, message: 'Um ou ambos os usuários não foram encontrados no banco.' });
  }

  const user = userFound.record;
  const friend = friendFound.record;

  user.userStats = user.userStats || {};
  friend.userStats = friend.userStats || {};
  user.userStats.friends = user.userStats.friends || [];
  friend.userStats.friends = friend.userStats.friends || [];

  const userRealName = user.username || user.userStats.username || username;
  const friendRealName = friend.username || friend.userStats.username || friendUsername;

  // Add friend to user
  if (!user.userStats.friends.some((f: any) => normalizeString(f.username) === normalizeString(friendRealName))) {
    user.userStats.friends.push({
      username: friendRealName,
      avatarUrl: friend.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      xp: Number(friend.userStats.xp) || 0,
      level: Number(friend.userStats.level) || 1,
      streak: Number(friend.userStats.streak) || 0,
      activeTitle: friend.userStats.activeTitle || 'Aluno de Libras',
      addedAt: new Date().toISOString(),
    });
  }

  // Add user to friend
  if (!friend.userStats.friends.some((f: any) => normalizeString(f.username) === normalizeString(userRealName))) {
    friend.userStats.friends.push({
      username: userRealName,
      avatarUrl: user.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      xp: Number(user.userStats.xp) || 0,
      level: Number(user.userStats.level) || 1,
      streak: Number(user.userStats.streak) || 0,
      activeTitle: user.userStats.activeTitle || 'Aluno de Libras',
      addedAt: new Date().toISOString(),
    });
  }

  updateUserRecord(db, user);
  updateUserRecord(db, friend);
  writeSyncDb(db);

  logAdminAction(
    'Amizade Vinculada pelo Admin',
    `Administrador adicionou vínculo de amizade entre "${userRealName}" e "${friendRealName}".`
  );

  res.json({
    success: true,
    message: `Amizade entre ${userRealName} e ${friendRealName} criada com sucesso!`,
    friends: user.userStats.friends,
  });
});

app.post('/api/admin/users/:username/friends/remove', (req: Request, res: Response) => {
  const username = decodeURIComponent(req.params.username);
  const { friendUsername } = req.body;
  if (!friendUsername) {
    return res.status(400).json({ success: false, message: 'Nome do amigo a remover é obrigatório.' });
  }

  const db = readSyncDb();
  const userFound = findUserRecord(db, username);
  const friendFound = findUserRecord(db, friendUsername);

  if (userFound && userFound.record.userStats?.friends) {
    userFound.record.userStats.friends = userFound.record.userStats.friends.filter(
      (f: any) => normalizeString(f.username) !== normalizeString(friendUsername)
    );
    updateUserRecord(db, userFound.record);
  }

  if (friendFound && friendFound.record.userStats?.friends) {
    friendFound.record.userStats.friends = friendFound.record.userStats.friends.filter(
      (f: any) => normalizeString(f.username) !== normalizeString(username)
    );
    updateUserRecord(db, friendFound.record);
  }

  writeSyncDb(db);

  logAdminAction(
    'Amizade Removida pelo Admin',
    `Administrador removeu a amizade entre "${username}" e "${friendUsername}".`
  );

  res.json({
    success: true,
    message: `Amizade com ${friendUsername} removida com sucesso.`,
    friends: userFound?.record.userStats?.friends || [],
  });
});

app.post('/api/admin/users/:username/challenges/add', (req: Request, res: Response) => {
  const username = decodeURIComponent(req.params.username);
  const targetUsername = req.body.targetUsername || req.body.opponentUsername;
  const goalXp = req.body.goalXp || req.body.goalXP;
  if (!targetUsername) {
    return res.status(400).json({ success: false, message: 'Oponente do desafio é obrigatório.' });
  }

  const db = readSyncDb();
  const userFound = findUserRecord(db, username);
  const targetFound = findUserRecord(db, targetUsername);

  if (!userFound || !targetFound) {
    return res.status(404).json({ success: false, message: 'Um ou ambos os usuários não foram encontrados.' });
  }

  const challenger = userFound.record;
  const target = targetFound.record;

  challenger.userStats = challenger.userStats || {};
  target.userStats = target.userStats || {};
  challenger.userStats.weeklyChallenges = challenger.userStats.weeklyChallenges || [];
  target.userStats.weeklyChallenges = target.userStats.weeklyChallenges || [];

  const goal = Number(goalXp) || 300;
  const challengeId = `chal_adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const sharedChallenge = {
    id: challengeId,
    challengerUsername: challenger.username || challenger.userStats.username || username,
    challengerAvatarUrl: challenger.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    targetUsername: target.username || target.userStats.username || targetUsername,
    targetAvatarUrl: target.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    challengerXpAtStart: Number(challenger.userStats.xp) || 0,
    targetXpAtStart: Number(target.userStats.xp) || 0,
    goalXp: goal,
    weekStartDate: new Date().toISOString(),
    weekEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    xpReward: goal,
    gemsReward: goal >= 500 ? 150 : 80,
    status: 'em_andamento',
    isClaimed: false,
  };

  challenger.userStats.weeklyChallenges.unshift(sharedChallenge);
  target.userStats.weeklyChallenges.unshift(sharedChallenge);

  updateUserRecord(db, challenger);
  updateUserRecord(db, target);
  writeSyncDb(db);

  logAdminAction(
    'Desafio Atribuído pelo Admin',
    `Administrador criou duelo semanal de ${goal} XP entre "${challenger.username || username}" e "${target.username || targetUsername}".`
  );

  res.json({
    success: true,
    message: `Desafio criado com sucesso!`,
    challenge: sharedChallenge,
    weeklyChallenges: challenger.userStats.weeklyChallenges,
  });
});

app.delete('/api/admin/users/:username/challenges/:challengeId', (req: Request, res: Response) => {
  const username = decodeURIComponent(req.params.username);
  const challengeId = req.params.challengeId;

  const db = readSyncDb();
  let deletedFromUsers: string[] = [];

  for (const [_, val] of Object.entries(db)) {
    if (val && val.userStats && Array.isArray(val.userStats.weeklyChallenges)) {
      const initLen = val.userStats.weeklyChallenges.length;
      val.userStats.weeklyChallenges = val.userStats.weeklyChallenges.filter((c: any) => c.id !== challengeId);
      if (val.userStats.weeklyChallenges.length < initLen) {
        const u = val.username || val.userStats.username || 'aluno';
        if (!deletedFromUsers.includes(u)) deletedFromUsers.push(u);
      }
    }
  }

  writeSyncDb(db);

  logAdminAction(
    'Desafio Cancelado pelo Admin',
    `Administrador excluiu o desafio "${challengeId}" de ${deletedFromUsers.join(', ')}.`
  );

  res.json({
    success: true,
    message: `Desafio excluído com sucesso do perfil do aluno.`,
  });
});

app.get('/api/admin/realtime-feed', (_req: Request, res: Response) => {
  const db = readSyncDb();
  const adminState = readAdminState();

  const userList: any[] = [];
  const seenUsernames = new Set<string>();

  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

  let totalCompletedLessons = 0;
  let totalXP = 0;
  let activeUsers24h = 0;
  let activeUsers7d = 0;

  for (const [key, val] of Object.entries(db)) {
    if (val && val.userStats) {
      const uname = (val.username || val.userStats.username || key.replace(/^USER_/, '')).trim();
      const norm = normalizeString(uname);
      if (isHiddenFromRealUsers(uname) || seenUsernames.has(norm)) continue;
      seenUsernames.add(norm);
      const role = val.role || val.userStats.role || (norm === 'marinette' || norm === 'admin' ? 'admin' : 'learner');

      const userXp = Number(val.userStats.xp) || 0;
      const completedCount = Array.isArray(val.userStats.completedLessonIds) ? val.userStats.completedLessonIds.length : 0;
      totalXP += userXp;
      totalCompletedLessons += completedCount;

      const lastActiveIso = val.updatedAt || val.userStats.lastActiveDate || null;
      let lastActiveTime = lastActiveIso ? new Date(lastActiveIso).getTime() : 0;
      if (isNaN(lastActiveTime)) lastActiveTime = 0;

      if (lastActiveTime > 0) {
        if (now - lastActiveTime <= ONE_DAY_MS) {
          activeUsers24h++;
        }
        if (now - lastActiveTime <= SEVEN_DAYS_MS) {
          activeUsers7d++;
        }
      } else {
        activeUsers7d++;
      }

      const createdAt = val.createdAt || val.userStats.createdAt || val.updatedAt || new Date().toISOString();

      userList.push({
        key,
        username: uname,
        syncCode: val.syncCode || val.userStats.syncCode || '---',
        avatarUrl: val.userStats.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        xp: userXp,
        level: Number(val.userStats.level) || 1,
        gems: Number(val.userStats.gems) || 0,
        hearts: val.userStats.hearts ?? 5,
        streak: Number(val.userStats.streak) || 0,
        completedLessonsCount: completedCount,
        lastActive: val.updatedAt || val.userStats.lastActiveDate || 'Hoje',
        createdAt,
        activeTitle: val.userStats.activeTitle || (role === 'admin' ? 'Administradora' : 'Aprendiz Curioso'),
        equippedSkin: val.userStats.equippedMascot?.skin || 'skin_esmeralda',
        friendsCount: Array.isArray(val.userStats.friends) ? val.userStats.friends.length : 0,
        challengesCount: Array.isArray(val.userStats.weeklyChallenges) ? val.userStats.weeklyChallenges.length : 0,
        friends: val.userStats.friends || [],
        weeklyChallenges: val.userStats.weeklyChallenges || [],
        role,
      });
    }
  }

  // Ordena com a Administradora no topo
  userList.sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return (b.xp || 0) - (a.xp || 0);
  });

  const unreadFeedbacks = (adminState.feedbacks || []).filter((f) => f.status === 'pendente');
  const resolvedFeedbacks = (adminState.feedbacks || []).filter((f) => f.status === 'resolvido');
  const bugReportsCount = (adminState.feedbacks || []).filter((f) => f.type === 'erro' || f.type === 'reclamacao').length;
  const recentLogs = (adminState.auditLogs || []).slice(0, 15);

  // Generate real event stream from real audit logs, feedbacks, and new users
  const events: any[] = [];

  // Real feedback events
  (adminState.feedbacks || []).slice(0, 10).forEach((fb) => {
    events.push({
      id: `ev_fb_${fb.id}`,
      type: 'new_feedback',
      title: `Feedback [${fb.type.toUpperCase()}]: ${fb.title}`,
      description: `Enviado por ${fb.username} (${fb.status})`,
      timestamp: fb.createdAt,
      username: fb.username,
      metadata: { feedbackId: fb.id, status: fb.status, priority: fb.priority },
    });
  });

  // Real audit logs events (e.g. registrations, status updates, admin actions)
  recentLogs.forEach((log) => {
    const isNewUser = log.action === 'Novo Aluno Registrado';
    events.push({
      id: `ev_log_${log.id}`,
      type: isNewUser ? 'new_account' : 'log_action',
      title: log.action,
      description: log.details,
      timestamp: log.timestamp,
      username: log.adminName || undefined,
    });
  });

  // Sort events by timestamp descending
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const stats = {
    totalAccounts: userList.length,
    activeUsers24h,
    activeUsers7d,
    totalCompletedLessons,
    totalXP,
    pendingFeedbacks: unreadFeedbacks.length,
    resolvedFeedbacks: resolvedFeedbacks.length,
    bugReportsCount,
  };

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalUsers: userList.length,
    stats,
    users: userList,
    events: events.slice(0, 20),
    pendingFeedbacksCount: unreadFeedbacks.length,
    pendingFeedbacks: unreadFeedbacks,
    recentAuditLogs: recentLogs,
  });
});

// -------------------------------------------------------------
// ADMIN MEDIA (VIDEOS & IMAGES) MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/media', (_req: Request, res: Response) => {
  const adminState = readAdminState();
  res.json({ success: true, media: adminState.mediaItems || [] });
});

app.post('/api/admin/media', (req: Request, res: Response) => {
  const { title, category, url, description, tags, signId } = req.body;
  if (!title || !url) {
    return res.status(400).json({ success: false, message: 'Título e URL são obrigatórios.' });
  }

  const adminState = readAdminState();
  const newItem: MediaItem = {
    id: `media_${Date.now()}`,
    title: title.trim(),
    category: category || 'video',
    url: url.trim(),
    description: (description || '').trim(),
    tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t: string) => t.trim()) : []),
    signId,
    createdAt: new Date().toISOString(),
    isCustom: true,
  };

  adminState.mediaItems.unshift(newItem);
  writeAdminState(adminState);

  logAdminAction('Mídia Adicionada', `Mídia "${title}" (${category}) salva e sincronizada.`);
  res.json({ success: true, message: 'Mídia salva e sincronizada para todos os dispositivos!', media: newItem });
});

app.delete('/api/admin/media/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const adminState = readAdminState();
  adminState.mediaItems = (adminState.mediaItems || []).filter((m) => m.id !== id);
  writeAdminState(adminState);

  logAdminAction('Mídia Removida', `Mídia ID "${id}" excluída.`);
  res.json({ success: true, message: 'Mídia removida com sucesso.' });
});

// -------------------------------------------------------------
// ADMIN PROMO CODES MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/promo-codes', (_req: Request, res: Response) => {
  const adminState = readAdminState();
  res.json({ success: true, promoCodes: adminState.promoCodes || [] });
});

app.post('/api/admin/promo-codes', (req: Request, res: Response) => {
  const { code, rewardGems, rewardXp, rewardHearts, rewardChests, maxUses, expiresAt, description } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Código é obrigatório.' });
  }

  const adminState = readAdminState();
  const cleanCode = code.toUpperCase().trim();

  const exists = (adminState.promoCodes || []).find((p) => p.code.toUpperCase() === cleanCode);
  if (exists) {
    return res.status(400).json({ success: false, message: 'Este código promocional já existe.' });
  }

  const newPromo: PromoCode = {
    id: `promo_${Date.now()}`,
    code: cleanCode,
    rewardGems: Number(rewardGems) || 0,
    rewardXp: Number(rewardXp) || 0,
    rewardHearts: Number(rewardHearts) || 0,
    rewardChests: Number(rewardChests) || 0,
    maxUses: Number(maxUses) || 500,
    usedCount: 0,
    active: true,
    expiresAt: expiresAt || null,
    redeemedUsers: [],
    createdAt: new Date().toISOString(),
    createdBy: 'Administrador',
    description: description || 'Código especial de recompensas',
  };

  adminState.promoCodes = adminState.promoCodes || [];
  adminState.promoCodes.unshift(newPromo);
  writeAdminState(adminState);

  logAdminAction('Cupom Criado', `Novo cupom "${cleanCode}" (+${newPromo.rewardGems} gemas, +${newPromo.rewardChests || 0} baús) criado.`);
  res.json({ success: true, message: `Código de recompensa ${cleanCode} criado com sucesso!`, promoCode: newPromo });
});

app.patch('/api/admin/promo-codes/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const adminState = readAdminState();
  const promo = (adminState.promoCodes || []).find((p) => p.id === id);

  if (!promo) {
    return res.status(404).json({ success: false, message: 'Código não encontrado.' });
  }

  const { active, maxUses, expiresAt, description, rewardGems, rewardXp, rewardHearts, rewardChests } = req.body;
  if (typeof active === 'boolean') {
    promo.active = active;
  }
  if (typeof maxUses === 'number') {
    promo.maxUses = Math.max(1, maxUses);
  }
  if (expiresAt !== undefined) {
    promo.expiresAt = expiresAt || null;
  }
  if (description !== undefined) {
    promo.description = description;
  }
  if (typeof rewardGems === 'number') {
    promo.rewardGems = rewardGems;
  }
  if (typeof rewardXp === 'number') {
    promo.rewardXp = rewardXp;
  }
  if (typeof rewardHearts === 'number') {
    promo.rewardHearts = rewardHearts;
  }
  if (typeof rewardChests === 'number') {
    promo.rewardChests = rewardChests;
  }

  writeAdminState(adminState);
  logAdminAction(
    promo.active ? 'Cupom Ativado/Atualizado' : 'Cupom Desativado',
    `Código "${promo.code}" atualizado (Ativo: ${promo.active}, Limite: ${promo.maxUses}).`
  );

  res.json({ success: true, message: `Código ${promo.code} atualizado com sucesso!`, promoCode: promo });
});

app.delete('/api/admin/promo-codes/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const adminState = readAdminState();
  const deleted = (adminState.promoCodes || []).find((p) => p.id === id);
  adminState.promoCodes = (adminState.promoCodes || []).filter((p) => p.id !== id);
  writeAdminState(adminState);

  logAdminAction('Cupom Excluído', `Código "${deleted?.code || id}" removido.`);
  res.json({ success: true, message: 'Código excluído com sucesso.' });
});

// -------------------------------------------------------------
// ADMIN ANNOUNCEMENTS MANAGEMENT
// -------------------------------------------------------------
app.get('/api/admin/announcements', (_req: Request, res: Response) => {
  const adminState = readAdminState();
  res.json({ success: true, announcements: adminState.announcements || [] });
});

app.post('/api/admin/announcements', (req: Request, res: Response) => {
  const { title, message, type, active, ctaText, ctaTab } = req.body;
  if (!title || !message) {
    return res.status(400).json({ success: false, message: 'Título e mensagem são obrigatórios.' });
  }

  const adminState = readAdminState();
  const newAnn: SystemAnnouncement = {
    id: `ann_${Date.now()}`,
    title: title.trim(),
    message: message.trim(),
    type: type || 'info',
    active: active !== undefined ? active : true,
    createdAt: new Date().toISOString(),
    ctaText,
    ctaTab,
  };

  adminState.announcements.unshift(newAnn);
  writeAdminState(adminState);

  logAdminAction('Aviso Publicado', `Novo aviso publicado: "${title}".`);
  res.json({ success: true, message: 'Aviso publicado e sincronizado para todos os alunos!', announcement: newAnn });
});

app.delete('/api/admin/announcements/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const adminState = readAdminState();
  adminState.announcements = (adminState.announcements || []).filter((a) => a.id !== id);
  writeAdminState(adminState);

  logAdminAction('Aviso Removido', `Aviso ID "${id}" excluído.`);
  res.json({ success: true, message: 'Aviso removido com sucesso.' });
});

// -------------------------------------------------------------
// ADMIN AUDIT LOGS
// -------------------------------------------------------------
app.get('/api/admin/logs', (_req: Request, res: Response) => {
  const adminState = readAdminState();
  res.json({ success: true, logs: adminState.auditLogs || [] });
});

// -------------------------------------------------------------
// USER FEEDBACKS (SUGESTÕES, RECLAMAÇÕES, ERROS, ELOGIOS)
// -------------------------------------------------------------
app.get('/api/feedbacks', (req: Request, res: Response) => {
  const adminState = readAdminState();
  const username = (req.query.username as string)?.trim().toLowerCase();
  let list = adminState.feedbacks || [];
  if (username) {
    list = list.filter((f) => f.username.toLowerCase() === username);
  }
  res.json({ success: true, feedbacks: list });
});

app.post('/api/feedbacks', (req: Request, res: Response) => {
  const { username, syncCode, type, title, description, priority } = req.body;
  
  // Validation for real human user (no blank/fake bot names)
  const cleanUser = (username || '').trim();
  const cleanTitle = (title || '').trim();
  const cleanDesc = (description || '').trim();

  if (isArchivedBlockedAccount(cleanUser) || isAutomatedAccountName(cleanUser)) {
    return res.status(403).json({ success: false, message: 'Perfis arquivados ou automáticos não podem enviar feedback.' });
  }

  if (!cleanUser || cleanUser.length < 2) {
    return res.status(400).json({ success: false, message: 'Nome de usuário inválido ou muito curto.' });
  }

  // Prevent bot / spam prefixes
  if (/^(bot_|testbot|fake_|ai_)/i.test(cleanUser)) {
    return res.status(400).json({ success: false, message: 'Nomes de robôs ou contas automáticas não são permitidos.' });
  }

  if (!cleanTitle || cleanTitle.length < 3) {
    return res.status(400).json({ success: false, message: 'Por favor, informe um título ou assunto para seu feedback.' });
  }

  if (!cleanDesc || cleanDesc.length < 5) {
    return res.status(400).json({ success: false, message: 'Por favor, forneça mais detalhes em sua mensagem (mínimo 5 caracteres).' });
  }

  const validTypes = ['sugestao', 'erro', 'reclamacao', 'elogio'];
  const feedbackType = validTypes.includes(type) ? type : 'sugestao';

  const newFeedback: UserFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUser,
    syncCode: (syncCode || '').trim() || undefined,
    type: feedbackType,
    title: cleanTitle,
    description: cleanDesc,
    priority: priority === 'alta' || priority === 'baixa' ? priority : 'media',
    status: 'pendente',
    createdAt: new Date().toISOString(),
  };

  const adminState = readAdminState();
  adminState.feedbacks = adminState.feedbacks || [];
  adminState.feedbacks.unshift(newFeedback);
  writeAdminState(adminState);

  logAdminAction(
    'Novo Feedback Recebido',
    `Feedback de ${cleanUser} [${feedbackType.toUpperCase()}]: "${cleanTitle}"`
  );

  res.json({
    success: true,
    message: 'Feedback enviado com sucesso! O administrador analisará sua mensagem em breve.',
    feedback: newFeedback,
  });
});

app.patch('/api/admin/feedbacks/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const { status, adminReply } = req.body;

  const adminState = readAdminState();
  const fb = (adminState.feedbacks || []).find((f) => f.id === id);

  if (!fb) {
    return res.status(404).json({ success: false, message: 'Feedback não encontrado.' });
  }

  if (status) {
    fb.status = status;
  }
  if (adminReply !== undefined) {
    fb.adminReply = adminReply.trim();
    fb.repliedAt = new Date().toISOString();
  }

  writeAdminState(adminState);
  logAdminAction('Feedback Atualizado', `Feedback ID "${id}" atualizado para status "${fb.status}".`);

  res.json({
    success: true,
    message: 'Feedback atualizado e resposta registrada com sucesso!',
    feedback: fb,
  });
});

app.delete('/api/admin/feedbacks/:id', (req: Request, res: Response) => {
  const id = decodeURIComponent(req.params.id).trim();
  const adminState = readAdminState();
  const initLen = (adminState.feedbacks || []).length;
  adminState.feedbacks = (adminState.feedbacks || []).filter((f) => f.id !== id && f.id !== req.params.id);
  const removed = initLen - (adminState.feedbacks || []).length;
  writeAdminState(adminState);

  logAdminAction('Feedback Removido', `Feedback ID "${id}" excluído pelo administrador.`);
  res.json({ success: true, message: 'Feedback removido com sucesso.', removed });
});

// -------------------------------------------------------------
// SERVER SETUP & VITE MIDDLEWARE
// -------------------------------------------------------------
async function startServer() {
  ensureAdminCredentials();
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: {
          ignored: [
            '**/sync_data.json',
            '**/admin_state.json',
            '**/*.json',
            '**/*.bak',
            '**/.aistudio/**',
          ],
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LibrasGo Server running with Shared Cloud Sync on http://0.0.0.0:${PORT}`);
  });
}

startServer();
