import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Navigation, TabType } from './components/Navigation';
import { PathView } from './components/LearningPath/PathView';
import { LessonModal } from './components/LearningPath/LessonModal';
import { ARCameraView } from './components/ARPractice/ARCameraView';
import { PracticeHubView, PracticeTabMode } from './components/ARPractice/PracticeHubView';
import { LeaderboardView } from './components/Leaderboard/LeaderboardView';
import { LibrasDexView } from './components/LibrasDex/LibrasDexView';
import { MissionsView } from './components/Missions/MissionsView';
import { ShopView } from './components/Shop/ShopView';
import { AboutView } from './components/About/AboutView';
import { ProfileView } from './components/Profile/ProfileView';
import { LoginView } from './components/Auth/LoginView';
import { AdminDashboard, AdminTab } from './components/Admin/AdminDashboard';
import { RedeemView } from './components/Redeem/RedeemView';
import { FeedbackView } from './components/Feedback/FeedbackView';

import { UserStats, Lesson, LearningModule, DailyMission, LeaderboardEntry, MysteryChest, MascotItem, AdminSession, UserRole, SyncStatus, LibrasSign, TaughtSign, TaughtFacialExpression, FriendUser, WeeklyChallenge } from './types/libras';
import { storageService } from './services/storageService';
import { adminService } from './services/adminService';
import { contentService } from './services/contentService';
import { aiSignLearner } from './services/aiSignLearner';
import { learnedExpressionsService } from './services/learnedExpressionsService';
import { convertTaughtSignToLibrasSign, buildCommunityLearningModule, buildFacialLearningModule, getAllFacialSigns } from './utils/signAdapters';
import { audio } from './services/audioService';
import { ACHIEVEMENTS } from './data/missionsData';
import { MASCOT_ITEMS } from './data/shopCatalogData';
import { ChestRewardResult } from './components/Shop/ChestOpeningModal';
import { getThemeConfig, applyThemeToDocument, applyProfileColorToDocument, getThemeBackgroundStyle } from './data/themesData';
import { generateSyncCode } from './utils/syncCode';

