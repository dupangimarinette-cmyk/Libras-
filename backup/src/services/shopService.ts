import { UserStats } from '../types/libras';
import { userFetch } from './userAuth';

export interface PurchaseResult {
  success: boolean;
  message: string;
  updatedUserStats?: UserStats;
  rewardDetails?: any;
  remainingBalance?: number;
}

export interface DailyClaimResult {
  success: boolean;
  message: string;
  bonusDiamonds?: number;
  updatedUserStats?: UserStats;
}

export const shopService = {
  /**
   * Somente o servidor valida saldos, compras e alterações de inventário.
   */
  async purchaseItem(params: {
    username: string;
    syncCode?: string;
    itemId: string;
    category: 'companion' | 'accessory' | 'title' | 'name_color' | 'chest' | 'hearts_refill' | 'heart_shield' | 'xp_boost' | 'streak_freeze' | 'special_track';
    costDiamonds: number;
    itemName: string;
  }): Promise<PurchaseResult> {
    try {
      const res = await userFetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      }, { username: params.username, syncCode: params.syncCode });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: 'Erro de conexão com o servidor ao processar a compra: ' + err.message,
      };
    }
  },

  /**
   * Resgate de Bônus Diário de Diamantes validado no servidor
   */
  async claimDailyBonus(username: string, syncCode?: string): Promise<DailyClaimResult> {
    try {
      const res = await userFetch('/api/rewards/daily-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, syncCode }),
      }, { username, syncCode });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        message: 'Erro de conexão ao resgatar o bônus diário: ' + err.message,
      };
    }
  },

  /**
   * Retorna classes tailwind correspondentes ao estilo de cor do nome
   */
  getNameColorStyle(nameColorId?: string): string {
    switch (nameColorId) {
      case 'gold':
        return 'text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.65)] font-black';
      case 'neon_cyan':
        return 'text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.7)] font-black';
      case 'rainbow':
        return 'bg-gradient-to-r from-pink-400 via-amber-300 to-cyan-400 bg-clip-text text-transparent font-black animate-pulse';
      case 'crimson':
        return 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.65)] font-black';
      case 'emerald_royal':
        return 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.7)] font-black';
      case 'amethyst':
        return 'text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)] font-black';
      case 'pink_neon':
        return 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.7)] font-black';
      case 'blue_sapphire':
        return 'text-sky-300 drop-shadow-[0_0_8px_rgba(56,189,248,0.7)] font-black';
      default:
        return 'text-white font-black';
    }
  },
};
