import React, { useState } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Heart,
  Shield,
  Zap,
  Palette,
  Check,
  Gift,
  Crown,
  Eye,
  Smile,
  Award,
  Flame,
  HelpCircle,
  Clock,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Layers,
  Lock,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserStats, MysteryChest, MascotItem, CompanionMascot, NameColorItem, SpecialTrackItem, PrestigeTitleItem } from '../../types/libras';
import { audio } from '../../services/audioService';
import { LibrinhaMascot, MascotEquipped } from '../Mascot/LibrinhaMascot';
import {
  MASCOT_ITEMS,
  MYSTERY_CHESTS,
  COMPANION_MASCOTS,
  PRESTIGE_TITLES,
  NAME_COLORS,
  SPECIAL_TRACKS,
  PREMIUM_POWERUPS,
} from '../../data/shopCatalogData';
import { ChestOpeningModal, ChestRewardResult } from './ChestOpeningModal';
import { PurchaseConfirmModal, PendingPurchaseItem } from './PurchaseConfirmModal';
import { shopService } from '../../services/shopService';
import { APP_THEMES, getThemeConfig } from '../../data/themesData';

interface ShopViewProps {
  userStats: UserStats;
  chests?: MysteryChest[];
  onServerPurchaseSuccess: (updatedStats: UserStats, message: string) => void;
  onSelectTheme: (theme: UserStats['activeTheme']) => void;
  onEquipMascotItem: (category: 'outfit' | 'hat' | 'glasses' | 'skin', itemId: string) => void;
  onEquipCompanion?: (companionId: string) => void;
  onEquipNameColor?: (nameColorId: string) => void;
  onEquipTitle: (title: string) => void;
  onOpenMysteryChest: (chest: MysteryChest) => ChestRewardResult | null;
}

type ShopTab = 'mascots' | 'accessories' | 'titles' | 'name_colors' | 'chests' | 'powerups' | 'special_tracks';