export default function App() {
  const [userStats, setUserStats] = useState<UserStats>(() => storageService.getUserStats());
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => adminService.getAdminSession());
  const [adminTargetTab, setAdminTargetTab] = useState<AdminTab>('social');
  const [missions, setMissions] = useState<DailyMission[]>(() => storageService.getMissions());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => storageService.getLeaderboard());
  // Resilient tab navigation with session persistence so user never loses their view on sync/reload
  const [activeTab, setActiveTabState] = useState<TabType>(() => {
    try {
      const saved = sessionStorage.getItem('librasgo_active_tab');
      const validTabs: TabType[] = ['path', 'ar_lab', 'leaderboard', 'glossary', 'profile', 'login', 'missions', 'shop', 'about', 'admin', 'redeem', 'feedback'];
      if (saved && validTabs.includes(saved as TabType)) {
        return saved as TabType;
      }
    } catch {}
    return 'path';
  });

  const setActiveTab = (tab: TabType) => {
    try {
      sessionStorage.setItem('librasgo_active_tab', tab);
    } catch {}
    setActiveTabState(tab);
  };

  const [preferredPracticeMode, setPreferredPracticeMode] = useState<PracticeTabMode>('facial');

  // Resilient active lesson state: keeps activity open until explicit user close or completion
  const [activeLesson, setActiveLessonState] = useState<Lesson | null>(() => {
    try {
      const savedLesson = sessionStorage.getItem('librasgo_active_lesson');
      if (savedLesson) {
        return JSON.parse(savedLesson);
      }
    } catch {}
    return null;
  });

  const setActiveLesson = (lesson: Lesson | null) => {
    try {
      if (lesson) {
        sessionStorage.setItem('librasgo_active_lesson', JSON.stringify(lesson));
      } else {
        sessionStorage.removeItem('librasgo_active_lesson');
      }
    } catch {}
    setActiveLessonState(lesson);
  };

  const [targetARSignId, setTargetARSignId] = useState<string>('letra_a');

  // Shared Cloud Database Synced Content & Cross-Device Status
  const [sharedContent, setSharedContent] = useState(() => contentService.getContent());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => contentService.getSyncStatus());
  const [communitySigns, setCommunitySigns] = useState<TaughtSign[]>(() => aiSignLearner.getCachedSigns());
  const [communityFacialExpressions, setCommunityFacialExpressions] = useState<TaughtFacialExpression[]>(() =>
    learnedExpressionsService.getCachedExpressions()
  );

  // Real-time Auto-sync: polls every 2 seconds for admin changes without reload/download
  useEffect(() => {
    contentService.startAutoSync(2000);
    const unsubscribe = contentService.subscribe((content, status) => {
      setSharedContent(content);
      setSyncStatus(status);
    });

    // Load community taught signs across the entire app
    aiSignLearner.fetchCommunitySigns().then((signs) => {
      if (signs && signs.length > 0) {
        setCommunitySigns(signs);
      }
    });

    // Load community taught facial expressions across the entire app
    learnedExpressionsService.fetchCommunityExpressions().then((exps) => {
      if (exps && exps.length > 0) {
        setCommunityFacialExpressions(exps);
      }
    });

    // Auto-sync individual user progress to cloud and fetch real user leaderboard on app start
    if (userStats.username) {
      storageService.syncWithCloud(userStats, missions).catch(() => {});
      storageService.fetchRealLeaderboard(userStats).then((list) => {
        if (list && list.length > 0) setLeaderboard(list);
      }).catch(() => {});
    }

    return () => {
      unsubscribe();
      contentService.stopAutoSync();
    };
  }, []);

  // Auto-refresh real leaderboard, friends list, friend requests, and challenges whenever leaderboard tab is active
  useEffect(() => {
    if (activeTab === 'leaderboard' && userStats.username) {
      storageService.fetchRealLeaderboard(userStats).then((list) => {
        if (list && list.length > 0) setLeaderboard(list);
      }).catch(() => {});

      storageService.fetchFriendsList(userStats.username).then((liveFriends) => {
        if (liveFriends) {
          updateUserStats((prev) => ({
            ...prev,
            friends: liveFriends,
          }));
        }
      }).catch(() => {});

      storageService.getFriendRequests(userStats.username).then((reqs) => {
        if (reqs) {
          updateUserStats((prev) => ({
            ...prev,
            friendRequestsReceived: reqs,
          }));
        }
      }).catch(() => {});

      storageService.fetchWeeklyChallenges(userStats.username).then((chals) => {
        if (chals && chals.length > 0) {
          updateUserStats((prev) => ({
            ...prev,
            weeklyChallenges: chals,
          }));
        }
      }).catch(() => {});
    }
  }, [activeTab, userStats.username]);

  // Sync audio mute state with stats
  useEffect(() => {
    audio.setMuted(!userStats.soundEnabled);
  }, [userStats.soundEnabled]);

  // Apply active theme and profile color immediately to document, HTML, and browser chrome
  useEffect(() => {
    applyThemeToDocument(userStats.activeTheme);
  }, [userStats.activeTheme]);

  useEffect(() => {
    applyProfileColorToDocument(userStats.profileColor || userStats.activeTheme);
  }, [userStats.profileColor, userStats.activeTheme]);

  // Persist userStats changes
  const updateUserStats = (updater: (prev: UserStats) => UserStats) => {
    setUserStats((prev) => {
      const next = updater(prev);
      storageService.saveUserStats(next);
      return next;
    });
  };

  // Toggle sound
  const handleToggleSound = () => {
    updateUserStats((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  };

  // Refill hearts
  const handleRefillHearts = () => {
    audio.playSuccess();
    updateUserStats((prev) => ({
      ...prev,
      hearts: prev.maxHearts,
    }));
  };

  // Heart lost in exercise
  const handleHeartLost = () => {
    updateUserStats((prev) => ({
      ...prev,
      hearts: Math.max(0, prev.hearts - 1),
    }));
  };

  // Complete a lesson
  const handleLessonCompleted = (xpEarned: number, gemsEarned: number) => {
    if (!activeLesson) return;

    const lessonId = activeLesson.id;

    updateUserStats((prev) => {
      const newXp = prev.xp + xpEarned;
      const newGems = prev.gems + gemsEarned;
      const newCompleted = prev.completedLessonIds.includes(lessonId)
        ? prev.completedLessonIds
        : [...prev.completedLessonIds, lessonId];

      // Calculate level based on XP
      const calculatedLevel = Math.max(1, Math.floor(newXp / 150) + 1);

      // Update in leaderboard
      const updatedLeaderboard = storageService.updateUserXpInLeaderboard(newXp);
      setLeaderboard(updatedLeaderboard);

      return {
        ...prev,
        xp: newXp,
        gems: newGems,
        level: calculatedLevel,
        completedLessonIds: newCompleted,
      };
    });

    // Update mission progress (e.g. XP gained and lesson finished)
    setMissions((prevMissions) => {
      const updated = prevMissions.map((m) => {
        if (m.id === 'mission_2') {
          return {
            ...m,
            currentProgress: Math.min(m.targetProgress, m.currentProgress + xpEarned),
          };
        }
        if (m.id === 'mission_3') {
          return {
            ...m,
            currentProgress: Math.min(m.targetProgress, m.currentProgress + 1),
          };
        }
        return m;
      });
      storageService.saveMissions(updated);
      return updated;
    });
  };

  // Complete a sign in AR Studio
  const handleSignCompletedInAR = (signId: string, accuracy: number) => {
    updateUserStats((prev) => {
      const mastery = { ...prev.signMastery, [signId]: Math.max(prev.signMastery[signId] || 0, accuracy) };
      const perfect = accuracy >= 90 ? prev.perfectSignsCount + 1 : prev.perfectSignsCount;
      const bonusXp = prev.xp + 15;
      const bonusGems = prev.gems + 5;

      storageService.updateUserXpInLeaderboard(bonusXp);

      return {
        ...prev,
        xp: bonusXp,
        gems: bonusGems,
        signMastery: mastery,
        perfectSignsCount: perfect,
      };
    });

    // Advance mission 1 (AR computer vision signs)
    setMissions((prevMissions) => {
      const updated = prevMissions.map((m) => {
        if (m.id === 'mission_1' && accuracy >= 80) {
          return {
            ...m,
            currentProgress: Math.min(m.targetProgress, m.currentProgress + 1),
          };
        }
        return m;
      });
      storageService.saveMissions(updated);
      return updated;
    });
  };

  // Complete a Facial Expression / Non-Manual Exercise
  const handleCompleteFacialExercise = (
    xpEarned: number,
    gemsEarned: number,
    exerciseId: string,
    mascotItemId?: string
  ) => {
    updateUserStats((prev) => {
      const alreadyCompleted = (prev.completedFacialExerciseIds || []).includes(exerciseId);
      const newCompleted = alreadyCompleted
        ? prev.completedFacialExerciseIds || []
        : [...(prev.completedFacialExerciseIds || []), exerciseId];

      const newXp = prev.xp + xpEarned;
      const newGems = prev.gems + gemsEarned;

      // Unlock mascot item if provided and not yet owned
      let unlockedItems = prev.unlockedMascotItems || [];
      if (mascotItemId && !unlockedItems.includes(mascotItemId)) {
        unlockedItems = [...unlockedItems, mascotItemId];
      }

      storageService.updateUserXpInLeaderboard(newXp);

      const next = {
        ...prev,
        xp: newXp,
        gems: newGems,
        completedFacialExerciseIds: newCompleted,
        unlockedMascotItems: unlockedItems,
      };

      if (prev.username) {
        storageService.syncWithCloud(next, missions).catch(() => {});
      }

      return next;
    });
  };

  // Claim mission reward
  const handleClaimMission = (missionId: string) => {
    const targetMission = missions.find((m) => m.id === missionId);
    if (!targetMission || targetMission.isClaimed) return;

    updateUserStats((prev) => {
      const newXp = prev.xp + targetMission.xpReward;
      const newGems = prev.gems + targetMission.gemReward;
      storageService.updateUserXpInLeaderboard(newXp);
      return {
        ...prev,
        xp: newXp,
        gems: newGems,
      };
    });

    setMissions((prev) => {
      const updated = prev.map((m) => (m.id === missionId ? { ...m, isClaimed: true } : m));
      storageService.saveMissions(updated);
      return updated;
    });
  };

  // Claim module chest rewards
  const handleClaimModuleChest = (
    moduleId: string,
    rewards: { xp: number; gems: number; hearts: number }
  ) => {
    updateUserStats((prev) => {
      const alreadyClaimed = (prev.claimedChestIds || []).includes(moduleId);
      if (alreadyClaimed) return prev;

      const newXp = prev.xp + rewards.xp;
      const newGems = prev.gems + rewards.gems;
      const newHearts = Math.min(prev.maxHearts, prev.hearts + rewards.hearts);
      const newClaimed = [...(prev.claimedChestIds || []), moduleId];
      const newLevel = Math.max(1, Math.floor(newXp / 150) + 1);

      storageService.updateUserXpInLeaderboard(newXp);

      return {
        ...prev,
        xp: newXp,
        gems: newGems,
        hearts: newHearts,
        level: newLevel,
        claimedChestIds: newClaimed,
      };
    });
  };

  // Buy Shop Item (Powerups or Mascot items)
  const handleBuyShopItem = (itemId: string, gemCost: number): boolean => {
    if (userStats.gems < gemCost) return false;

    updateUserStats((prev) => {
      const nextGems = prev.gems - gemCost;
      if (itemId === 'streak_freeze') {
        return { ...prev, gems: nextGems, hasStreakFreeze: true };
      }
      if (itemId === 'hearts_refill') {
        return { ...prev, gems: nextGems, hearts: prev.maxHearts };
      }
      // Mascot item purchase
      const currentItems = prev.unlockedMascotItems || ['skin_esmeralda'];
      const nextItems = currentItems.includes(itemId) ? currentItems : [...currentItems, itemId];
      return { ...prev, gems: nextGems, unlockedMascotItems: nextItems };
    });
    return true;
  };

  // Equip Mascot Item (Outfit, Hat, Glasses, Skin)
  const handleEquipMascotItem = (
    category: 'outfit' | 'hat' | 'glasses' | 'skin',
    itemId: string
  ) => {
    updateUserStats((prev) => {
      const currentEquipped = prev.equippedMascot || {
        outfit: 'none',
        hat: 'none',
        glasses: 'none',
        skin: 'skin_esmeralda',
      };
      return {
        ...prev,
        equippedMascot: {
          ...currentEquipped,
          [category]: itemId,
        },
      };
    });
  };

  // Open Mystery Chest (Drops XP, Coins/Gems, Titles, Mascot Items)
  const handleOpenMysteryChest = (chest: MysteryChest): ChestRewardResult | null => {
    if (userStats.gems < chest.cost) return null;

    const gainedXp = Math.floor(
      chest.minXp + Math.random() * (chest.maxXp - chest.minXp + 1)
    );
    const gainedCoins = Math.floor(
      chest.minCoins + Math.random() * (chest.maxCoins - chest.minCoins + 1)
    );

    // Title drop chance
    let unlockedTitle: string | undefined;
    const currentTitles = userStats.unlockedTitles || ['Aprendiz Curioso'];
    const availableTitles = chest.exclusiveTitles.filter((t) => !currentTitles.includes(t));
    if (availableTitles.length > 0) {
      unlockedTitle = availableTitles[Math.floor(Math.random() * availableTitles.length)];
    }

    // Mascot Item drop chance
    let unlockedMascotItem: MascotItem | undefined;
    const currentItems = userStats.unlockedMascotItems || ['skin_esmeralda'];
    const unownedMascotItems = MASCOT_ITEMS.filter((i) => !currentItems.includes(i.id));
    const roll = Math.random() * 100;
    if (roll <= chest.guaranteedItemChance && unownedMascotItems.length > 0) {
      unlockedMascotItem =
        unownedMascotItems[Math.floor(Math.random() * unownedMascotItems.length)];
    }

    updateUserStats((prev) => {
      const nextGems = prev.gems - chest.cost + gainedCoins;
      const nextXp = prev.xp + gainedXp;
      const nextLevel = Math.max(1, Math.floor(nextXp / 150) + 1);
      const nextTitles =
        unlockedTitle && !prev.unlockedTitles?.includes(unlockedTitle)
          ? [...(prev.unlockedTitles || ['Aprendiz Curioso']), unlockedTitle]
          : prev.unlockedTitles || ['Aprendiz Curioso'];
      const nextItems =
        unlockedMascotItem && !prev.unlockedMascotItems?.includes(unlockedMascotItem.id)
          ? [...(prev.unlockedMascotItems || ['skin_esmeralda']), unlockedMascotItem.id]
          : prev.unlockedMascotItems || ['skin_esmeralda'];

      storageService.updateUserXpInLeaderboard(nextXp);

      return {
        ...prev,
        gems: nextGems,
        xp: nextXp,
        level: nextLevel,
        unlockedTitles: nextTitles,
        unlockedMascotItems: nextItems,
        activeTitle: unlockedTitle || prev.activeTitle,
      };
    });

    return {
      xp: gainedXp,
      coins: gainedCoins,
      unlockedTitle,
      unlockedMascotItem,
    };
  };

  // Equip title in profile
  const handleEquipTitle = (title: string) => {
    updateUserStats((prev) => ({
      ...prev,
      activeTitle: title,
    }));
  };

  // Restore progress from cloud by sync code or username
  const handleRestoreCloudSync = async (codeOrUsername: string): Promise<boolean> => {
    const res = await storageService.restoreFromCloud(codeOrUsername);
    if (res.success && res.data) {
      setUserStats(res.data.userStats);
      setMissions(res.data.missions);
      const updatedBoard = storageService.updateUserProfileInLeaderboard(
        res.data.userStats.username,
        res.data.userStats.avatarUrl
      );
      setLeaderboard(updatedBoard);
      return true;
    }
    return false;
  };

  // Change App Background Theme & Colors
  const handleSelectTheme = (theme: UserStats['activeTheme']) => {
    applyThemeToDocument(theme);
    updateUserStats((prev) => {
      const next = {
        ...prev,
        activeTheme: theme,
      };
      storageService.saveUserStats(next);
      storageService.syncWithCloud(next).catch(() => {});
      return next;
    });
  };

  // Change Profile Color Customization
  const handleSelectProfileColor = (color: string) => {
    applyProfileColorToDocument(color);
    updateUserStats((prev) => {
      const next = {
        ...prev,
        profileColor: color,
      };
      storageService.saveUserStats(next);
      storageService.syncWithCloud(next).catch(() => {});
      return next;
    });
  };

  // Handle Promo Code redemption rewards
  const handleRedeemSuccess = (
    rewards: { gems: number; xp: number; hearts?: number; chests?: number },
    promoMeta: { code: string; description?: string }
  ) => {
    updateUserStats((prev) => {
      const addedGems = rewards.gems || 0;
      const addedXp = rewards.xp || 0;
      const addedHearts = rewards.hearts || 0;
      const addedChests = rewards.chests || 0;

      const nextGems = prev.gems + addedGems;
      const nextXp = prev.xp + addedXp;
      const nextLevel = Math.max(1, Math.floor(nextXp / 150) + 1);
      const nextHearts = addedHearts > 0 ? prev.maxHearts : prev.hearts;
      const nextChestsCount = (prev.unopenedChestsCount || 0) + addedChests;

      const parts: string[] = [];
      if (addedGems > 0) parts.push(`+${addedGems} 💎`);
      if (addedXp > 0) parts.push(`+${addedXp} XP`);
      if (addedHearts > 0) parts.push(`+${addedHearts} ❤️`);
      if (addedChests > 0) parts.push(`+${addedChests} 🎁`);

      const nextRedeemed = [
        {
          code: promoMeta.code,
          redeemedAt: new Date().toISOString(),
          rewardsSummary: parts.join(', ') || 'Recompensa resgatada',
          gems: addedGems,
          xp: addedXp,
          hearts: addedHearts,
          chests: addedChests,
        },
        ...(prev.redeemedPromoCodes || []).filter((r) => r.code.toUpperCase() !== promoMeta.code.toUpperCase()),
      ];

      storageService.updateUserXpInLeaderboard(nextXp);

      const nextStats = {
        ...prev,
        gems: nextGems,
        xp: nextXp,
        level: nextLevel,
        hearts: nextHearts,
        unopenedChestsCount: nextChestsCount,
        redeemedPromoCodes: nextRedeemed,
      };

      storageService.saveUserStats(nextStats);
      storageService.syncWithCloud(nextStats).catch(() => {});
      return nextStats;
    });
  };

  const getThemeBackgroundClass = (theme?: UserStats['activeTheme']) => {
    return getThemeConfig(theme).bgGradient;
  };

  // Update User Profile
  const handleUpdateProfile = (username: string, avatarUrl: string, bio?: string) => {
    updateUserStats((prev) => ({
      ...prev,
      username,
      avatarUrl,
      bio,
    }));
    const updatedBoard = storageService.updateUserProfileInLeaderboard(username, avatarUrl);
    setLeaderboard(updatedBoard);
  };

  // Login with individual user restoration or clean Level 1 initialization
  const handleLogin = async (username: string, avatarUrl: string, role: UserRole = 'learner') => {
    const cleanUsername = username.trim();
    if (!cleanUsername) return;
    const normalizedUsername = cleanUsername.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (['marinette', 'carlos andrade real'].includes(normalizedUsername) || /^(bot_|testbot|fake_|ai_|ia_)/.test(normalizedUsername)) return;

    // Check if an existing profile exists in the cloud database for this user
    const restored = await storageService.restoreFromCloud(cleanUsername);

    if (restored.success && restored.data) {
      // Existing user found: restore their exact progress
      // Non-admin logins must never be granted admin role without active admin credentials (Rule 8)
      const isAuthorizedAdmin = (role === 'admin' || cleanUsername.toLowerCase() === 'admin') && Boolean(adminSession);
      const effectiveRole: UserRole = isAuthorizedAdmin ? 'admin' : 'learner';
      const userProfile: UserStats = {
        ...restored.data.userStats,
        username: cleanUsername,
        avatarUrl: avatarUrl || restored.data.userStats.avatarUrl,
        isLoggedIn: true,
        role: effectiveRole,
      };
      setUserStats(userProfile);
      setMissions(restored.data.missions);
      storageService.saveUserStats(userProfile);
      storageService.saveProfile(cleanUsername, userProfile.avatarUrl, effectiveRole);
      const updatedBoard = storageService.updateUserProfileInLeaderboard(cleanUsername, userProfile.avatarUrl);
      setLeaderboard(updatedBoard);
    } else {
      // Brand new user: Strictly initialize at Level 1, 0 XP, 0 gems, 0 streak, empty lessons
      const newAccountStats: UserStats = {
        username: cleanUsername,
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: 'Aprendendo a Língua Brasileira de Sinais com Realidade Aumentada! 🤟',
        isLoggedIn: true,
        role: 'learner',
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
        syncCode: generateSyncCode(),
        lastCloudSynced: new Date().toISOString(),
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

      setUserStats(newAccountStats);
      storageService.saveUserStats(newAccountStats);
      storageService.saveProfile(cleanUsername, newAccountStats.avatarUrl, 'learner');
      await storageService.syncWithCloud(newAccountStats, missions);
      const updatedBoard = storageService.updateUserProfileInLeaderboard(cleanUsername, newAccountStats.avatarUrl);
      setLeaderboard(updatedBoard);
    }

    if (role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('profile');
    }
  };

  // Dedicated admin login handler: loads the full administrator profile
  const handleAdminLoginSuccess = async (session: AdminSession, profile?: any) => {
    setAdminSession(session);
    let targetProfile = profile;
    if (!targetProfile) {
      const restored = await storageService.restoreFromCloud(session.username);
      if (restored.success && restored.data) {
        targetProfile = restored.data.userStats;
      }
    }
    if (!targetProfile) {
      const restored = await storageService.restoreFromCloud('admin');
      if (restored.success && restored.data) {
        targetProfile = restored.data.userStats;
      }
    }

    if (targetProfile) {
      const adminProfile: UserStats = {
        ...targetProfile,
        username: targetProfile.username || session.username || 'admin',
        role: 'admin',
        isLoggedIn: true,
      };
      setUserStats(adminProfile);
      storageService.saveUserStats(adminProfile);
      storageService.saveProfile(adminProfile.username, adminProfile.avatarUrl, 'admin');
      const updatedBoard = storageService.updateUserProfileInLeaderboard(adminProfile.username, adminProfile.avatarUrl);
      setLeaderboard(updatedBoard);
    } else {
      updateUserStats((prev) => ({
        ...prev,
        username: session.username || 'admin',
        role: 'admin',
        isLoggedIn: true,
      }));
    }
    setActiveTab('admin');
  };

  // Admin logout handler
  const handleLogoutAdmin = () => {
    adminService.logoutAdmin();
    setAdminSession(null);
    updateUserStats((prev) => ({
      ...prev,
      role: 'learner',
    }));
    setActiveTab('login');
  };

  // Direct launcher for AR Studio with a specific sign
  const handleOpenARWithSign = (signId?: string) => {
    if (signId) {
      setTargetARSignId(signId);
    }
    setPreferredPracticeMode('signs_ar');
    setActiveTab('ar_lab');
  };

  // Friends, Friend Requests and Weekly XP Challenges
  const handleSendFriendRequest = async (targetUsername: string): Promise<{ success: boolean; message: string }> => {
    if (!userStats.username) {
      return { success: false, message: 'Você precisa estar logado para enviar solicitações.' };
    }
    const res = await storageService.sendFriendRequest(userStats.username, targetUsername);
    if (res.success) {
      updateUserStats((prev) => ({
        ...prev,
        friendRequestsSent: [...(prev.friendRequestsSent || []), targetUsername],
      }));
    }
    return res;
  };

  const handleRespondFriendRequest = async (requesterUsername: string, action: 'accept' | 'reject') => {
    if (!userStats.username) return;
    const res = await storageService.respondFriendRequest(userStats.username, requesterUsername, action);
    if (res.success) {
      const updatedReceived = (userStats.friendRequestsReceived || []).filter(
        (r) => r.fromUsername.toLowerCase() !== requesterUsername.toLowerCase()
      );
      if (action === 'accept' && res.friends) {
        updateUserStats((prev) => ({
          ...prev,
          friends: res.friends,
          friendRequestsReceived: updatedReceived,
        }));
      } else {
        updateUserStats((prev) => ({
          ...prev,
          friendRequestsReceived: updatedReceived,
        }));
      }
    }
  };

  const handleAddFriend = async (friend: FriendUser) => {
    updateUserStats((prev) => {
      const currentFriends = prev.friends || [];
      if (currentFriends.some((f) => f.username.toLowerCase() === friend.username.toLowerCase())) {
        return prev;
      }
      const updated = {
        ...prev,
        friends: [...currentFriends, friend],
      };
      storageService.saveUserStats(updated);
      storageService.syncWithCloud(updated, missions).catch(() => {});
      return updated;
    });
  };

  const handleRemoveFriend = async (username: string) => {
    if (userStats.username) {
      await storageService.removeFriend(userStats.username, username);
    }
    updateUserStats((prev) => {
      const updated = {
        ...prev,
        friends: (prev.friends || []).filter((f) => f.username.toLowerCase() !== username.toLowerCase()),
      };
      storageService.saveUserStats(updated);
      storageService.syncWithCloud(updated, missions).catch(() => {});
      return updated;
    });
  };

  const handleCreateWeeklyChallenge = async (targetUsername: string, targetAvatarUrl: string, goalXp: number) => {
    if (!userStats.username) return;
    const res = await storageService.createWeeklyChallenge(userStats.username, targetUsername, goalXp);
    if (res.success && res.challenge) {
      updateUserStats((prev) => ({
        ...prev,
        weeklyChallenges: [res.challenge!, ...(prev.weeklyChallenges || [])],
      }));
    } else {
      // Local fallback
      const friend = (userStats.friends || []).find((f) => f.username === targetUsername);
      const newChallenge: WeeklyChallenge = {
        id: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        targetUsername,
        targetAvatarUrl,
        challengerXpAtStart: userStats.xp,
        targetXpAtStart: friend ? friend.xp : 0,
        goalXp,
        weekStartDate: new Date().toISOString(),
        weekEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        xpReward: goalXp,
        gemsReward: goalXp >= 500 ? 150 : 80,
        status: 'em_andamento',
        isClaimed: false,
      };

      updateUserStats((prev) => {
        const updated = {
          ...prev,
          weeklyChallenges: [newChallenge, ...(prev.weeklyChallenges || [])],
        };
        storageService.saveUserStats(updated);
        storageService.syncWithCloud(updated, missions).catch(() => {});
        return updated;
      });
    }
  };

  const handleClaimWeeklyChallenge = async (challengeId: string) => {
    if (userStats.username) {
      const res = await storageService.claimWeeklyChallenge(userStats.username, challengeId);
      if (res.success && res.userStats) {
        updateUserStats((prev) => ({
          ...prev,
          xp: res.userStats!.xp,
          gems: res.userStats!.gems,
          weeklyChallenges: res.userStats!.weeklyChallenges,
        }));
        return;
      }
    }

    // Local fallback if offline
    const challenge = (userStats.weeklyChallenges || []).find((c) => c.id === challengeId);
    if (!challenge || challenge.isClaimed) return;

    updateUserStats((prev) => {
      const updatedChallenges = (prev.weeklyChallenges || []).map((c) =>
        c.id === challengeId ? { ...c, isClaimed: true, status: 'vitoria' as const } : c
      );
      const updated = {
        ...prev,
        xp: prev.xp + challenge.xpReward,
        gems: prev.gems + challenge.gemsReward,
        weeklyChallenges: updatedChallenges,
      };
      storageService.saveUserStats(updated);
      storageService.syncWithCloud(updated, missions).catch(() => {});
      return updated;
    });
  };

  const handleRefreshLeaderboard = async () => {
    const list = await storageService.fetchRealLeaderboard(userStats);
    if (list && list.length > 0) setLeaderboard(list);
    if (userStats.username) {
      const liveFriends = await storageService.fetchFriendsList(userStats.username);
      const reqs = await storageService.getFriendRequests(userStats.username);
      const chals = await storageService.fetchWeeklyChallenges(userStats.username);
      updateUserStats((prev) => ({
        ...prev,
        friends: liveFriends || prev.friends,
        friendRequestsReceived: reqs || prev.friendRequestsReceived,
        weeklyChallenges: chals.length > 0 ? chals : prev.weeklyChallenges,
      }));
    }
  };

  // Count unclaimed completed missions
  const pendingMissionsCount = missions.filter(
    (m) => m.currentProgress >= m.targetProgress && !m.isClaimed
  ).length;

  // Combine official signs with converted community signs and facial signs for full integration
  const convertedCommunitySigns = React.useMemo(() => {
    return communitySigns.map(convertTaughtSignToLibrasSign);
  }, [communitySigns]);

  const allFacialSigns = React.useMemo(() => {
    return getAllFacialSigns(communityFacialExpressions);
  }, [communityFacialExpressions]);

  const allAvailableSigns = React.useMemo(() => {
    const map = new Map<string, LibrasSign>();
    sharedContent.signs.forEach((s) => map.set(s.id, s));
    convertedCommunitySigns.forEach((s) => map.set(s.id, s));
    allFacialSigns.forEach((s) => map.set(s.id, s));
    return Array.from(map.values());
  }, [sharedContent.signs, convertedCommunitySigns, allFacialSigns]);

  // Combine official modules with dynamic community learning module and facial expressions module
  const allModules = React.useMemo(() => {
    const communityModule = buildCommunityLearningModule(communitySigns);
    const facialModule = buildFacialLearningModule(communityFacialExpressions);

    const baseModules = sharedContent.modules;
    const hasFacial = baseModules.some((m) => m.id === 'mod_facial');
    let modulesList: LearningModule[];

    if (hasFacial) {
      modulesList = baseModules.map((m) => (m.id === 'mod_facial' ? facialModule : m));
    } else {
      const insertIdx = baseModules.findIndex((m) => m.level === 3 || m.id === 'mod_3');
      if (insertIdx !== -1) {
        modulesList = [
          ...baseModules.slice(0, insertIdx),
          facialModule,
          ...baseModules.slice(insertIdx),
        ];
      } else {
        modulesList = [facialModule, ...baseModules];
      }
    }

    if (communityModule) {
      modulesList.push(communityModule);
    }

    return modulesList;
  }, [sharedContent.modules, communitySigns, communityFacialExpressions]);

  // Keep activeLesson synced with refreshed module definitions without resetting or closing
  useEffect(() => {
    if (activeLesson) {
      for (const mod of allModules) {
        const matching = mod.lessons.find((l: Lesson) => l.id === activeLesson.id);
        if (matching && JSON.stringify(matching) !== JSON.stringify(activeLesson)) {
          setActiveLesson(matching);
          break;
        }
      }
    }
  }, [allModules]);

  // Manual sync trigger
  const handleManualSync = async () => {
    await contentService.fetchSharedContent();
    await storageService.syncWithCloud(userStats, missions);
  };

  // Open Admin Dashboard directly on target tab with auto-session
  const handleOpenAdminTab = async (targetTab: AdminTab = 'social') => {
    let session = adminSession || adminService.getAdminSession();
    if (!session) {
      const res = await adminService.loginAdmin('Administrador');
      if (res.success && res.session) {
        session = res.session;
        setAdminSession(session);
      }
    }
    setAdminTargetTab(targetTab);
    setActiveTab('admin');
  };

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-500 selection:bg-emerald-500 selection:text-slate-950 relative"
      style={getThemeBackgroundStyle(userStats.activeTheme)}
    >
      
      {/* Top Header */}
      <Header
        stats={userStats}
        isAdmin={Boolean(adminSession) || userStats.role === 'admin'}
        syncStatus={syncStatus}
        onManualSync={handleManualSync}
        onOpenShop={() => setActiveTab('shop')}
        onOpenRedeem={() => setActiveTab('redeem')}
        onOpenARStudio={() => {
          setPreferredPracticeMode('facial');
          setActiveTab('ar_lab');
        }}
        onOpenAbout={() => setActiveTab('about')}
        onOpenProfile={() => setActiveTab('profile')}
        onOpenLogin={() => setActiveTab('login')}
        onOpenAdmin={() => handleOpenAdminTab('social')}
        onToggleSound={handleToggleSound}
        onRefillHearts={handleRefillHearts}
      />

      {/* Main Tab Views */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'path' && (
          <PathView
            userStats={userStats}
            modules={allModules}
            onSelectLesson={(lesson) => setActiveLesson(lesson)}
            onOpenARStudio={handleOpenARWithSign}
            onOpenFacialPractice={() => {
              setPreferredPracticeMode('facial');
              setActiveTab('ar_lab');
            }}
            onOpenTeachFacial={() => {
              setPreferredPracticeMode('teach_facial');
              setActiveTab('ar_lab');
            }}
            onClaimModuleChest={handleClaimModuleChest}
          />
        )}

        {activeTab === 'ar_lab' && (
          <PracticeHubView
            userStats={userStats}
            signs={allAvailableSigns}
            targetSignId={targetARSignId}
            defaultMode={preferredPracticeMode}
            onSignCompletedInAR={handleSignCompletedInAR}
            onCompleteFacialExercise={(xp, gems, exId, mascotItemId) => {
              handleCompleteFacialExercise(xp, gems, exId, mascotItemId);
              learnedExpressionsService.fetchCommunityExpressions().then((exps) => {
                if (exps && exps.length > 0) {
                  setCommunityFacialExpressions(exps);
                }
              });
            }}
            onAwardXp={(xp, gems) => {
              updateUserStats((prev) => {
                const newXp = prev.xp + xp;
                const newGems = prev.gems + gems;
                storageService.updateUserXpInLeaderboard(newXp);
                return { ...prev, xp: newXp, gems: newGems };
              });
            }}
            onTaughtSignSaved={() => {
              aiSignLearner.fetchCommunitySigns().then((signs) => {
                if (signs && signs.length > 0) {
                  setCommunitySigns(signs);
                }
              });
              learnedExpressionsService.fetchCommunityExpressions().then((exps) => {
                if (exps && exps.length > 0) {
                  setCommunityFacialExpressions(exps);
                }
              });
            }}
          />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView
            entries={leaderboard}
            currentUserXp={userStats.xp}
            currentUsername={userStats.username}
            currentUserAvatar={userStats.avatarUrl}
            currentUserLevel={userStats.level}
            currentUserStreak={userStats.streak}
            friends={userStats.friends || []}
            weeklyChallenges={userStats.weeklyChallenges || []}
            friendRequests={userStats.friendRequestsReceived || []}
            onAddFriend={handleAddFriend}
            onRemoveFriend={handleRemoveFriend}
            onSendFriendRequest={handleSendFriendRequest}
            onRespondFriendRequest={handleRespondFriendRequest}
            onCreateWeeklyChallenge={handleCreateWeeklyChallenge}
            onClaimWeeklyChallenge={handleClaimWeeklyChallenge}
            onRefreshLeaderboard={handleRefreshLeaderboard}
          />
        )}

        {activeTab === 'glossary' && (
          <LibrasDexView
            signs={allAvailableSigns}
            onPracticeInAR={handleOpenARWithSign}
            masteredSignIds={Object.keys(userStats.signMastery)}
          />
        )}

        {activeTab === 'missions' && (
          <MissionsView
            missions={missions}
            achievements={ACHIEVEMENTS}
            onClaimMission={handleClaimMission}
          />
        )}

        {activeTab === 'shop' && (
          <ShopView
            userStats={userStats}
            chests={sharedContent.chests}
            onServerPurchaseSuccess={(updatedStats) => {
              setUserStats(updatedStats);
              storageService.saveUserStats(updatedStats);
              storageService.updateUserXpInLeaderboard(updatedStats.xp);
            }}
            onSelectTheme={handleSelectTheme}
            onEquipMascotItem={handleEquipMascotItem}
            onEquipCompanion={(companionId) => {
              updateUserStats((prev) => ({
                ...prev,
                activeMascotId: companionId,
              }));
            }}
            onEquipNameColor={(nameColorId) => {
              updateUserStats((prev) => ({
                ...prev,
                nameColor: nameColorId,
              }));
            }}
            onOpenMysteryChest={handleOpenMysteryChest}
            onEquipTitle={handleEquipTitle}
          />
        )}

        {activeTab === 'about' && (
          <AboutView
            onStartLearning={() => setActiveTab('path')}
            onOpenARStudio={() => handleOpenARWithSign('letra_l')}
          />
        )}

        {activeTab === 'redeem' && (
          <RedeemView
            userStats={userStats}
            chests={sharedContent.chests}
            onRedeemSuccess={handleRedeemSuccess}
            onOpenMysteryChest={handleOpenMysteryChest}
            onNavigateToShop={() => setActiveTab('shop')}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            stats={userStats}
            signs={allAvailableSigns}
            achievements={ACHIEVEMENTS}
            onUpdateProfile={handleUpdateProfile}
            onOpenLogin={() => setActiveTab('login')}
            onOpenARStudio={handleOpenARWithSign}
            onEquipTitle={handleEquipTitle}
            onRestoreCloudSync={handleRestoreCloudSync}
            onEquipCompanion={(companionId) => {
              updateUserStats((prev) => {
                const next = { ...prev, activeMascotId: companionId };
                storageService.saveUserStats(next);
                storageService.syncWithCloud(next).catch(() => {});
                return next;
              });
            }}
            onEquipMascotItem={handleEquipMascotItem}
            onSelectTheme={handleSelectTheme}
            onSelectProfileColor={handleSelectProfileColor}
            onEquipNameColor={(nameColorId) => {
              updateUserStats((prev) => {
                const next = { ...prev, nameColor: nameColorId };
                storageService.saveUserStats(next);
                storageService.syncWithCloud(next).catch(() => {});
                return next;
              });
            }}
          />
        )}

        {activeTab === 'feedback' && (
          <FeedbackView
            currentUsername={userStats.username}
            syncCode={userStats.syncCode}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === 'admin' && (
          adminSession ? (
            <AdminDashboard
              adminSession={adminSession}
              initialTab={adminTargetTab}
              onLogoutAdmin={handleLogoutAdmin}
              onSwitchToLearner={() => setActiveTab('path')}
            />
          ) : (
            <LoginView
              currentUsername={userStats.username}
              currentAvatar={userStats.avatarUrl}
              onLogin={handleLogin}
              onAdminLoginSuccess={handleAdminLoginSuccess}
              onCancel={() => setActiveTab('profile')}
            />
          )
        )}

        {activeTab === 'login' && (
          <LoginView
            currentUsername={userStats.username}
            currentAvatar={userStats.avatarUrl}
            onLogin={handleLogin}
            onAdminLoginSuccess={handleAdminLoginSuccess}
            onCancel={() => setActiveTab('profile')}
          />
        )}
      </main>

      {/* Active Lesson Modal */}
      {activeLesson && (
        <LessonModal
          lesson={activeLesson}
          userHearts={userStats.hearts}
          signs={allAvailableSigns}
          onComplete={handleLessonCompleted}
          onHeartLost={handleHeartLost}
          onRefillHearts={handleRefillHearts}
          onClose={() => setActiveLesson(null)}
        />
      )}

      {/* Bottom Sticky Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'admin') {
            handleOpenAdminTab('social');
          } else {
            setActiveTab(tab);
          }
        }}
        pendingMissionsCount={pendingMissionsCount}
        isAdmin={Boolean(adminSession) || userStats.role === 'admin'}
      />
    </div>
  );
}
