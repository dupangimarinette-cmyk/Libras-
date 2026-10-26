import {
  LearningModule,
  LibrasSign,
  MysteryChest,
  MediaItem,
  SystemAnnouncement,
  SharedContentPayload,
  SyncStatus,
  Lesson,
  PromoCode,
} from '../types/libras';
import { LEARNING_MODULES } from '../data/lessonsData';
import { LIBRAS_SIGNS } from '../data/signsData';
import { MYSTERY_CHESTS } from '../data/shopCatalogData';

const STORAGE_SHARED_CONTENT = 'librasgo_shared_content_v2';
const BROADCAST_CHANNEL_NAME = 'librasgo_sync_channel';

type ContentSubscriber = (content: SharedContentPayload, status: SyncStatus) => void;

class ContentService {
  private currentContent: SharedContentPayload;
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncError: null,
  };
  private subscribers: Set<ContentSubscriber> = new Set();
  private pollingTimer: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.currentContent = this.loadInitialContent();
    this.initBroadcastChannel();
    this.setupWindowEvents();
  }

  private loadInitialContent(): SharedContentPayload {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(STORAGE_SHARED_CONTENT);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.modules) && Array.isArray(parsed.signs)) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar cache local de conteúdos compartilhados:', e);
    }

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      modules: LEARNING_MODULES,
      signs: LIBRAS_SIGNS,
      chests: MYSTERY_CHESTS,
      media: [],
      announcements: [],
    };
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'CONTENT_UPDATED' && event.data?.payload) {
            this.currentContent = event.data.payload;
            this.syncStatus.lastSyncTime = new Date();
            this.notifySubscribers();
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel não suportado neste navegador:', err);
      }
    }
  }

  private setupWindowEvents() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStatus.isOnline = true;
        this.fetchSharedContent();
      });
      window.addEventListener('offline', () => {
        this.syncStatus.isOnline = false;
        this.notifySubscribers();
      });
      window.addEventListener('focus', () => {
        this.checkAndFetch();
      });
    }
  }

  public subscribe(cb: ContentSubscriber): () => void {
    this.subscribers.add(cb);
    // Immediately invoke with current state
    cb(this.currentContent, this.syncStatus);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => cb(this.currentContent, this.syncStatus));
  }

  public getContent(): SharedContentPayload {
    return this.currentContent;
  }

  public getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  public startAutoSync(intervalMs = 8000) {
    if (this.pollingTimer) return;
    // Initial fetch
    this.fetchSharedContent();

    this.pollingTimer = window.setInterval(() => {
      this.checkAndFetch();
    }, intervalMs);
  }

  public stopAutoSync() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async checkAndFetch() {
    if (this.syncStatus.isSyncing) return;
    try {
      const res = await fetch('/api/content/version');
      if (res.ok) {
        const data = await res.json();
        if (data.version && data.version !== this.currentContent.version) {
          await this.fetchSharedContent();
        }
      }
    } catch {
      // offline or silent check failure
    }
  }

  public async fetchSharedContent(): Promise<{ success: boolean; error?: string }> {
    this.syncStatus.isSyncing = true;
    this.notifySubscribers();

    try {
      const res = await fetch('/api/content/shared', {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!res.ok) {
        throw new Error(`Servidor respondeu com status ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        const updatedPayload: SharedContentPayload = {
          version: data.version || Date.now(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          modules: Array.isArray(data.modules) ? data.modules : this.currentContent.modules,
          signs: Array.isArray(data.signs) ? data.signs : this.currentContent.signs,
          chests: Array.isArray(data.chests) ? data.chests : this.currentContent.chests,
          media: Array.isArray(data.media) ? data.media : this.currentContent.media,
          announcements: Array.isArray(data.announcements) ? data.announcements : this.currentContent.announcements,
          allAnnouncements: Array.isArray(data.allAnnouncements) ? data.allAnnouncements : [],
        };

        this.currentContent = updatedPayload;
        this.syncStatus.lastSyncTime = new Date();
        this.syncStatus.syncError = null;
        this.syncStatus.isOnline = true;

        try {
          localStorage.setItem(STORAGE_SHARED_CONTENT, JSON.stringify(updatedPayload));
        } catch (e) {
          console.warn('Erro ao salvar no localStorage:', e);
        }

        if (this.broadcastChannel) {
          this.broadcastChannel.postMessage({
            type: 'CONTENT_UPDATED',
            payload: updatedPayload,
          });
        }

        this.syncStatus.isSyncing = false;
        this.notifySubscribers();
        return { success: true };
      } else {
        throw new Error(data.error || 'Erro desconhecido ao sincronizar.');
      }
    } catch (err: any) {
      console.warn('Sincronização em nuvem compartilhada pendente ou falhou:', err.message);
      this.syncStatus.isSyncing = false;
      this.syncStatus.syncError = err.message || 'Falha na conexão com o servidor compartilhado.';
      this.notifySubscribers();
      return { success: false, error: this.syncStatus.syncError || undefined };
    }
  }

  // --------------------------------------------------------------------------
  // ADMIN ACTIONS WITH REAL-TIME CLOUD DATABASE PERSISTENCE & ERROR HANDLING
  // --------------------------------------------------------------------------

  // Modules / Units
  async createModule(params: {
    title: string;
    subtitle: string;
    description: string;
    themeColor: string;
    accentColor: string;
    icon: string;
    level: number;
  }): Promise<{ success: boolean; message: string; module?: LearningModule }> {
    try {
      const res = await fetch('/api/admin/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return {
          success: true,
          message: data.message || 'Nova unidade salva com sucesso no banco compartilhado!',
          module: data.module,
        };
      }
      return { success: false, message: data.message || 'Erro ao criar unidade.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão ao salvar unidade: ' + err.message };
    }
  }

  async updateModule(moduleId: string, updates: Partial<LearningModule>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Unidade atualizada com sucesso no banco compartilhado!' };
      }
      return { success: false, message: data.message || 'Erro ao atualizar unidade.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão ao atualizar unidade: ' + err.message };
    }
  }

  async toggleModule(moduleId: string): Promise<{ success: boolean; enabled?: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}/toggle`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, enabled: data.enabled, message: data.message };
      }
      return { success: false, message: data.message || 'Erro ao alternar status do módulo.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de rede: ' + err.message };
    }
  }

  async deleteModule(moduleId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Unidade removida com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao excluir unidade.' };
    } catch (err: any) {
      return { success: false, message: 'Erro ao conectar ao servidor: ' + err.message };
    }
  }

  // Activities / Lessons inside a Module
  async addLessonToModule(moduleId: string, lesson: {
    title: string;
    description: string;
    xpReward: number;
    gemsReward: number;
    icon: string;
    targetSignIds?: string[];
  }): Promise<{ success: boolean; message: string; lesson?: Lesson }> {
    try {
      const res = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lesson),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Atividade adicionada e sincronizada!', lesson: data.lesson };
      }
      return { success: false, message: data.message || 'Erro ao adicionar atividade.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async updateLesson(moduleId: string, lessonId: string, updates: Partial<Lesson>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Atividade atualizada com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao editar atividade.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async deleteLesson(moduleId: string, lessonId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/modules/${encodeURIComponent(moduleId)}/lessons/${encodeURIComponent(lessonId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Atividade removida com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao remover atividade.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  // Libras Signs (LibrasDex)
  async createSign(sign: {
    name: string;
    category: any;
    difficulty: any;
    meaning?: string;
    contextSentence?: string;
    contextTranslation?: string;
    cm?: string;
    pa?: string;
    m?: string;
    o?: string;
    ef?: string;
    videoUrl?: string;
    imageUrl?: string;
    tips?: string[];
  }): Promise<{ success: boolean; message: string; sign?: LibrasSign }> {
    try {
      const res = await fetch('/api/admin/signs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sign),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Sinal cadastrado no banco compartilhado!', sign: data.sign };
      }
      return { success: false, message: data.message || 'Erro ao cadastrar sinal.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async updateSign(signId: string, updates: Partial<LibrasSign> & { cm?: string; pa?: string; m?: string; o?: string; ef?: string }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/signs/${encodeURIComponent(signId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Sinal atualizado com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao atualizar sinal.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async deleteSign(signId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/signs/${encodeURIComponent(signId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Sinal excluído com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao excluir sinal.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  // Chests / Rewards
  async updateChestConfigs(chestOverrides: Record<string, Partial<MysteryChest>>): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/admin/chests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chestOverrides }),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Baús salvos no banco compartilhado!' };
      }
      return { success: false, message: data.message || 'Erro ao salvar baús.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  // Media
  async addMedia(media: {
    title: string;
    category: 'video' | 'image' | 'avatar' | 'banner';
    url: string;
    description?: string;
    tags?: string[];
    signId?: string;
  }): Promise<{ success: boolean; message: string; media?: MediaItem }> {
    try {
      const res = await fetch('/api/admin/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(media),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Mídia salva no banco compartilhado!', media: data.media };
      }
      return { success: false, message: data.message || 'Erro ao salvar mídia.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async deleteMedia(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Mídia removida com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao remover mídia.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  // Promo Codes
  async createPromoCode(promo: {
    code: string;
    rewardGems: number;
    rewardXp: number;
    rewardHearts?: number;
    rewardChests?: number;
    maxUses: number;
    expiresAt?: string | null;
    description: string;
  }): Promise<{ success: boolean; message: string; promoCode?: any }> {
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promo),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Código criado com sucesso!', promoCode: data.promoCode };
      }
      return { success: false, message: data.message || 'Erro ao criar código.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<{ success: boolean; message: string; promoCode?: any }> {
    try {
      const res = await fetch(`/api/admin/promo-codes/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Código atualizado com sucesso!', promoCode: data.promoCode };
      }
      return { success: false, message: data.message || 'Erro ao atualizar código.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async deletePromoCode(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/promo-codes/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Código excluído com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao excluir código.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  // Announcements
  async createAnnouncement(ann: {
    title: string;
    message: string;
    type: 'info' | 'celebration' | 'alert' | 'event';
    active: boolean;
    ctaText?: string;
    ctaTab?: string;
  }): Promise<{ success: boolean; message: string; announcement?: SystemAnnouncement }> {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ann),
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Aviso publicado e sincronizado!', announcement: data.announcement };
      }
      return { success: false, message: data.message || 'Erro ao publicar aviso.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }

  async deleteAnnouncement(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/admin/announcements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchSharedContent();
        return { success: true, message: data.message || 'Aviso removido com sucesso!' };
      }
      return { success: false, message: data.message || 'Erro ao remover aviso.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão: ' + err.message };
    }
  }
}

export const contentService = new ContentService();
