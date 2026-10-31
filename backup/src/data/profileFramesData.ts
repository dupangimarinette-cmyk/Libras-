import { Achievement, UserStats } from '../types/libras';

export type FrameTier = 'bronze' | 'prata' | 'ouro' | 'roxa' | 'lendaria';

export interface ProfileFrame {
  id: string;
  name: string;
  tier: FrameTier;
  description: string;
  requiredMedalDescription: string;
  requiredMedalTier?: 'bronze' | 'silver' | 'gold';
  minMedalsCount?: number;
  badgeEmoji: string;
  previewGradient: string;
  borderClasses: string;
  glowStyle: string;
  avatarRingStyle: string;
  tagColor: string;
  rarityLabel: string;
}

export const PROFILE_FRAMES: ProfileFrame[] = [
  {
    id: 'frame_bronze',
    name: 'Moldura de Bronze',
    tier: 'bronze',
    description: 'Forjada em bronze reluzente para homenagear os primeiros grandes passos na jornada de Libras.',
    requiredMedalDescription: 'Conquistar pelo menos 1 Medalha de Bronze (ex: Primeiro Sinal no Espaço ou Fogo nos Dedos)',
    requiredMedalTier: 'bronze',
    badgeEmoji: '🥉',
    previewGradient: 'from-amber-700 via-amber-600 to-amber-800',
    borderClasses: 'border-amber-600/90 shadow-amber-900/50',
    glowStyle: '0 0 16px rgba(217, 119, 6, 0.45)',
    avatarRingStyle: 'ring-4 ring-amber-600 ring-offset-2 ring-offset-slate-900',
    tagColor: 'text-amber-400 bg-amber-500/15 border-amber-500/40',
    rarityLabel: 'Bronze • Iniciante Dedicado',
  },
  {
    id: 'frame_prata',
    name: 'Moldura de Prata',
    tier: 'prata',
    description: 'Moldada em prata polida com acabamento lunar, concedida a quem aprimora sua precisão nos sinais.',
    requiredMedalDescription: 'Conquistar pelo menos 1 Medalha de Prata (ex: Chama Inquebrável, Cirurgião de Libras ou Embaixador)',
    requiredMedalTier: 'silver',
    badgeEmoji: '🥈',
    previewGradient: 'from-slate-200 via-slate-400 to-slate-300',
    borderClasses: 'border-slate-300/90 shadow-slate-400/40',
    glowStyle: '0 0 18px rgba(203, 213, 225, 0.55)',
    avatarRingStyle: 'ring-4 ring-slate-300 ring-offset-2 ring-offset-slate-900',
    tagColor: 'text-slate-200 bg-slate-400/15 border-slate-400/40',
    rarityLabel: 'Prata • Intermediário Exímio',
  },
  {
    id: 'frame_ouro',
    name: 'Moldura de Ouro',
    tier: 'ouro',
    description: 'Coroa dourada triunfal reluzente destinada aos mestres campeões que sobem ao pódio global.',
    requiredMedalDescription: 'Conquistar pelo menos 1 Medalha de Ouro (ex: Pódio dos Campeões)',
    requiredMedalTier: 'gold',
    badgeEmoji: '🥇',
    previewGradient: 'from-amber-300 via-yellow-400 to-amber-500',
    borderClasses: 'border-amber-400 shadow-yellow-500/60',
    glowStyle: '0 0 22px rgba(245, 158, 11, 0.65)',
    avatarRingStyle: 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-900',
    tagColor: 'text-yellow-300 bg-yellow-500/15 border-yellow-500/40',
    rarityLabel: 'Ouro • Campeão Nobre',
  },
  {
    id: 'frame_roxa',
    name: 'Moldura Roxa Ametista',
    tier: 'roxa',
    description: 'Energizada com cristal de ametista e aura ultravioleta mística para aprendizes persistentes.',
    requiredMedalDescription: 'Conquistar 4 ou mais medalhas de qualquer categoria',
    minMedalsCount: 4,
    badgeEmoji: '🔮',
    previewGradient: 'from-purple-500 via-fuchsia-500 to-violet-600',
    borderClasses: 'border-purple-400 shadow-fuchsia-600/60',
    glowStyle: '0 0 24px rgba(168, 85, 247, 0.7)',
    avatarRingStyle: 'ring-4 ring-purple-500 ring-offset-2 ring-offset-slate-900',
    tagColor: 'text-purple-300 bg-purple-500/15 border-purple-500/40',
    rarityLabel: 'Roxa • Ametista Rara',
  },
  {
    id: 'frame_lendaria',
    name: 'Moldura Lendária Celestial',
    tier: 'lendaria',
    description: 'A moldura suprema de LibrasGo com arco-íris cósmico holográfico, reservada a verdadeiras lendas.',
    requiredMedalDescription: 'Conquistar 5 ou mais medalhas (ou todas as medalhas disponíveis)',
    minMedalsCount: 5,
    badgeEmoji: '👑',
    previewGradient: 'from-cyan-400 via-purple-500 to-amber-400',
    borderClasses: 'border-cyan-300 shadow-cyan-400/70',
    glowStyle: '0 0 28px rgba(6, 182, 212, 0.8), 0 0 12px rgba(236, 72, 153, 0.6)',
    avatarRingStyle: 'ring-4 ring-cyan-400 ring-offset-2 ring-offset-slate-900',
    tagColor: 'text-cyan-300 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400/40',
    rarityLabel: 'Lendária • Celestial Mestre',
  },
];

export const FRAMES_BY_ID: Record<string, ProfileFrame> = PROFILE_FRAMES.reduce((acc, frame) => {
  acc[frame.id] = frame;
  return acc;
}, {} as Record<string, ProfileFrame>);

/**
 * Checks whether a frame is unlocked for the user based on their earned achievements and stats.
 */
export function isProfileFrameUnlocked(
  frame: ProfileFrame,
  achievements: Achievement[],
  userStats?: UserStats
): boolean {
  // If explicitly unlocked in userStats
  if (userStats?.unlockedFrames?.includes(frame.id)) {
    return true;
  }

  // Count unlocked achievements
  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const totalUnlocked = unlockedAchievements.length;

  if (frame.minMedalsCount !== undefined) {
    if (totalUnlocked >= frame.minMedalsCount) {
      return true;
    }
  }

  if (frame.requiredMedalTier) {
    const hasTier = unlockedAchievements.some((a) => a.tier === frame.requiredMedalTier);
    if (hasTier) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the current frame object or null if none equipped.
 */
export function getEquippedFrame(frameId?: string): ProfileFrame | null {
  if (!frameId || frameId === 'none') return null;
  return FRAMES_BY_ID[frameId] || null;
}
