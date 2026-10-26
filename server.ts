import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { LEARNING_MODULES } from './src/data/lessonsData';
import { LIBRAS_SIGNS } from './src/data/signsData';
import { MYSTERY_CHESTS } from './src/data/shopCatalogData';
import { LearningModule, LibrasSign, MysteryChest, MediaItem, PromoCode, SystemAnnouncement, AdminAuditLog, Lesson, UserFeedback } from './src/types/libras';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_FILE = path.join(__dirname, 'sync_data.json');
const ADMIN_STATE_FILE = path.join(__dirname, 'admin_state.json');

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
    passwordHash: 'libras2026',
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
app.get('/api/sync/generate-code', (_req: Request, res: Response) => {
  const num = Math.floor(1000 + Math.random() * 9000);
  const code = `LIB-${num}`;
  res.json({ success: true, syncCode: code });
});

app.post('/api/sync/save', (req: Request, res: Response) => {
  const { syncCode, username, userStats, missions } = req.body;
  if (!syncCode && !username) {
    return res.status(400).json({ error: 'Código de sincronização ou nome de usuário é obrigatório.' });
  }

  const db = readSyncDb();
  const codeKey = (syncCode || '').toUpperCase().trim();
  const userKey = username ? `USER_${username.toLowerCase().trim()}` : null;

  // Retrieve any existing taught signs so they are never lost on sync
  const existingRecord = (codeKey && db[codeKey]) || (userKey && db[userKey]);
  const existingSigns = existingRecord?.taughtSigns || [];

  const nowIso = new Date().toISOString();
  const isNewUser = (!codeKey || !db[codeKey]) && (!userKey || !db[userKey]);
  const createdAt = existingRecord?.createdAt || existingRecord?.userStats?.createdAt || (isNewUser ? nowIso : existingRecord?.updatedAt || nowIso);

  const mergedStats = {
    ...(userStats || {}),
    createdAt: userStats?.createdAt || createdAt,
  };

  const payload = {
    syncCode: codeKey,
    username: (username || '').trim(),
    userStats: mergedStats,
    missions,
    taughtSigns: existingSigns,
    createdAt,
    updatedAt: nowIso,
  };

  if (codeKey) {
    db[codeKey] = {
      ...payload,
      taughtSigns: db[codeKey]?.taughtSigns || existingSigns,
    };
  }
  if (userKey) {
    db[userKey] = {
      ...payload,
      taughtSigns: db[userKey]?.taughtSigns || existingSigns,
    };
  }

  writeSyncDb(db);

  if (isNewUser && username && username !== 'Você (Aprendiz)') {
    logAdminAction('Novo Aluno Registrado', `Novo estudante cadastrado no sistema: "${username}" com código ${codeKey}`);
  }

  res.json({ success: true, updatedAt: payload.updatedAt, createdAt: payload.createdAt, syncCode: payload.syncCode });
});

app.get('/api/sync/load/:code', (req: Request, res: Response) => {
  const rawCode = req.params.code.trim();
  const db = readSyncDb();

  let found = db[rawCode.toUpperCase()];
  if (!found) {
    const userKey = `USER_${rawCode.toLowerCase()}`;
    found = db[userKey];
  }

  if (found) {
    return res.json({ success: true, data: found });
  }

  return res.status(404).json({ success: false, error: 'Nenhum progresso encontrado com este código ou nome.' });
});

// -------------------------------------------------------------
// USER TAUGHT SIGNS TO AI (PRIVATE PER-USER PERSISTENCE)
// -------------------------------------------------------------
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

  writeSyncDb(db);
  res.json({ success: true, message: `Sinal "${savedSign.name}" aprendido e salvo com sucesso na sua conta!`, sign: savedSign });
});

app.delete('/api/user/custom-signs/:id', (req: Request, res: Response) => {
  const signId = req.params.id;
  const { username, syncCode } = req.query;

  const db = readSyncDb();
  let deleted = false;

  for (const [key, val] of Object.entries(db)) {
    if (val && Array.isArray(val.taughtSigns)) {
      const initLen = val.taughtSigns.length;
      val.taughtSigns = val.taughtSigns.filter((s: any) => s.id !== signId);
      if (val.taughtSigns.length < initLen) {
        deleted = true;
      }
    }
  }

  if (deleted) {
    writeSyncDb(db);
    return res.json({ success: true, message: 'Exemplo do sinal excluído com sucesso.' });
  }

  res.status(404).json({ success: false, message: 'Sinal não encontrado.' });
});

