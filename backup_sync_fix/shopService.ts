import { UserStats } from '../types/libras';
import { userFetch, safeReadJsonResponse } from './userAuth';

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

      const parsed = await safeReadJsonResponse<PurchaseResult>(res);
      if (!parsed.ok || !parsed.data) {
        return {
          success: false,
          message: 'O servidor está temporariamente indisponível. Seu saldo anterior de diamantes foi mantido com segurança.',
        };
      }

      return parsed.data;
    } catch {
      return {
        success: false,
        message: 'Falha de comunicação com o servidor ao processar a compra. Seu saldo foi preservado.',
      };
    }
  },

  /**
   * Resgate de Bônus Diário de Diamantes validado no servidor
   * Protege contra resgates duplicados e garante integridade do saldo em qualquer cenário.
   */
  async claimDailyBonus(username: string, syncCode?: string): Promise<DailyClaimResult> {
    const cleanUser = (username || '').trim();
    const cleanCode = (syncCode || '').trim().toUpperCase();

    try {
      const res = await userFetch('/api/rewards/daily-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, syncCode: cleanCode }),
      }, { username: cleanUser, syncCode: cleanCode });

      const parsed = await safeReadJsonResponse<DailyClaimResult>(res);
      if (!parsed.ok || !parsed.data) {
        return {
          success: false,
          message: 'O servidor de recompensas está temporariamente indisponível. Seu saldo anterior de diamantes foi preservado.',
        };
      }

      return parsed.data;
    } catch {
      return {
        success: false,
        message: 'Não foi possível resgatar o bônus diário no momento devido a uma instabilidade de conexão. Seu saldo permanece intacto.',
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
