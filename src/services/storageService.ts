import { UserStats, DailyMission, LeaderboardEntry, FriendUser, WeeklyChallenge, FriendRequest } from '../types/libras';
import { INITIAL_DAILY_MISSIONS } from '../data/missionsData';
import { INITIAL_LEADERBOARD } from '../data/mockLeaderboard';

const STORAGE_KEY_STATS = 'librasgo_user_stats';
const STORAGE_KEY_MISSIONS = 'librasgo_missions';
const STORAGE_KEY_LEADERBOARD = 'librasgo_leaderboard';

const STORAGE_KEY_PROFILES = 'librasgo_saved_profiles';

export interface QuickProfile {
  username: string;
  avatarUrl: string;
  lastActive: string;
}

const DEFAULT_STATS: UserStats = {
  username: 'Você (Aprendiz)',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: 'Aprendendo a Língua Brasileira de Sinais com Realidade Aumentada! 🤟',
  isLoggedIn: true,
  xp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  hearts: 5,
  maxHearts: 5,
  gems: 0,
  completedLessonIds: [],
  claimedChestIds: [],
  signMastery: {},
  perfectSignsCount: 0,
  hasStreakFreeze: false,
  activeTheme: 'neon-cyber',
  profileColor: '#10b981',
  soundEnabled: true,
  hapticEnabled: true,
  syncCode: 'LIB-' + Math.floor(1000 + Math.random() * 9000),
  lastCloudSynced: undefined,
  activeTitle: 'Aprendiz Curioso',
  unlockedTitles: ['Aprendiz Curioso'],
  unlockedMascotItems: [],
  equippedMascot: {
    outfit: 'none',
    hat: 'none',
    glasses: 'none',
    skin: 'skin_esmeralda',
  },
  unlockedNameColors: ['gold'],
  unopenedChestsCount: 0,
  redeemedPromoCodes: [],
};

const STARTER_NAME_COLORS = ['gold', 'neon_cyan', 'amethyst', 'pink_neon', 'emerald_royal', 'blue_sapphire'];

