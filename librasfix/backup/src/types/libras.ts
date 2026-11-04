export type FingerName = 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';

export type PalmOrientation = 'camera' | 'self' | 'side' | 'up' | 'down';

export interface HandPoseRule {
  thumbExtended: boolean;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  pinkyExtended: boolean;
  // Specific constraints
  thumbTouchIndex?: boolean; // For 'O' or 'F'
  indexMiddleSpread?: boolean; // For 'V'
  indexHooked?: boolean; // For 'X'
  thumbBetweenIndexMiddle?: boolean; // For 'T'
  wristMovementRequired?: 'shake' | 'nod' | 'circle' | 'wave' | 'none';
  palmOrientation?: PalmOrientation;
  minConfidence?: number;
  descriptionHint: string;
}

export interface LibrasSign {
  id: string;
  name: string;
  category: 'alfabeto' | 'saudacoes' | 'respostas' | 'familia' | 'sentimentos' | 'cotidiano' | 'numeros' | 'cores' | 'alimentos' | 'escola' | 'lugares';
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  meaning: string;
  contextSentence: string;
  contextTranslation: string;
  // Parâmetros Gramaticais da LIBRAS (Vital para aprendizado correto)
  parameters: {
    cm: string; // Configuração de Mão (ex: "Mão em 'L'", "Mão aberta em '5'")
    pa: string; // Ponto de Articulação (ex: "Espaço neutro", "Testa", "Peito")
    m: string;  // Movimento (ex: "Retilíneo para frente", "Ondulatório", "Estático")
    o: string;  // Orientação da Palma (ex: "Para a frente", "Para si")
    ef: string; // Expressão Facial / Não-Manual (ex: "Neutra", "Sorriso amigável", "Interrogativa")
  };
  svgHandShape: string; // Key for the visual SVG illustration
  poseRule: HandPoseRule;
  tips: string[];
  audioCueWord?: string;
  videoUrl?: string;
  imageUrl?: string;
  isCustom?: boolean;
}

export type ExerciseType = 'learn' | 'ar_challenge' | 'identify_sign' | 'hand_config' | 'speed_challenge';

export interface Exercise {
  id: string;
  type: ExerciseType;
  title: string;
  instruction: string;
  signId: string;
  options?: {
    id: string;
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  targetHoldSeconds?: number;
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  xpReward: number;
  gemsReward: number;
  icon: string;
  exercises: Exercise[];
  targetSignIds: string[];
}

export interface LearningModule {
  id: string;
  title: string;
  subtitle: string;
  themeColor: string;
  accentColor: string;
  icon: string;
  description: string;
  lessons: Lesson[];
  level: number;
  enabled?: boolean;
  isCustom?: boolean;
}

export interface SharedContentPayload {
  version: number;
  updatedAt: string;
  modules: LearningModule[];
  signs: LibrasSign[];
  chests: MysteryChest[];
  media: MediaItem[];
  announcements: SystemAnnouncement[];
  allAnnouncements?: SystemAnnouncement[];
}

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  isOnline: boolean;
  syncError: string | null;
}

export type UserRole = 'learner' | 'admin';

export interface UserStats {
  username: string;
  avatarUrl: string;
  bio?: string;
  isLoggedIn: boolean;
  role?: UserRole;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  hearts: number;
  maxHearts: number;
  gems: number;
  completedLessonIds: string[];
  claimedChestIds?: string[]; // IDs of claimed module chests, e.g. 'mod_1', 'mod_2'
  signMastery: Record<string, number>; // signId -> accuracy (0 - 100)
  perfectSignsCount: number;
  hasStreakFreeze: boolean;
  activeTheme: 'neon-cyber' | 'emerald' | 'gold-champion' | 'amethyst' | 'purple' | 'blue' | 'pink' | 'crimson' | 'dark' | 'indigo' | 'cyan' | string;
  profileColor?: string;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  // Cloud Sync
  syncCode?: string;
  lastCloudSynced?: string;
  // Titles & Prestige
  activeTitle?: string;
  unlockedTitles?: string[];
  // Name Color / Nick Glow (Loja Premium)
  nameColor?: string;
  unlockedNameColors?: string[];
  // Mascots & Companions (Loja Premium)
  activeMascotId?: string;
  unlockedMascotIds?: string[];
  unlockedMascotItems?: string[];
  equippedMascot?: {
    outfit: string;
    hat: string;
    glasses: string;
    skin: string;
  };
  // Molduras de Perfil (Desbloqueadas por Medalhas)
  equippedFrame?: string;
  unlockedFrames?: string[];
  // Powerups & Bônus de XP (Loja Premium)
  xpBoostUntil?: string; // ISO timestamp
  hasHeartShield?: boolean; // Protege contra próximo erro
  // Trilhas Avançadas Especiais
  unlockedSpecialTracks?: string[];
  // Recompensa Diária de Diamantes
  lastDailyRewardDate?: string; // YYYY-MM-DD
  // Facial and AI Sign Practice
  // Facial and AI Sign Practice
  completedFacialExerciseIds?: string[];
  taughtSignIds?: string[];
  // Rewards & Promo Codes
  unopenedChestsCount?: number;
  redeemedPromoCodes?: Array<{
    code: string;
    redeemedAt: string;
    rewardsSummary: string;
    gems?: number;
    xp?: number;
    hearts?: number;
    chests?: number;
  }>;
  // Friends & Weekly Challenges
  friends?: FriendUser[];
  weeklyChallenges?: WeeklyChallenge[];
  friendRequestsReceived?: FriendRequest[];
  friendRequestsSent?: string[];
  createdAt?: string;
}

