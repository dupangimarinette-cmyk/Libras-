import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  ChevronUp,
  ChevronDown,
  Clock,
  ShieldCheck,
  Sparkles,
  MapPin,
  Users,
  Swords,
  UserPlus,
  Search,
  CheckCircle2,
  Trash2,
  Award,
  Gem,
  ArrowRight,
  Gift,
  X,
  Target,
  RefreshCw,
  Mail,
  Check,
} from 'lucide-react';
import { LeaderboardEntry, FriendUser, WeeklyChallenge, FriendRequest } from '../../types/libras';
import { audio } from '../../services/audioService';
import { calculateRank, getRankConfig } from '../../controllers/rankController';
import { RankBadge } from '../common/RankBadge';

export interface LeaderboardViewProps {
  entries: LeaderboardEntry[];
  currentUserXp: number;
  currentUsername: string;
  currentUserAvatar?: string;
  currentUserLevel?: number;
  currentUserStreak?: number;
  friends?: FriendUser[];
  weeklyChallenges?: WeeklyChallenge[];
  friendRequests?: FriendRequest[];
  onAddFriend?: (friend: FriendUser) => void;
  onRemoveFriend?: (username: string) => void;
  onSendFriendRequest?: (targetUsername: string) => Promise<{ success: boolean; message: string }>;
  onRespondFriendRequest?: (requesterUsername: string, action: 'accept' | 'reject') => Promise<void>;
  onCreateWeeklyChallenge?: (targetUsername: string, targetAvatarUrl: string, goalXp: number) => void;
  onClaimWeeklyChallenge?: (challengeId: string) => void;
  onRefreshLeaderboard?: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  entries,
  currentUserXp,
  currentUsername,
  currentUserAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  currentUserLevel = 3,
  currentUserStreak = 5,
  friends = [],
  weeklyChallenges = [],
  friendRequests = [],
  onAddFriend,
  onRemoveFriend,
  onSendFriendRequest,
  onRespondFriendRequest,
  onCreateWeeklyChallenge,
  onClaimWeeklyChallenge,
  onRefreshLeaderboard,
}) => {
  const [mainTab, setMainTab] = useState<'global' | 'friends'>('global');
  type LeagueFilter = 'Todas' | 'Bronze' | 'Prata' | 'Ouro' | 'Safira' | 'Diamante';
  const [selectedLeague, setSelectedLeague] = useState<LeagueFilter>('Todas');

  // Friends search and add state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [pendingSentUsernames, setPendingSentUsernames] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New challenge modal state
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [challengeTargetFriend, setChallengeTargetFriend] = useState<FriendUser | null>(null);
  const [challengeGoalXp, setChallengeGoalXp] = useState<number>(300);

  const leagues: { id: LeagueFilter; name: string; color: string; icon: string; range: string; isNew?: boolean }[] = [
    { id: 'Todas', name: 'Geral', color: 'from-emerald-500 to-teal-600', icon: '🏆', range: 'Todos' },
    { id: 'Bronze', name: 'Bronze', color: 'from-amber-700 to-amber-900', icon: '🥉', range: '0-99 XP' },
    { id: 'Prata', name: 'Prata', color: 'from-slate-300 to-slate-500', icon: '🥈', range: '100-499 XP' },
    { id: 'Ouro', name: 'Ouro', color: 'from-amber-400 to-yellow-500', icon: '🥇', range: '500-1.199 XP' },
    { id: 'Safira', name: 'Safira', color: 'from-cyan-400 to-blue-600', icon: '💎', range: '1.200-2.499 XP', isNew: true },
    { id: 'Diamante', name: 'Diamante', color: 'from-cyan-300 to-indigo-400', icon: '✨', range: '2.500+ XP', isNew: true },
  ];

  // User's own rank
  const userRankInfo = calculateRank(currentUserXp);

  // Filtered leaderboard entries based on league selection
  const displayEntries = React.useMemo(() => {
    let list = [...entries];
    if (selectedLeague !== 'Todas') {
      list = list.filter((e) => {
        const r = calculateRank(e.xp).currentRank;
        return (
          r.name.toLowerCase() === selectedLeague.toLowerCase() ||
          (e.league && e.league.toLowerCase() === selectedLeague.toLowerCase())
        );
      });
    }
    list.sort((a, b) => b.xp - a.xp);
    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  }, [entries, selectedLeague]);

  // Top 3 entries
  const top1 = displayEntries[0];
  const top2 = displayEntries[1];
  const top3 = displayEntries[2];

  // Search real users on server (or load all community learners if query is empty)
  const fetchUsers = async (query: string) => {
    setIsSearching(true);
    setSearchFeedback(null);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
          // Filter out current user from search results
          const filtered = data.users.filter(
            (u: any) => u.username.toLowerCase() !== currentUsername.toLowerCase()
          );
          setSearchResults(filtered);
          if (filtered.length === 0 && query) {
            setSearchFeedback('Nenhum aluno encontrado com este nome ou código.');
          }
        }
      } else {
        setSearchFeedback('Erro ao buscar usuários no servidor.');
      }
    } catch {
      setSearchFeedback('Erro de conexão ao buscar usuários.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery.trim());
  };

  // Pre-load registered community learners when switching to friends tab
  useEffect(() => {
    if (mainTab === 'friends' && searchResults.length === 0) {
      fetchUsers('');
    }
  }, [mainTab]);

  const handleAddFriendClick = async (user: any) => {
    const isAlreadyFriend = friends.some(
      (f) => f.username.toLowerCase() === user.username.toLowerCase()
    );
    if (isAlreadyFriend) {
      alert(`${user.username} já está na sua lista de amigos!`);
      return;
    }

    if (onSendFriendRequest) {
      setIsSearching(true);
      const res = await onSendFriendRequest(user.username);
      setIsSearching(false);
      setSearchFeedback(res.message);
      if (res.success) {
        audio.playSuccess();
        setPendingSentUsernames((prev) => [...prev, user.username]);
      }
      return;
    }

    if (!onAddFriend) return;
    const newFriend: FriendUser = {
      username: user.username,
      avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 1,
      activeTitle: user.activeTitle || 'Aluno de Libras',
      addedAt: new Date().toISOString(),
    };

    onAddFriend(newFriend);
    audio.playSuccess();
    setSearchResults((prev) => prev.filter((u) => u.username !== user.username));
  };

  const handleManualRefresh = async () => {
    if (onRefreshLeaderboard) {
      setIsRefreshing(true);
      await onRefreshLeaderboard();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleStartChallengeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeTargetFriend || !onCreateWeeklyChallenge) return;

    onCreateWeeklyChallenge(
      challengeTargetFriend.username,
      challengeTargetFriend.avatarUrl,
      challengeGoalXp
    );
    audio.playVictory();
    setIsCreatingChallenge(false);
    setChallengeTargetFriend(null);
  };

  // Combine user with friends for Friends Ranking
  const friendsLeaderboard = React.useMemo(() => {
    const list = [
      {
        username: currentUsername,
        avatarUrl: currentUserAvatar,
        xp: currentUserXp,
        level: currentUserLevel,
        streak: currentUserStreak,
        activeTitle: 'Você',
        isCurrent: true,
      },
      ...friends.map((f) => ({
        username: f.username,
        avatarUrl: f.avatarUrl,
        xp: f.xp,
        level: f.level,
        streak: f.streak,
        activeTitle: f.activeTitle || 'Aluno',
        isCurrent: false,
      })),
    ];

    list.sort((a, b) => b.xp - a.xp);
    return list.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [friends, currentUserXp, currentUsername, currentUserAvatar, currentUserLevel, currentUserStreak]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 text-white space-y-6">
      
      {/* Primary Sub-Tab Switcher: Ranking Geral vs Amigos e Desafios */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-lg">
        <button
          onClick={() => {
            audio.playClick();
            setMainTab('global');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
            mainTab === 'global'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Ranking Geral</span>
        </button>

        <button
          onClick={() => {
            audio.playClick();
            setMainTab('friends');
          }}
          className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            mainTab === 'friends'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Amigos & Desafios</span>
          {weeklyChallenges.filter((c) => c.status === 'em_andamento').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-2 right-2" />
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* SUB-TAB 1: RANKING GERAL                                             */}
      {/* ==================================================================== */}
      {mainTab === 'global' && (
        <div className="space-y-6 animate-fadeIn">
          {/* League Selection Tabs */}
          <div className="flex items-center gap-1 p-1 sm:p-1.5 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto no-scrollbar scroll-smooth">
            {leagues.map((lg) => {
              const isActive = selectedLeague === lg.id;
              return (
                <button
                  key={lg.id}
                  onClick={() => {
                    audio.playClick();
                    setSelectedLeague(lg.id);
                  }}
                  className={`flex-1 py-1.5 sm:py-2 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap flex-shrink-0 relative ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white bg-slate-850/60'
                  }`}
                >
                  <span>{lg.icon}</span>
                  <span>{lg.name}</span>
                  {lg.isNew && (
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded-full font-black bg-cyan-400 text-slate-950 animate-pulse">
                      Novo
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* League Spotlight Card (Quando uma liga específica está selecionada) */}
          {selectedLeague !== 'Todas' && (() => {
            const currentRankConf = getRankConfig(selectedLeague.toLowerCase());
            const isUserInLeague = userRankInfo.currentRank.name.toLowerCase() === selectedLeague.toLowerCase();
            const xpNeeded = Math.max(0, currentRankConf.minXP - currentUserXp);

            return (
              <div
                className="p-4 rounded-3xl border-2 space-y-3 shadow-xl transition-all"
                style={{
                  background: `linear-gradient(135deg, ${currentRankConf.color}25, #0f172a)`,
                  borderColor: `${currentRankConf.color}80`,
                  boxShadow: `0 0 25px ${currentRankConf.color}25`,
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${currentRankConf.color}40, #1e293b)`,
                        borderColor: currentRankConf.color,
                      }}
                    >
                      <span>{currentRankConf.badgeEmoji}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">
                          Liga <span style={{ color: currentRankConf.color }}>{currentRankConf.name}</span>
                        </h3>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-black/40 text-slate-200 border border-white/10">
                          {currentRankConf.minXP} {currentRankConf.maxXP ? `- ${currentRankConf.maxXP}` : '+'} XP
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {currentRankConf.description}
                      </p>
                    </div>
                  </div>

                  {/* Status do Aluno nesta Liga */}
                  <div className="flex items-center gap-2">
                    {isUserInLeague ? (
                      <span className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Você está nesta Liga!</span>
                      </span>
                    ) : currentUserXp < currentRankConf.minXP ? (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-white/10">
                        Faltam <strong className="text-amber-400">{xpNeeded} XP</strong> para ingressar
                      </span>
                    ) : (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Liga superada! Seu rank: <strong>{userRankInfo.currentRank.name}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Recompensas Virtuais da Liga */}
                <div className="flex items-center gap-4 pt-2 border-t border-white/10 text-xs text-slate-300 flex-wrap">
                  <span className="text-[11px] font-bold text-amber-400">Recompensas da Liga:</span>
                  <span className="flex items-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-cyan-400" />
                    <span>+{currentRankConf.virtualRewards.gems} Diamantes</span>
                  </span>
                  {currentRankConf.virtualRewards.title && (
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-purple-400" />
                      <span>Título: "{currentRankConf.virtualRewards.title}"</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{currentRankConf.virtualRewards.badgeName}</span>
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Season Countdown Banner & Real Users Security Badge */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>A temporada semanal termina em: <strong>2 dias e 14 horas</strong></span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Usuários Reais Conectados</span>
            </div>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 items-end pt-5 sm:pt-6">
            
            {/* 2nd Place */}
            {top2 && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <img
                    src={top2.avatar}
                    alt={top2.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-slate-300 object-cover shadow-lg"
                  />
                  <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-300 text-slate-950 font-black text-[10px] sm:text-xs flex items-center justify-center">
                    2
                  </span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-2 sm:p-3 text-center min-h-[6.5rem] sm:h-28 flex flex-col justify-between">
                  <span className="text-[11px] sm:text-xs font-bold truncate block">{top2.name.split(' ')[0]}</span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-300">{top2.xp} XP</span>
                  <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold flex items-center justify-center gap-0.5">
                    <Flame className="w-3 h-3 fill-amber-400" /> {top2.streak}d
                  </span>
                </div>
              </div>
            )}

            {/* 1st Place (Trophy Leader) */}
            {top1 && (
              <div className="flex flex-col items-center -mt-5 sm:-mt-6">
                <div className="relative mb-2">
                  <div className="absolute -top-5 sm:-top-6 inset-x-0 mx-auto flex justify-center">
                    <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 animate-bounce" />
                  </div>
                  <img
                    src={top1.avatar}
                    alt={top1.name}
                    className="w-14 h-14 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 border-yellow-400 object-cover shadow-xl shadow-yellow-500/20 ring-2 sm:ring-4 ring-yellow-400/20"
                  />
                  <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-yellow-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center">
                    1
                  </span>
                </div>
                <div className="w-full bg-gradient-to-b from-yellow-500/20 to-slate-900 border border-yellow-500/50 rounded-2xl p-2 sm:p-3 text-center min-h-[7.5rem] sm:h-34 flex flex-col justify-between shadow-xl">
                  <span className="text-[11px] sm:text-xs font-black text-yellow-300 truncate block">{top1.name.split(' ')[0]}</span>
                  <span className="text-xs sm:text-sm font-black text-white">{top1.xp} XP</span>
                  <span className="text-[9px] sm:text-[10px] text-amber-300 font-bold flex items-center justify-center gap-0.5">
                    <Flame className="w-3.5 h-3.5 fill-amber-400" /> {top1.streak}d
                  </span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <img
                    src={top3.avatar}
                    alt={top3.name}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-amber-600 object-cover shadow-lg"
                  />
                  <span className="absolute -bottom-1.5 inset-x-0 mx-auto w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-amber-600 text-white font-black text-[10px] sm:text-xs flex items-center justify-center">
                    3
                  </span>
                </div>
                <div className="w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-2 sm:p-3 text-center min-h-[6rem] sm:h-24 flex flex-col justify-between">
                  <span className="text-[11px] sm:text-xs font-bold truncate block">{top3.name.split(' ')[0]}</span>
                  <span className="text-[11px] sm:text-xs font-black text-amber-400">{top3.xp} XP</span>
                  <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold flex items-center justify-center gap-0.5">
                    <Flame className="w-3 h-3 fill-amber-400" /> {top3.streak}d
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Leaderboard Table List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3 text-[11px] font-bold uppercase text-slate-400">
              <span>Posição & Usuário</span>
              <span>Experiência (XP)</span>
            </div>

            {displayEntries.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <span className="text-3xl">🏅</span>
                <h4 className="text-sm font-bold text-slate-200">Nenhum aluno na Liga {selectedLeague} no momento</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Acumule XP em lições e no treino AR para ser o pioneiro a conquistar esta liga!
                </p>
                <button
                  onClick={() => setSelectedLeague('Todas')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
                >
                  Ver Ranking Geral
                </button>
              </div>
            ) : (
              displayEntries.map((entry) => {
                const isUser = entry.isCurrentUser;
                const isPromotion = entry.rank <= 5;
                const isRelegation = entry.rank >= 9;
                const entryRank = calculateRank(entry.xp).currentRank;

                return (
                  <div
                    key={entry.id}
                    className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isUser
                        ? 'bg-emerald-950/70 border-emerald-400 text-white shadow-lg shadow-emerald-500/10 ring-2 ring-emerald-500/20'
                        : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          entry.rank === 1
                            ? 'bg-yellow-400 text-slate-950'
                            : entry.rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : entry.rank === 3
                            ? 'bg-amber-600 text-white'
                            : isUser
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {entry.rank}
                      </div>

                      <img
                        src={entry.avatar}
                        alt={entry.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />

                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs sm:text-sm font-extrabold ${isUser ? 'text-emerald-300' : 'text-white'}`}>
                            {entry.name}
                          </span>
                          <RankBadge rankId={entryRank.id} variant="compact" />
                          {entry.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                              {entry.badge}
                            </span>
                          )}
                        </div>
                        {entry.location && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {entry.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-black ${isUser ? 'text-emerald-400' : 'text-white'}`}>
                          {entry.xp} XP
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-amber-400 font-bold">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          <span>{entry.streak}d</span>
                        </div>
                      </div>

                      {isPromotion ? (
                        <span title="Zona de Promoção"><ChevronUp className="w-4 h-4 text-emerald-400" /></span>
                      ) : isRelegation ? (
                        <span title="Zona de Rebaixamento"><ChevronDown className="w-4 h-4 text-rose-500" /></span>
                      ) : (
                        <span className="w-4 h-4 text-slate-600 text-center font-bold text-xs">-</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SUB-TAB 2: AMIGOS E DESAFIOS SEMANAIS POR XP                         */}
      {/* ==================================================================== */}
      {mainTab === 'friends' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Section 0: Pending Friend Requests Received */}
          {friendRequests && friendRequests.length > 0 && (
            <div className="p-4 rounded-3xl bg-indigo-950/70 border border-indigo-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  Solicitações de Amizade Recebidas ({friendRequests.length})
                </h4>
                <span className="text-[10px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full font-black uppercase">
                  Novo
                </span>
              </div>

              <div className="space-y-2">
                {friendRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-slate-900 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.fromAvatarUrl}
                        alt={req.fromUsername}
                        className="w-10 h-10 rounded-full object-cover border-2 border-indigo-400"
                      />
                      <div>
                        <span className="text-xs font-black text-white block">{req.fromUsername}</span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {req.fromXp} XP • Nível {req.fromLevel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onRespondFriendRequest && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              audio.playSuccess();
                              onRespondFriendRequest(req.fromUsername, 'accept');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aceitar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              audio.playClick();
                              onRespondFriendRequest(req.fromUsername, 'reject');
                            }}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-colors cursor-pointer"
                            title="Recusar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Weekly XP Challenge Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Desafios Semanais por XP</h3>
                  <p className="text-xs text-indigo-200/70">
                    Dispute com seus amigos quem acumula mais XP nesta semana e conquiste Diamantes extras!
                  </p>
                </div>
              </div>

              {friends.length > 0 && (
                <button
                  onClick={() => setIsCreatingChallenge(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs shadow-lg shadow-indigo-500/30 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Novo Desafio</span>
                </button>
              )}
            </div>

            {/* List of Active Challenges */}
            {weeklyChallenges.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-950/50 border border-indigo-500/20 text-center space-y-2">
                <Target className="w-8 h-8 text-indigo-400/60 mx-auto" />
                <p className="text-xs text-slate-300 font-bold">Nenhum desafio semanal ativo no momento.</p>
                <p className="text-[11px] text-slate-400">
                  {friends.length === 0
                    ? 'Adicione amigos abaixo para desafiá-los para um duelo de XP!'
                    : 'Clique em "Novo Desafio" ou no botão "Desafiar" ao lado do amigo para começar um duelo!'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {weeklyChallenges.map((challenge) => {
                  const userXpGained = Math.max(0, currentUserXp - challenge.challengerXpAtStart);
                  const progressPct = Math.min(100, Math.round((userXpGained / challenge.goalXp) * 100));
                  const isWon = userXpGained >= challenge.goalXp;

                  return (
                    <div
                      key={challenge.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-3 shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-300 flex items-center gap-1">
                            <Swords className="w-3.5 h-3.5 text-amber-400" />
                            Duelo Semanal: Você vs {challenge.targetUsername}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isWon
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {isWon ? 'Meta Atingida!' : 'Em Andamento'}
                        </span>
                      </div>

                      {/* Opponents & Avatars */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <img
                            src={currentUserAvatar}
                            alt="Você"
                            className="w-8 h-8 rounded-full border border-emerald-500 object-cover"
                          />
                          <div>
                            <span className="font-bold text-white block">Você</span>
                            <span className="text-[10px] text-emerald-400 font-bold">+{userXpGained} XP na semana</span>
                          </div>
                        </div>

                        <div className="text-center font-black text-amber-400 text-xs px-2">
                          VS
                        </div>

                        <div className="flex items-center gap-2 text-right">
                          <div>
                            <span className="font-bold text-white block">{challenge.targetUsername}</span>
                            <span className="text-[10px] text-indigo-300 font-bold">Meta: {challenge.goalXp} XP</span>
                          </div>
                          <img
                            src={challenge.targetAvatarUrl}
                            alt={challenge.targetUsername}
                            className="w-8 h-8 rounded-full border border-indigo-500 object-cover"
                          />
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                          <span>Seu Progresso Semanal</span>
                          <span>{userXpGained} / {challenge.goalXp} XP ({progressPct}%)</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Rewards & Claim */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-[11px] text-slate-300">
                          <span className="text-slate-400">Prêmio:</span>
                          <span className="flex items-center gap-0.5 text-amber-300 font-black">
                            <Sparkles className="w-3 h-3 text-amber-400" /> +{challenge.xpReward} XP
                          </span>
                          <span className="flex items-center gap-0.5 text-cyan-300 font-black">
                            <Gem className="w-3 h-3 text-cyan-400" /> +{challenge.gemsReward}
                          </span>
                        </div>

                        {isWon && !challenge.isClaimed && onClaimWeeklyChallenge && (
                          <button
                            onClick={() => {
                              onClaimWeeklyChallenge(challenge.id);
                              audio.playSuccess();
                            }}
                            className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md shadow-emerald-500/30 cursor-pointer animate-pulse"
                          >
                            Resgatar Recompensa
                          </button>
                        )}
                        {challenge.isClaimed && (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Resgatado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Search & Add Real Friend */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              Adicionar Amigos (Usuários Reais)
            </h4>
            <p className="text-xs text-slate-400">
              Digite o nome de usuário ou código de sincronização de outro estudante de Libras para acompanhá-lo no ranking.
            </p>

            <form onSubmit={handleSearchUsers} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquisar por nome do aluno..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs transition-colors cursor-pointer"
              >
                {isSearching ? 'Buscando...' : 'Buscar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  fetchUsers('');
                }}
                disabled={isSearching}
                className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer whitespace-nowrap"
                title="Mostrar todos os estudantes cadastrados"
              >
                Ver Todos
              </button>
            </form>

            {searchFeedback && (
              <p className="text-xs text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                {searchFeedback}
              </p>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                  <span>Estudantes Encontrados ({searchResults.length}):</span>
                </div>
                {searchResults.map((usr) => {
                  const isFriend = friends.some(
                    (f) => f.username.toLowerCase() === usr.username.toLowerCase()
                  );
                  const isPending = pendingSentUsernames.includes(usr.username);

                  return (
                    <div
                      key={usr.username}
                      className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={usr.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={usr.username}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white">{usr.username}</span>
                            {usr.syncCode && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                                {usr.syncCode}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {usr.xp || 0} XP • Nível {usr.level || 1} • {usr.activeTitle || 'Aluno'}
                          </span>
                        </div>
                      </div>

                      {isFriend ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-emerald-500/30 text-emerald-400 font-black text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Amigo</span>
                        </span>
                      ) : isPending ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-black text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Enviado</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddFriendClick(usr)}
                          disabled={isSearching}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Friends Leaderboard List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Ranking de Amigos ({friendsLeaderboard.length})
              </h4>
              <span className="text-xs text-slate-400">Classificação por XP Real</span>
            </div>

            {friends.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Você ainda não adicionou nenhum amigo.</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Use o campo de busca acima para encontrar outros estudantes da comunidade de Libras, acompanhar as pontuações e disputar desafios semanais!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {friendsLeaderboard.map((friend) => (
                  <div
                    key={friend.username}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      friend.isCurrent
                        ? 'bg-emerald-950/70 border-emerald-400 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          friend.rank === 1
                            ? 'bg-yellow-400 text-slate-950'
                            : friend.rank === 2
                            ? 'bg-slate-300 text-slate-950'
                            : friend.rank === 3
                            ? 'bg-amber-600 text-white'
                            : friend.isCurrent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {friend.rank}
                      </div>

                      <img
                        src={friend.avatarUrl}
                        alt={friend.username}
                        className="w-10 h-10 rounded-full object-cover border border-slate-700"
                      />

                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black ${friend.isCurrent ? 'text-emerald-300' : 'text-white'}`}>
                            {friend.username}
                          </span>
                          {friend.isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                              Você
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          Nível {friend.level} • {friend.activeTitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-sm font-black ${friend.isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                          {friend.xp} XP
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-amber-400 font-bold">
                          <Flame className="w-3 h-3 fill-amber-400" />
                          <span>{friend.streak}d</span>
                        </div>
                      </div>

                      {!friend.isCurrent && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setChallengeTargetFriend({
                                username: friend.username,
                                avatarUrl: friend.avatarUrl,
                                xp: friend.xp,
                                level: friend.level,
                                streak: friend.streak,
                                addedAt: new Date().toISOString(),
                              });
                              setIsCreatingChallenge(true);
                            }}
                            className="p-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 transition-colors cursor-pointer"
                            title="Desafiar para Duelo Semanal"
                          >
                            <Swords className="w-4 h-4" />
                          </button>

                          {onRemoveFriend && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remover ${friend.username} dos seus amigos?`)) {
                                  onRemoveFriend(friend.username);
                                  audio.playClick();
                                }
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                              title="Remover amigo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Weekly Challenge */}
      {isCreatingChallenge && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Swords className="w-5 h-5 text-indigo-400" />
                Criar Desafio Semanal por XP
              </h3>
              <button
                onClick={() => setIsCreatingChallenge(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartChallengeSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Escolha o Amigo para o Duelo:
                </label>
                <select
                  required
                  value={challengeTargetFriend ? challengeTargetFriend.username : ''}
                  onChange={(e) => {
                    const found = friends.find((f) => f.username === e.target.value);
                    if (found) setChallengeTargetFriend(found);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                >
                  <option value="">Selecione um amigo...</option>
                  {friends.map((f) => (
                    <option key={f.username} value={f.username}>
                      {f.username} ({f.xp} XP)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Meta de XP Semanal:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[150, 300, 500].map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setChallengeGoalXp(goal)}
                      className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        challengeGoalXp === goal
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {goal} XP
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs space-y-1">
                <span className="font-bold text-indigo-300 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" /> Recompensa de Vitória:
                </span>
                <p className="text-slate-300 text-[11px]">
                  Ao atingir a meta semanal primeiro, você ganha <strong>{challengeGoalXp >= 500 ? 150 : 80} Diamantes</strong> e <strong>+{challengeGoalXp} XP de bônus</strong>!
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingChallenge(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!challengeTargetFriend}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
                >
                  Iniciar Duelo Semanal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