// -------------------------------------------------------------
// SERVER-AUTHORITATIVE PREMIUM SHOP PURCHASES
// Somente o servidor valida saldos, compras e alterações de inventário.
// -------------------------------------------------------------
app.post('/api/shop/purchase', (req: Request, res: Response) => {
  const { username, syncCode, itemId, category, costDiamonds, itemName } = req.body;

  const cost = Number(costDiamonds);
  if (isNaN(cost) || cost < 0) {
    return res.status(400).json({ success: false, message: 'Valor de Diamantes inválido.' });
  }

  if (!itemId || !category) {
    return res.status(400).json({ success: false, message: 'Dados do item incompletos.' });
  }

  const db = readSyncDb();
  const userKey = username ? `USER_${username.toLowerCase()}` : (syncCode ? syncCode.toUpperCase() : null);

  if (!userKey) {
    return res.status(400).json({ success: false, message: 'Identificação do usuário necessária para compra.' });
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

  const titleName = itemName || itemId;

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
app.post('/api/admin/auth/login', (req: Request, res: Response) => {
  const { username } = req.body;
  const adminState = readAdminState();

  const cleanUser = (username || '').trim();

  if (cleanUser.length >= 2) {
    const token = `adm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const session = {
      token,
      username: cleanUser,
      role: 'admin',
      loggedInAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      permissions: [
        'manage_users',
        'manage_activities',
        'manage_media',
        'manage_rewards',
        'manage_content',
      ],
    };

    logAdminAction('Login Administrativo', `Administrador "${cleanUser}" acessou o painel usando nome de usuário.`, cleanUser);
    return res.json({ success: true, session });
  }

  return res.status(400).json({ success: false, message: 'Por favor, digite o nome de usuário do administrador (mínimo 2 caracteres).' });
});

app.post('/api/admin/auth/change-password', (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const adminState = readAdminState();

  if (currentPassword !== adminState.adminCredentials.passwordHash) {
    return res.status(403).json({ success: false, message: 'Senha atual incorreta.' });
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ success: false, message: 'A nova senha deve ter pelo menos 4 caracteres.' });
  }

  adminState.adminCredentials.passwordHash = newPassword;
  writeAdminState(adminState);

  logAdminAction('Senha Alterada', 'Senha mestra de administrador atualizada no banco compartilhado.');
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
      const uname = val.username || val.userStats.username || key;
      if (!seenUsernames.has(uname.toLowerCase())) {
        seenUsernames.add(uname.toLowerCase());
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
          activeTitle: val.userStats.activeTitle || 'Aprendiz Curioso',
          equippedSkin: val.userStats.equippedMascot?.skin || 'skin_esmeralda',
          perfectSignsCount: val.userStats.perfectSignsCount || 0,
          signMasteryCount: val.userStats.signMastery ? Object.keys(val.userStats.signMastery).length : 0,
          taughtSignsCount: Array.isArray(val.taughtSigns) ? val.taughtSigns.length : 0,
          completedLessons: val.userStats.completedLessonIds || [],
          friendsCount: Array.isArray(val.userStats.friends) ? val.userStats.friends.length : 0,
          challengesCount: Array.isArray(val.userStats.weeklyChallenges) ? val.userStats.weeklyChallenges.length : 0,
          friends: val.userStats.friends || [],
          weeklyChallenges: val.userStats.weeklyChallenges || [],
        });
      }
    }
  }

  // Return exclusively real registered users (no fake AI/demo accounts)
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

function findUserRecord(db: Record<string, any>, usernameOrCode: string): { key: string; record: any } | null {
  if (!usernameOrCode) return null;
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
      // Filter out bots, AI accounts, or blank names
      if (!norm || norm.startsWith('bot_') || norm.startsWith('ia_') || norm === 'robot' || norm === 'voce (aprendiz)') {
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
      syncCode: val.syncCode || val.userStats.syncCode || '---',
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
  const cleanQCode = q.replace(/^lib-?/, '');

  const db = readSyncDb();
  const userMap = new Map<string, any>();

  for (const [key, val] of Object.entries(db)) {
    if (val && val.userStats) {
      const uname = (val.username || val.userStats.username || key.replace(/^USER_/, '')).trim();
      const norm = normalizeString(uname);
      if (!norm || norm.startsWith('bot_') || norm.startsWith('ia_') || norm === 'robot' || norm === 'voce (aprendiz)') {
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
    const syncCode = (val.syncCode || val.userStats.syncCode || '').toString();
    const normCode = normalizeString(syncCode).replace(/^lib-?/, '');

    const isMatch = !q || norm.includes(q) || (cleanQCode.length >= 2 && normCode.includes(cleanQCode)) || syncCode.toLowerCase().includes(q);

    if (isMatch) {
      matches.push({
        username: uname,
        syncCode: syncCode || 'LIB-0000',
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

app.delete('/api/admin/users/:key', (req: Request, res: Response) => {
  const targetKey = decodeURIComponent(req.params.key).trim();
  const targetUsername = (req.query.username as string || '').toLowerCase().trim();
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
      if (!uname || seenUsernames.has(uname.toLowerCase())) continue;
      seenUsernames.add(uname.toLowerCase());

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
        activeTitle: val.userStats.activeTitle || 'Aprendiz Curioso',
        equippedSkin: val.userStats.equippedMascot?.skin || 'skin_esmeralda',
        friendsCount: Array.isArray(val.userStats.friends) ? val.userStats.friends.length : 0,
        challengesCount: Array.isArray(val.userStats.weeklyChallenges) ? val.userStats.weeklyChallenges.length : 0,
        friends: val.userStats.friends || [],
        weeklyChallenges: val.userStats.weeklyChallenges || [],
      });
    }
  }

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