export const storageService = {
  getUserStats(): UserStats {
    try {
      const data = localStorage.getItem(STORAGE_KEY_STATS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...DEFAULT_STATS,
          ...parsed,
          equippedMascot: {
            ...DEFAULT_STATS.equippedMascot,
            ...(parsed.equippedMascot || {}),
          },
          unlockedMascotItems: parsed.unlockedMascotItems || DEFAULT_STATS.unlockedMascotItems,
          unlockedTitles: parsed.unlockedTitles || DEFAULT_STATS.unlockedTitles,
          unlockedMascotIds: parsed.unlockedMascotIds || ['librinha'],
          activeMascotId: parsed.activeMascotId || 'librinha',
          activeTheme: parsed.activeTheme || 'neon-cyber',
          profileColor: parsed.profileColor || parsed.activeTheme || '#10b981',
          nameColor: parsed.nameColor || undefined,
          unlockedNameColors: Array.from(new Set([...STARTER_NAME_COLORS, ...(parsed.unlockedNameColors || [])])),
          unopenedChestsCount: parsed.unopenedChestsCount !== undefined ? parsed.unopenedChestsCount : 0,
          redeemedPromoCodes: Array.isArray(parsed.redeemedPromoCodes) ? parsed.redeemedPromoCodes : [],
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_STATS;
  },

  saveUserStats(stats: UserStats): void {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
      if (stats.activeTheme) {
        localStorage.setItem('librasgo_theme', stats.activeTheme);
      }
      if (stats.profileColor) {
        localStorage.setItem('librasgo_profile_color', stats.profileColor);
      }
      // Asynchronously trigger cloud sync in background
      this.syncWithCloud(stats).catch(() => {});
    } catch {
      // ignore
    }
  },

  async syncWithCloud(
    stats?: UserStats,
    missions?: DailyMission[]
  ): Promise<{ success: boolean; syncCode: string }> {
    const currentStats = stats || this.getUserStats();
    const currentMissions = missions || this.getMissions();
    const code = currentStats.syncCode || 'LIB-' + Math.floor(1000 + Math.random() * 9000);

    try {
      const res = await fetch('/api/sync/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncCode: code,
          username: currentStats.username,
          userStats: { ...currentStats, syncCode: code, lastCloudSynced: new Date().toISOString() },
          missions: currentMissions,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = {
          ...currentStats,
          syncCode: code,
          lastCloudSynced: data.updatedAt || new Date().toISOString(),
        };
        try {
          localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(updated));
        } catch {}
        return { success: true, syncCode: code };
      }
    } catch (err) {
      console.warn('Sync offline ou pendente:', err);
    }

    return { success: false, syncCode: code };
  },

  async restoreFromCloud(codeOrUsername: string): Promise<{
    success: boolean;
    data?: { userStats: UserStats; missions: DailyMission[] };
    error?: string;
  }> {
    const trimmed = codeOrUsername.trim();
    if (!trimmed) {
      return { success: false, error: 'Digite um código de sincronização ou nome válido.' };
    }

    try {
      const res = await fetch(`/api/sync/load/${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errJson.error || 'Nenhum progresso encontrado com este código ou usuário.',
        };
      }

      const json = await res.json();
      if (json.success && json.data) {
        const cloudStats: UserStats = {
          ...DEFAULT_STATS,
          ...json.data.userStats,
        };
        const cloudMissions: DailyMission[] = json.data.missions || INITIAL_DAILY_MISSIONS;

        this.saveUserStats(cloudStats);
        this.saveMissions(cloudMissions);

        return {
          success: true,
          data: {
            userStats: cloudStats,
            missions: cloudMissions,
          },
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'Erro de conexão ao buscar dados na nuvem: ' + (err.message || 'Tente novamente.'),
      };
    }

    return { success: false, error: 'Não foi possível restaurar os dados.' };
  },


  getMissions(): DailyMission[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_MISSIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return INITIAL_DAILY_MISSIONS;
  },

  saveMissions(missions: DailyMission[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_MISSIONS, JSON.stringify(missions));
    } catch {
      // ignore
    }
  },

  getLeaderboard(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return INITIAL_LEADERBOARD;
  },

  saveLeaderboard(entries: LeaderboardEntry[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(entries));
    } catch {
      // ignore
    }
  },

  updateUserXpInLeaderboard(newXp: number): LeaderboardEntry[] {
    const list = this.getLeaderboard();
    const updated = list.map((item) => {
      if (item.isCurrentUser) {
        return { ...item, xp: newXp };
      }
      return item;
    });

    // Re-rank sorted by XP descending
    updated.sort((a, b) => b.xp - a.xp);
    const reRanked = updated.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    this.saveLeaderboard(reRanked);
    return reRanked;
  },

  updateUserProfileInLeaderboard(username: string, avatarUrl: string): LeaderboardEntry[] {
    const list = this.getLeaderboard();
    const updated = list.map((item) => {
      if (item.isCurrentUser) {
        return { ...item, name: username, avatar: avatarUrl };
      }
      return item;
    });
    this.saveLeaderboard(updated);
    return updated;
  },

  async fetchRealLeaderboard(currentUser?: UserStats): Promise<LeaderboardEntry[]> {
    try {
      const res = await fetch('/api/users/real');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          const mapped: LeaderboardEntry[] = data.users.map((u: any, idx: number) => {
            const isCurrent = currentUser?.username && u.username.toLowerCase() === currentUser.username.toLowerCase();
            return {
              id: u.syncCode || `user_real_${idx}`,
              name: isCurrent && currentUser ? currentUser.username : u.username,
              avatar: isCurrent && currentUser ? currentUser.avatarUrl : (u.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
              xp: isCurrent && currentUser ? currentUser.xp : (u.xp || 0),
              streak: isCurrent && currentUser ? currentUser.streak : (u.streak || 1),
              league: (u.xp >= 1000 ? 'Diamante' : u.xp >= 600 ? 'Safira' : u.xp >= 300 ? 'Ouro' : u.xp >= 100 ? 'Prata' : 'Bronze') as any,
              rank: idx + 1,
              isCurrentUser: isCurrent,
              badge: u.activeTitle || (idx === 0 ? '👑 Líder' : idx === 1 ? '⚡ Top 2' : '🌟 Aluno'),
              location: 'Brasil',
            };
          });

          // If current user is not in server list yet, append
          if (currentUser && currentUser.username && !mapped.some((e) => e.isCurrentUser)) {
            mapped.push({
              id: currentUser.syncCode || 'curr_user',
              name: currentUser.username,
              avatar: currentUser.avatarUrl,
              xp: currentUser.xp,
              streak: currentUser.streak,
              league: 'Ouro',
              rank: mapped.length + 1,
              isCurrentUser: true,
              badge: currentUser.activeTitle || '🚀 Aprendiz',
              location: 'Brasil',
            });
            mapped.sort((a, b) => b.xp - a.xp);
            mapped.forEach((item, index) => {
              item.rank = index + 1;
            });
          }

          this.saveLeaderboard(mapped);
          return mapped;
        }
      }
    } catch (err) {
      console.warn('Sync do leaderboard de usuários reais:', err);
    }
    return this.getLeaderboard();
  },

  getSavedProfiles(): QuickProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // ignore
    }
    return [
      {
        username: 'Mariana',
        avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
        lastActive: 'Hoje',
      },
      {
        username: 'Lucas',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        lastActive: 'Ontem',
      },
    ];
  },

  saveProfile(username: string, avatarUrl: string): void {
    const profiles = this.getSavedProfiles();
    const existingIndex = profiles.findIndex((p) => p.username.toLowerCase() === username.toLowerCase());
    const newEntry: QuickProfile = {
      username,
      avatarUrl,
      lastActive: 'Agora',
    };

    if (existingIndex >= 0) {
      profiles[existingIndex] = newEntry;
    } else {
      profiles.unshift(newEntry);
    }

    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles.slice(0, 6)));
    } catch {
      // ignore
    }
  },

  async searchUsers(query: string = ''): Promise<{ success: boolean; users: any[] }> {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        return { success: true, users: data.users || [] };
      }
    } catch (err) {
      console.warn('Erro ao buscar usuários:', err);
    }
    return { success: false, users: [] };
  },

  async sendFriendRequest(fromUsername: string, toUsername: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername, toUsername }),
      });
      const data = await res.json();
      return { success: data.success ?? res.ok, message: data.message || 'Solicitação processada.' };
    } catch (err: any) {
      return { success: false, message: 'Erro de conexão ao enviar solicitação.' };
    }
  },

  async getFriendRequests(username: string): Promise<FriendRequest[]> {
    if (!username) return [];
    try {
      const res = await fetch(`/api/friends/requests/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        return data.requests || [];
      }
    } catch (err) {
      console.warn('Erro ao carregar solicitações de amizade:', err);
    }
    return [];
  },

  async respondFriendRequest(
    username: string,
    requesterUsername: string,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; message: string; friends?: FriendUser[] }> {
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, requesterUsername, action }),
      });
      const data = await res.json();
      return {
        success: data.success ?? res.ok,
        message: data.message || 'Resposta processada.',
        friends: data.friends,
      };
    } catch (err) {
      return { success: false, message: 'Erro de conexão ao responder solicitação.' };
    }
  },

  async fetchFriendsList(username: string): Promise<FriendUser[]> {
    if (!username) return [];
    try {
      const res = await fetch(`/api/friends/list/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        return data.friends || [];
      }
    } catch (err) {
      console.warn('Erro ao carregar lista de amigos:', err);
    }
    return [];
  },

  async removeFriend(username: string, friendUsername: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch('/api/friends/remove', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, friendUsername }),
      });
      const data = await res.json();
      return { success: data.success ?? res.ok, message: data.message || 'Amigo removido.' };
    } catch (err) {
      return { success: false, message: 'Erro ao remover amigo.' };
    }
  },

  async createWeeklyChallenge(
    challengerUsername: string,
    targetUsername: string,
    goalXp: number
  ): Promise<{ success: boolean; challenge?: WeeklyChallenge; message?: string }> {
    try {
      const res = await fetch('/api/challenges/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengerUsername, targetUsername, goalXp }),
      });
      const data = await res.json();
      return { success: data.success ?? res.ok, challenge: data.challenge, message: data.message };
    } catch (err) {
      return { success: false, message: 'Erro ao criar desafio semanal.' };
    }
  },

  async fetchWeeklyChallenges(username: string): Promise<WeeklyChallenge[]> {
    if (!username) return [];
    try {
      const res = await fetch(`/api/challenges/${encodeURIComponent(username)}`);
      if (res.ok) {
        const data = await res.json();
        return data.challenges || [];
      }
    } catch (err) {
      console.warn('Erro ao carregar desafios semanais:', err);
    }
    return [];
  },

  async claimWeeklyChallenge(
    username: string,
    challengeId: string
  ): Promise<{ success: boolean; message: string; userStats?: UserStats }> {
    try {
      const res = await fetch('/api/challenges/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, challengeId }),
      });
      const data = await res.json();
      return {
        success: data.success ?? res.ok,
        message: data.message || 'Recompensa resgatada.',
        userStats: data.userStats,
      };
    } catch (err) {
      return { success: false, message: 'Erro ao resgatar recompensa.' };
    }
  },
};