export interface AdminRealtimeStats {
  totalAccounts: number;
  activeUsers24h: number;
  activeUsers7d: number;
  totalCompletedLessons: number;
  totalXP: number;
  pendingFeedbacks: number;
  resolvedFeedbacks: number;
  bugReportsCount: number;
}

export interface AdminRealtimeEvent {
  id: string;
  type: 'new_account' | 'new_feedback' | 'feedback_status' | 'lesson_completed';
  title: string;
  description: string;
  timestamp: string;
  username?: string;
  metadata?: Record<string, any>;
}

export interface FriendRequest {
  id: string;
  fromUsername: string;
  fromAvatarUrl: string;
  fromXp: number;
  fromLevel: number;
  requestedAt: string;
}

export type FeedbackType = 'sugestao' | 'erro' | 'reclamacao' | 'elogio';
export type FeedbackStatus = 'pendente' | 'em_analise' | 'resolvido' | 'arquivado';

export interface UserFeedback {
  id: string;
  username: string;
  syncCode?: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority?: 'baixa' | 'media' | 'alta';
  status: FeedbackStatus;
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface FriendUser {
  username: string;
  avatarUrl: string;
  xp: number;
  level: number;
  streak: number;
  activeTitle?: string;
  addedAt: string;
}

export interface WeeklyChallenge {
  id: string;
  targetUsername: string; // Amigo desafiado
  targetAvatarUrl: string;
  challengerXpAtStart: number;
  targetXpAtStart: number;
  goalXp: number; // e.g. 200 XP na semana
  weekStartDate: string;
  weekEndDate: string;
  xpReward: number;
  gemsReward: number;
  status: 'em_andamento' | 'vitoria' | 'derrota' | 'empate';
  isClaimed?: boolean;
}

export interface AdminSession {
  token: string;
  username: string;
  role: 'admin';
  loggedInAt: string;
  expiresAt: string;
  permissions: Array<'manage_users' | 'manage_activities' | 'manage_media' | 'manage_rewards' | 'manage_content'>;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  adminName: string;
}

export interface PromoCode {
  id: string;
  code: string;
  rewardGems: number;
  rewardXp: number;
  rewardHearts?: number;
  rewardChests?: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAt?: string | null;
  redeemedUsers?: string[];
  lastRedeemedAt?: string;
  createdAt: string;
  createdBy: string;
  description: string;
}

export interface MediaItem {
  id: string;
  title: string;
  category: 'video' | 'image' | 'avatar' | 'banner';
  url: string;
  description?: string;
  signId?: string;
  tags?: string[];
  createdAt: string;
  isCustom?: boolean;
}

export interface SystemAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'celebration' | 'alert' | 'event';
  active: boolean;
  createdAt: string;
  ctaText?: string;
  ctaTab?: string;
}

export interface ModuleOverride {
  moduleId: string;
  enabled: boolean;
  customTitle?: string;
  customSubtitle?: string;
  customDescription?: string;
  extraLessons?: Lesson[];
}

export type MascotCategory = 'outfit' | 'hat' | 'glasses' | 'skin';

export interface MascotItem {
  id: string;
  name: string;
  category: MascotCategory;
  description: string;
  cost: number;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  icon: string;
  color?: string;
}

export type ChestRarity = 'comum' | 'raro' | 'epico' | 'lendario';