export const ShopView: React.FC<ShopViewProps> = ({
  userStats,
  chests,
  onServerPurchaseSuccess,
  onSelectTheme,
  onEquipMascotItem,
  onEquipCompanion,
  onEquipNameColor,
  onEquipTitle,
  onOpenMysteryChest,
}) => {
  const [activeTab, setActiveTab] = useState<ShopTab>('mascots');
  const [mascotFilter, setMascotFilter] = useState<'all' | 'outfit' | 'hat' | 'glasses' | 'skin'>('all');
  
  // Pending purchase modal
  const [pendingItem, setPendingItem] = useState<PendingPurchaseItem | null>(null);
  const [isProcessingPurchase, setIsProcessingPurchase] = useState(false);
  const [purchaseFeedback, setPurchaseFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // How to earn diamonds info modal
  const [showEarnInfoModal, setShowEarnInfoModal] = useState(false);

  // Daily bonus claim state
  const [isClaimingDaily, setIsClaimingDaily] = useState(false);

  // Active opening chest modal
  const [openingChest, setOpeningChest] = useState<{
    chest: MysteryChest;
    reward: ChestRewardResult;
  } | null>(null);

  const availableChests = chests && chests.length > 0 ? chests : MYSTERY_CHESTS;

  // Equipped state
  const equipped = userStats.equippedMascot || {
    outfit: 'none',
    hat: 'none',
    glasses: 'none',
    skin: 'skin_esmeralda',
  };

  const today = new Date().toISOString().split('T')[0];
  const isDailyClaimedToday = userStats.lastDailyRewardDate === today;

  // Toast helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setPurchaseFeedback({ text, type });
    if (type === 'success') audio.playSuccess();
    else audio.playError();
    setTimeout(() => setPurchaseFeedback(null), 5000);
  };

  // Trigger Purchase Confirmation
  const requestPurchase = (item: PendingPurchaseItem) => {
    audio.playClick();
    setPendingItem(item);
  };

  // Execute Server Purchase
  const handleConfirmPurchase = async () => {
    if (!pendingItem) return;

    setIsProcessingPurchase(true);
    const res = await shopService.purchaseItem({
      username: userStats.username,
      syncCode: userStats.syncCode,
      itemId: pendingItem.id,
      category: pendingItem.category,
      costDiamonds: pendingItem.costDiamonds,
      itemName: pendingItem.name,
    });
    setIsProcessingPurchase(false);

    if (res.success && res.updatedUserStats) {
      setPendingItem(null);
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#fbbf24', '#10b981', '#ec4899'],
      });
      showToast('✅ ' + res.message);
      onServerPurchaseSuccess(res.updatedUserStats, res.message);
    } else {
      showToast('❌ ' + (res.message || 'Falha ao processar compra no servidor.'), 'error');
    }
  };

  // Claim Daily Diamond Bonus from Server
  const handleClaimDailyBonus = async () => {
    audio.playClick();
    setIsClaimingDaily(true);
    const res = await shopService.claimDailyBonus(userStats.username, userStats.syncCode);
    setIsClaimingDaily(false);

    if (res.success && res.updatedUserStats) {
      confetti({
        particleCount: 65,
        spread: 75,
        origin: { y: 0.5 },
      });
      showToast('🎁 ' + res.message);
      onServerPurchaseSuccess(res.updatedUserStats, res.message);
    } else {
      showToast('ℹ️ ' + (res.message || 'Bônus diário indisponível no momento.'), 'error');
    }
  };

  // Chest opener with server deduction
  const handleTriggerChest = async (chest: MysteryChest) => {
    audio.playClick();
    if (userStats.gems < chest.cost) {
      showToast(`Você precisa de ${chest.cost} Diamantes para abrir o ${chest.name}.`, 'error');
      return;
    }

    setIsProcessingPurchase(true);
    const res = await shopService.purchaseItem({
      username: userStats.username,
      syncCode: userStats.syncCode,
      itemId: chest.id,
      category: 'chest',
      costDiamonds: chest.cost,
      itemName: chest.name,
    });
    setIsProcessingPurchase(false);

    if (res.success && res.updatedUserStats) {
      const reward = onOpenMysteryChest(chest);
      if (reward) {
        setOpeningChest({ chest, reward });
      }
      onServerPurchaseSuccess(res.updatedUserStats, res.message);
    } else {
      showToast('❌ ' + (res.message || 'Erro ao abrir baú no servidor.'), 'error');
    }
  };

  const filteredMascotItems = mascotFilter === 'all'
    ? MASCOT_ITEMS
    : MASCOT_ITEMS.filter((item) => item.category === mascotFilter);

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 py-5 pb-28 select-none space-y-6">
      
      {/* Toast Feedback */}
      {purchaseFeedback && (
        <div
          className={`fixed top-20 right-4 z-50 p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-bold border ${
            purchaseFeedback.type === 'success'
              ? 'bg-slate-900 border-emerald-500 text-emerald-300'
              : 'bg-slate-900 border-rose-500 text-rose-300'
          }`}
        >
          <span>{purchaseFeedback.text}</span>
        </div>
      )}

      {/* Hero Loja Premium Header with Diamond Balance */}
      <div className="relative overflow-hidden p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 border-2 border-indigo-500/40 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Loja Premium Oficial • 100% Gratuita
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Sem Pagamentos Reais • Somente Dedicação
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <span>Loja Premium LibrasGo</span>
              <Crown className="w-7 h-7 text-amber-400" />
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Personalize seus mascotes, conquiste títulos lendários, ilumine seu nome no ranking e desbloqueie trilhas avançadas usando apenas os Diamantes conquistados em seus estudos.
            </p>
          </div>

          {/* Diamond Balance & Daily Reward Claim Card */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Diamond Balance Widget */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/40 shadow-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/30 flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white stroke-[2.2]" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block leading-tight">
                  Seus Diamantes
                </span>
                <span className="text-2xl font-black text-cyan-300 font-mono leading-tight">
                  {userStats.gems} 💎
                </span>
              </div>
            </div>

            {/* Daily Diamond Bonus Button */}
            <button
              disabled={isDailyClaimedToday || isClaimingDaily}
              onClick={handleClaimDailyBonus}
              className={`p-3.5 sm:p-4 rounded-2xl font-black text-xs transition-all cursor-pointer flex flex-col justify-center items-start shadow-xl border ${
                isDailyClaimedToday
                  ? 'bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 border-yellow-300 hover:scale-103 active:scale-97 shadow-amber-500/30 animate-pulse'
              }`}
              title={isDailyClaimedToday ? 'Bônus diário já resgatado hoje' : 'Clique para resgatar Diamantes grátis!'}
            >
              <div className="flex items-center gap-1.5 font-black uppercase text-[10px]">
                <Gift className="w-3.5 h-3.5" />
                <span>Bônus Diário</span>
              </div>
              <span className="text-xs font-bold mt-0.5">
                {isDailyClaimedToday ? 'Resgatado Hoje ✓' : '+35 a +65 Diamantes!'}
              </span>
            </button>

            {/* How to Earn Modal Trigger */}
            <button
              onClick={() => {
                audio.playClick();
                setShowEarnInfoModal(true);
              }}
              className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Saiba como ganhar mais diamantes"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              <span className="sm:hidden">Como Ganhar</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 border-t border-slate-800/80 mt-5 overflow-x-auto no-scrollbar">
          
          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('mascots');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'mascots'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>🤖 Mascotes Companheiros</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('accessories');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'accessories'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>👗 Roupas & Acessórios</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('titles');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'titles'
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>👑 Títulos de Prestígio</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('name_colors');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'name_colors'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>✨ Cores para o Nome</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('chests');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'chests'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>🎁 Baús Misteriosos</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('powerups');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'powerups'
                ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>⚡ Vantagens & Vidas</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setActiveTab('special_tracks');
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'special_tracks'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
            }`}
          >
            <span>🚀 Trilhas Avançadas</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: MASCOTES COMPANHEIROS
         ========================================================================= */}
      {activeTab === 'mascots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Escolha seu Mascote Companheiro</h3>
              <p className="text-xs text-slate-400">
                Seu companheiro reage aos acertos, orienta na trilha e comemora cada conquista de Libras.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COMPANION_MASCOTS.map((companion) => {
              const isUnlocked = companion.cost === 0 || (userStats.unlockedMascotIds || ['librinha']).includes(companion.id);
              const isActive = (userStats.activeMascotId || 'librinha') === companion.id;

              return (
                <div
                  key={companion.id}
                  className={`p-5 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between gap-4 ${
                    isActive
                      ? 'border-emerald-400 ring-2 ring-emerald-500/30 shadow-xl'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {companion.rarity}
                      </span>
                      {isUnlocked ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Adquirido
                        </span>
                      ) : (
                        <span className="text-sm font-black text-cyan-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" /> {companion.cost} 💎
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-3xl shadow-inner flex-shrink-0">
                        {companion.icon}
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white leading-tight">{companion.name}</h4>
                        <span className="text-xs font-bold text-indigo-300">{companion.title}</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-2">
                      {companion.description}
                    </p>
                    <span className="text-[11px] text-slate-400 italic block">
                      "{companion.personality}"
                    </span>
                  </div>

                  <div>
                    {isActive ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5"
                      >
                        <Check className="w-4 h-4" /> Mascote Ativo
                      </button>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => {
                          audio.playClick();
                          if (onEquipCompanion) onEquipCompanion(companion.id);
                        }}
                        className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all cursor-pointer"
                      >
                        Equipar como Companheiro
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          requestPurchase({
                            id: companion.id,
                            name: companion.name,
                            category: 'companion',
                            costDiamonds: companion.cost,
                            description: companion.description,
                            rarity: companion.rarity,
                            icon: companion.icon,
                          })
                        }
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Desbloquear por {companion.cost} 💎</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: ROUPAS & ACESSÓRIOS
         ========================================================================= */}
      {activeTab === 'accessories' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">Guarda-Roupa da Mascote Librinha</h3>
              <p className="text-xs text-slate-400">
                Personalize roupas, chapéus, óculos e skins holográficas.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(['all', 'outfit', 'hat', 'glasses', 'skin'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    audio.playClick();
                    setMascotFilter(cat);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    mascotFilter === cat
                      ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat === 'all'
                    ? 'Todos'
                    : cat === 'outfit'
                    ? 'Roupas'
                    : cat === 'hat'
                    ? 'Chapéus'
                    : cat === 'glasses'
                    ? 'Óculos / Visores'
                    : 'Skins'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {filteredMascotItems.map((item) => {
              const isOwned = item.cost === 0 || (userStats.unlockedMascotItems || ['skin_esmeralda']).includes(item.id);
              const isEquipped =
                (item.category === 'outfit' && equipped.outfit === item.id) ||
                (item.category === 'hat' && equipped.hat === item.id) ||
                (item.category === 'glasses' && equipped.glasses === item.id) ||
                (item.category === 'skin' && equipped.skin === item.id);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between gap-3 ${
                    isEquipped
                      ? 'border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                        {item.rarity}
                      </span>
                      {isOwned ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> No Inventário
                        </span>
                      ) : (
                        <span className="text-xs font-black text-cyan-300">
                          {item.cost} 💎
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      <h4 className="text-xs font-black text-white leading-snug">{item.name}</h4>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                      {item.description}
                    </p>
                  </div>

                  <div>
                    {isEquipped ? (
                      <button
                        onClick={() => onEquipMascotItem(item.category, item.category === 'skin' ? 'skin_esmeralda' : 'none')}
                        className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40 transition-all cursor-pointer"
                      >
                        Equipado (Desequipar)
                      </button>
                    ) : isOwned ? (
                      <button
                        onClick={() => onEquipMascotItem(item.category, item.id)}
                        className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                      >
                        Equipar
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          requestPurchase({
                            id: item.id,
                            name: item.name,
                            category: 'accessory',
                            costDiamonds: item.cost,
                            description: item.description,
                            rarity: item.rarity,
                            icon: item.icon,
                          })
                        }
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                      >
                        Comprar por {item.cost} 💎
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TÍTULOS DE PRESTÍGIO
         ========================================================================= */}
      {activeTab === 'titles' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">Títulos Honorários de Prestígio</h3>
            <p className="text-xs text-slate-400">
              Ostente seu título no perfil, nas celebrações de lição e no topo do ranking da comunidade.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESTIGE_TITLES.map((titleItem) => {
              const isOwned = (userStats.unlockedTitles || ['Aprendiz Curioso']).includes(titleItem.title);
              const isEquipped = (userStats.activeTitle || 'Aprendiz Curioso') === titleItem.title;

              return (
                <div
                  key={titleItem.id}
                  className={`p-4 sm:p-5 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between gap-4 ${
                    isEquipped
                      ? 'border-purple-400 ring-2 ring-purple-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                        {titleItem.rarity}
                      </span>
                      {isOwned ? (
                        <span className="text-[11px] font-bold text-emerald-400">Adquirido ✓</span>
                      ) : (
                        <span className="text-xs font-black text-cyan-300">{titleItem.cost} 💎</span>
                      )}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 my-2 text-center">
                      <span className={`text-sm font-black px-3 py-1 rounded-xl border inline-block ${titleItem.badgeColor}`}>
                        👑 {titleItem.title}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-snug">
                      {titleItem.description}
                    </p>
                  </div>

                  <div>
                    {isEquipped ? (
                      <span className="w-full py-2.5 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" /> Título Ativo
                      </span>
                    ) : isOwned ? (
                      <button
                        onClick={() => {
                          audio.playClick();
                          onEquipTitle(titleItem.title);
                        }}
                        className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all cursor-pointer"
                      >
                        Equipar Título
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          requestPurchase({
                            id: titleItem.id,
                            name: titleItem.title,
                            category: 'title',
                            costDiamonds: titleItem.cost,
                            description: titleItem.description,
                            rarity: titleItem.rarity,
                            icon: '👑',
                          })
                        }
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/25"
                      >
                        Desbloquear por {titleItem.cost} 💎
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: CORES PARA O NOME (NICK GLOW)
         ========================================================================= */}
      {activeTab === 'name_colors' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">Efeitos de Cor e Brilho para o Nome</h3>
            <p className="text-xs text-slate-400">
              Transforme a aparência do seu nome em todo o app: no cabeçalho, no seu perfil e no ranking geral!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NAME_COLORS.map((nc) => {
              const isOwned = (userStats.unlockedNameColors || []).includes(nc.id);
              const isEquipped = userStats.nameColor === nc.id;

              return (
                <div
                  key={nc.id}
                  className={`p-5 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between gap-4 ${
                    isEquipped
                      ? 'border-amber-400 ring-2 ring-amber-500/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 border border-slate-800">
                        {nc.rarity}
                      </span>
                      {isOwned ? (
                        <span className="text-[11px] font-bold text-emerald-400">Desbloqueado ✓</span>
                      ) : (
                        <span className="text-xs font-black text-cyan-300">{nc.cost} 💎</span>
                      )}
                    </div>

                    {/* Live Preview Box */}
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 my-2 text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-black block mb-1">
                        Prévia ao Vivo:
                      </span>
                      <span className={`text-base ${nc.styleClass}`}>
                        {userStats.username}
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-white mt-1">{nc.name}</h4>
                    <p className="text-xs text-slate-300 leading-snug">{nc.description}</p>
                  </div>

                  <div>
                    {isEquipped ? (
                      <button
                        onClick={() => {
                          audio.playClick();
                          if (onEquipNameColor) onEquipNameColor('');
                        }}
                        className="w-full py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
                      >
                        <Check className="w-4 h-4" /> Cor Ativa (Remover)
                      </button>
                    ) : isOwned ? (
                      <button
                        onClick={() => {
                          audio.playClick();
                          if (onEquipNameColor) onEquipNameColor(nc.id);
                        }}
                        className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black transition-all cursor-pointer"
                      >
                        Ativar no Perfil
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          requestPurchase({
                            id: nc.id,
                            name: nc.name,
                            category: 'name_color',
                            costDiamonds: nc.cost,
                            description: nc.description,
                            rarity: nc.rarity,
                            icon: '✨',
                          })
                        }
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-amber-500/25"
                      >
                        Desbloquear por {nc.cost} 💎
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: BAÚS MISTERIOSOS
         ========================================================================= */}
      {activeTab === 'chests' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">Baús Misteriosos de Recompensas</h3>
            <p className="text-xs text-slate-400">
              Abra baús para ganhar grandes montes de XP, bônus surpresa de Diamantes e títulos lendários exclusivos!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableChests.map((chest) => {
              const canAfford = userStats.gems >= chest.cost;

              return (
                <div
                  key={chest.id}
                  className={`p-5 rounded-3xl bg-slate-900 border ${chest.border} shadow-2xl flex flex-col justify-between gap-4`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-white/20 bg-white/5 ${chest.textColor}`}>
                        {chest.rarity}
                      </span>
                      <span className="text-sm font-black text-cyan-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> {chest.cost} 💎
                      </span>
                    </div>

                    <div className="flex items-center gap-4 my-2">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${chest.gradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                        <Gift className="w-8 h-8 text-white stroke-[2.2]" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">{chest.name}</h4>
                        <p className="text-xs text-slate-300 mt-0.5 leading-snug">{chest.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>XP Garantido:</span>
                        <strong className="text-amber-400 font-bold">{chest.minXp} - {chest.maxXp} XP</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Bônus em Diamantes:</span>
                        <strong className="text-cyan-400 font-bold">{chest.minCoins} - {chest.maxCoins} 💎</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Título Exclusivo:</span>
                        <strong className="text-purple-300 font-bold truncate max-w-[150px]">
                          {chest.exclusiveTitles[0]}...
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!canAfford || isProcessingPurchase}
                    onClick={() => handleTriggerChest(chest)}
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/30'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Gift className="w-4 h-4 fill-slate-950" />
                    <span>Abrir Baú por {chest.cost} 💎</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: VANTAGENS & VIDAS
         ========================================================================= */}
      {activeTab === 'powerups' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-black text-white">Vantagens & Consumíveis</h3>
            <p className="text-xs text-slate-400">
              Recupere vidas, ative escudos contra erros e multiplique seus pontos de experiência.
            </p>
          </div>

          <div className="space-y-3">
            {PREMIUM_POWERUPS.map((pu) => {
              const isFreezeActive = pu.id === 'streak_freeze' && userStats.hasStreakFreeze;
              const isHeartsFull = pu.id === 'hearts_refill' && userStats.hearts >= userStats.maxHearts;
              const isShieldActive = pu.id === 'heart_shield' && userStats.hasHeartShield;
              const isBoostActive = pu.id === 'xp_boost' && userStats.xpBoostUntil && new Date(userStats.xpBoostUntil) > new Date();

              return (
                <div
                  key={pu.id}
                  className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 shadow-md"
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${pu.gradient} border border-white/10 flex items-center justify-center text-xl flex-shrink-0`}>
                      {pu.category === 'hearts' ? '❤️' : pu.category === 'shield' ? '🛡️' : pu.category === 'boost' ? '⚡' : '🔥'}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">{pu.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">{pu.description}</p>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {isFreezeActive || isShieldActive || isBoostActive ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 text-xs font-bold flex items-center gap-1 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" /> Ativo
                      </span>
                    ) : isHeartsFull ? (
                      <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold">
                        Vidas Cheias
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          requestPurchase({
                            id: pu.id,
                            name: pu.title,
                            category: pu.id as any,
                            costDiamonds: pu.cost,
                            description: pu.description,
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shadow-cyan-500/20"
                      >
                        Comprar por {pu.cost} 💎
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AR Camera Themes */}
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-sm font-black text-white mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              <span>Temas Holográficos de Câmera AR</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APP_THEMES.map((theme) => {
                const isSelected = getThemeConfig(userStats.activeTheme).id === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      audio.playClick();
                      onSelectTheme(theme.id);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-emerald-400 ring-2 ring-emerald-500/20 shadow-lg'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className={`w-7 h-7 rounded-xl ${theme.previewBg} border border-white/20 flex items-center justify-center`}>
                        <div
                          className="w-3.5 h-3.5 rounded-full shadow"
                          style={{ backgroundColor: theme.colorHex }}
                        />
                      </div>
                      {isSelected && (
                        <span className="text-[10px] uppercase font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          Equipado
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-white block">{theme.name}</span>
                    <span className="text-[11px] text-slate-400">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 7: TRILHAS AVANÇADAS ESPECIAIS
         ========================================================================= */}
      {activeTab === 'special_tracks' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-white">Trilhas Avançadas Especiais</h3>
            <p className="text-xs text-slate-400">
              Desbloqueie módulos imersivos temáticos com vocabulário prático e de alto impacto social. Todas as atividades dentro da trilha são gratuitas para sempre após o desbloqueio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPECIAL_TRACKS.map((track) => {
              const isUnlocked = (userStats.unlockedSpecialTracks || []).includes(track.id);

              return (
                <div
                  key={track.id}
                  className={`p-5 rounded-3xl bg-slate-900 border transition-all flex flex-col justify-between gap-4 ${
                    isUnlocked
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-950 text-indigo-300 border border-slate-800">
                        Nível {track.level} • {track.lessonsCount} Lições
                      </span>
                      {isUnlocked ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Liberado
                        </span>
                      ) : (
                        <span className="text-xs font-black text-cyan-300">
                          {track.cost} 💎
                        </span>
                      )}
                    </div>

                    <div className={`p-4 rounded-2xl bg-gradient-to-r ${track.themeColor} text-white mb-3 shadow-lg`}>
                      <h4 className="text-base font-black leading-snug">{track.title}</h4>
                      <p className="text-xs text-white/90 mt-1">{track.subtitle}</p>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {track.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span>Total em recompensas:</span>
                      <strong className="text-amber-400">+{track.xpTotal} XP</strong>
                    </div>
                  </div>

                  <div>
                    {isUnlocked ? (
                      <span className="w-full py-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" /> Trilha Liberada na Trilha Principal
                      </span>
                    ) : (
                      <button
                        onClick={() =>
                          requestPurchase({
                            id: track.id,
                            name: track.title,
                            category: 'special_track',
                            costDiamonds: track.cost,
                            description: track.description,
                            rarity: 'epico',
                            icon: '🚀',
                          })
                        }
                        className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Desbloquear Trilha por {track.cost} 💎</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Purchase Modal */}
      {pendingItem && (
        <PurchaseConfirmModal
          item={pendingItem}
          currentDiamonds={userStats.gems}
          isProcessing={isProcessingPurchase}
          onConfirm={handleConfirmPurchase}
          onCancel={() => setPendingItem(null)}
        />
      )}

      {/* Opening Chest Modal */}
      {openingChest && (
        <ChestOpeningModal
          chest={openingChest.chest}
          reward={openingChest.reward}
          onClose={() => setOpeningChest(null)}
          onEquipTitle={(title) => {
            onEquipTitle(title);
            setOpeningChest(null);
          }}
        />
      )}

      {/* How to Earn Diamonds Modal */}
      {showEarnInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-black text-white">Como Ganhar Diamantes 💎</h3>
              </div>
              <button
                onClick={() => setShowEarnInfoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              No LibrasGo, <strong>diamantes nunca são comprados com dinheiro real</strong>. Eles são a prova do seu progresso, dedicação e inclusão:
            </p>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <span className="text-xl">🎯</span>
                <div>
                  <strong className="text-white block">Concluir Lições na Trilha</strong>
                  <span className="text-slate-400">Cada lição finalizada concede +10 a +25 Diamantes.</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <span className="text-xl">🎭</span>
                <div>
                  <strong className="text-white block">Desafios Faciais e Estúdio AR</strong>
                  <span className="text-slate-400">Prática com câmera e expressões concede +15 a +35 Diamantes.</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <span className="text-xl">📅</span>
                <div>
                  <strong className="text-white block">Missões Diárias & Bônus de Sequência</strong>
                  <span className="text-slate-400">Resgate seu bônus diário gratuito todos os dias na Loja.</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                <span className="text-xl">🏆</span>
                <div>
                  <strong className="text-white block">Conquistas & Liga Semanal</strong>
                  <span className="text-slate-400">Suba nas ligas globais para desbloquear grandes baús de gemas.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowEarnInfoModal(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-lg"
            >
              Entendido! Continuar Estudando
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