export interface MysteryChest {
  id: ChestRarity;
  name: string;
  rarity: ChestRarity;
  cost: number;
  description: string;
  gradient: string;
  border: string;
  textColor: string;
  minXp: number;
  maxXp: number;
  minCoins: number;
  maxCoins: number;
  exclusiveTitles: string[];
  guaranteedItemChance: number; // 0 - 100
}

export interface CompanionMascot {
  id: string;
  name: string;
  title: string;
  description: string;
  cost: number;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  icon: string;
  avatarUrl: string;
  previewColor: string;
  personality: string;
}

export interface NameColorItem {
  id: string;
  name: string;
  styleClass: string;
  cost: number;
  rarity: 'raro' | 'epico' | 'lendario';
  previewBadge: string;
  description: string;
}

export interface SpecialTrackItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  cost: number;
  level: number;
  themeColor: string;
  accentColor: string;
  icon: string;
  lessonsCount: number;
  xpTotal: number;
}

export interface PrestigeTitleItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  rarity: 'comum' | 'raro' | 'epico' | 'lendario';
  badgeColor: string;
}


export interface LeaderboardEntry {
  id: string;
  name: string;
  avatar: string;
  xp: number;
  streak: number;
  league: 'Bronze' | 'Prata' | 'Ouro' | 'Safira' | 'Diamante';
  rank: number;
  isCurrentUser?: boolean;
  badge?: string;
  location?: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  icon: string;
  currentProgress: number;
  targetProgress: number;
  xpReward: number;
  gemReward: number;
  isCompleted: boolean;
  isClaimed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface ARTrackingState {
  isHandDetected: boolean;
  currentAccuracy: number; // 0 - 100
  feedbackMessage: string;
  feedbackType: 'perfect' | 'good' | 'adjust' | 'searching';
  fingersStatus: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
  };
  holdProgress: number; // 0 - 100
  isSuccess: boolean;
  landmarks: { x: number; y: number; z: number }[] | null;
}

export type HeadMovementType = 'nod_yes' | 'shake_no' | 'tilt_left' | 'tilt_right' | 'neutral';

export interface HeadPoseData {
  yaw: number; // Left/Right rotation (-45 to 45)
  pitch: number; // Up/Down tilt (-45 to 45)
  roll: number; // Lateral tilt (-45 to 45)
  movement: HeadMovementType;
  isNoddingYes: boolean;
  isShakingNo: boolean;
}

export type EyebrowsState = 'raised' | 'neutral' | 'furrowed';
export type MouthState = 'open' | 'neutral' | 'smile' | 'wide' | 'tense';

export interface FacialTrackingState {
  isFaceDetected: boolean;
  confidence: number; // 0 - 100
  headPose: HeadPoseData;
  eyebrowsState: EyebrowsState;
  eyebrowRaiseScore: number; // 0 - 100
  mouthState: MouthState;
  mouthOpenScore: number; // 0 - 100
  eyeBlink: { left: boolean; right: boolean };
  landmarks: { x: number; y: number; z?: number }[] | null;
  feedbackMessage: string;
  detectedExpressions: string[];
}

export interface TaughtSignSample {
  id: string;
  timestamp: string;
  handAnalysis?: {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
    handFacing: string;
  };
  handLandmarks?: { x: number; y: number; z: number }[];
  facialFeatures?: {
    eyebrowsState: EyebrowsState;
    headMovement: HeadMovementType;
    mouthState: MouthState;
    pitch: number;
    yaw: number;
  };
  imageSnapshot?: string;
}

export interface TaughtSign {
  id: string;
  username: string;
  name: string;
  meaning: string;
  category: string;
  contextSentence?: string;
  samples: TaughtSignSample[];
  createdAt: string;
  lastPracticedAt?: string;
  practiceCount: number;
  bestAccuracy: number;
}

export type FacialExpressionCategory =
  | 'interrogativas'
  | 'afirmacao_negacao'
  | 'intensidade_emocao'
  | 'gramatical'
  | 'cotidiano'
  | 'sentimentos';

export interface TaughtFacialExpression {
  id: string;
  username: string;
  syncCode?: string;
  name: string;
  description: string;
  category: FacialExpressionCategory;
  imageUrl: string;
  parameters: {
    eyebrows: EyebrowsState;
    headMovement: HeadMovementType;
    mouth: MouthState;
    notes?: string;
  };
  aiAnalysis?: {
    confidence: number;
    feedback: string;
    detectedFeatures: string[];
    validatedByAI: boolean;
  };
  createdAt: string;
  updatedAt?: string;
  practiceCount?: number;
  bestAccuracy?: number;
}

