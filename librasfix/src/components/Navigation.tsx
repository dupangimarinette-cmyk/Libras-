import React, { useState } from 'react';
import {
  Map,
  Camera,
  Trophy,
  BookOpen,
  User,
  LogIn,
  Shield,
  Gift,
  MessageSquare,
  MoreHorizontal,
  X,
  Target,
  ShoppingBag,
  Info,
} from 'lucide-react';
import { audio } from '../services/audioService';

export type TabType =
  | 'path'
  | 'ar_lab'
  | 'leaderboard'
  | 'glossary'
  | 'profile'
  | 'login'
  | 'missions'
  | 'shop'
  | 'about'
  | 'admin'
  | 'redeem'
  | 'feedback';

interface NavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  pendingMissionsCount?: number;
  userAvatar?: string;
  isAdmin?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingMissionsCount = 1,
  userAvatar,
  isAdmin = false,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // All navigation destinations
  const allTabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    isSpecial?: boolean;
    badge?: number;
    description?: string;
  }> = [
    { id: 'path', label: 'Trilha', icon: Map, color: 'text-emerald-400', description: 'Lições gamificadas e módulos' },
    { id: 'ar_lab', label: 'Prática', icon: Camera, color: 'text-cyan-400', isSpecial: true, description: 'Estúdio de Realidade Aumentada' },
    { id: 'leaderboard', label: 'Ranking', icon: Trophy, color: 'text-amber-400', description: 'Ligas semanais e desafios' },
    { id: 'glossary', label: 'LibrasDex', icon: BookOpen, color: 'text-indigo-400', description: 'Dicionário de sinais e parâmetros' },
    { id: 'profile', label: 'Perfil', icon: User, color: 'text-emerald-400', description: 'Progresso, títulos e temas' },
    { id: 'redeem', label: 'Resgate', icon: Gift, color: 'text-fuchsia-400', description: 'Códigos promocionais e recompensas' },
    { id: 'feedback', label: 'Feedbacks', icon: MessageSquare, color: 'text-teal-400', description: 'Canal direto com a administração' },
    { id: 'login', label: 'Login', icon: LogIn, color: 'text-violet-400', description: 'Acesso e troca de conta' },
    { id: 'admin', label: 'Admin', icon: Shield, color: 'text-indigo-400', description: 'Painel de controle e moderação' },
  ];

  // Core mobile tabs (always visible on small screens)
  const mobileCoreTabIds: TabType[] = ['path', 'ar_lab', 'leaderboard', 'glossary', 'profile'];
  const isSecondaryTabActive = !mobileCoreTabIds.includes(activeTab);

  const activeSecondaryTab = allTabs.find((t) => t.id === activeTab);

  return (
    <>
      {/* Mobile "Mais" Quick Menu Bottom Sheet / Modal */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="w-full sm:max-w-md bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl text-white space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MoreHorizontal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-black text-white">Menu Completo do LibrasGo</h3>
              </div>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {allTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      audio.playClick();
                      onTabChange(tab.id);
                      setShowMoreMenu(false);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                      isActive
                        ? 'bg-indigo-600/25 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-black block truncate">{tab.label}</span>
                      <span className="text-[10px] text-slate-400 block leading-tight">
                        {tab.description || 'Navegar'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-white/10 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] transition-all">
        
        {/* Desktop / Tablet: Full Ribbon of All Tabs (md:flex) */}
        <div className="hidden md:flex max-w-4xl mx-auto items-center justify-around gap-1">
          {allTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  audio.playClick();
                  onTabChange(tab.id);
                }}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all cursor-pointer flex-shrink ${
                  isActive
                    ? 'text-emerald-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                } ${tab.isSpecial ? 'group' : ''}`}
              >
                {tab.isSpecial ? (
                  <div
                    className={`absolute -top-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 scale-110 shadow-cyan-500/30'
                        : 'bg-slate-800 border border-cyan-500/40 text-cyan-400 group-hover:scale-105'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="relative">
                    <Icon className={`w-5 h-5 mb-0.5 ${isActive ? tab.color : 'text-slate-400'}`} />
                    {Boolean(tab.badge && tab.badge > 0) && (
                      <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                )}

                <span
                  className={`text-[11px] font-bold ${
                    tab.isSpecial ? 'mt-4 text-cyan-300' : ''
                  } ${isActive ? 'text-white' : 'text-slate-400'}`}
                >
                  {tab.label}
                </span>

                {isActive && !tab.isSpecial && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Mobile: Clean 5-Icon Navigation Bar (md:hidden) */}
        <div className="flex md:hidden max-w-md mx-auto items-center justify-around gap-1">
          {/* 1. Trilha */}
          <button
            onClick={() => {
              audio.playClick();
              onTabChange('path');
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'path' ? 'text-emerald-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Map className={`w-5 h-5 mb-0.5 ${activeTab === 'path' ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className={`text-[10px] font-bold ${activeTab === 'path' ? 'text-white' : 'text-slate-400'}`}>
              Trilha
            </span>
            {activeTab === 'path' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />}
          </button>

          {/* 2. Prática (Central Special Button) */}
          <button
            onClick={() => {
              audio.playClick();
              onTabChange('ar_lab');
            }}
            className="relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer flex-1 group"
          >
            <div
              className={`absolute -top-3.5 w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                activeTab === 'ar_lab'
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 scale-110 shadow-cyan-500/40'
                  : 'bg-slate-800 border-2 border-cyan-500/40 text-cyan-400 group-hover:scale-105'
              }`}
            >
              <Camera className="w-5 h-5" />
            </div>
            <span className={`text-[10px] font-bold mt-4.5 ${activeTab === 'ar_lab' ? 'text-cyan-300' : 'text-slate-400'}`}>
              Prática
            </span>
          </button>

          {/* 3. Ranking */}
          <button
            onClick={() => {
              audio.playClick();
              onTabChange('leaderboard');
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'leaderboard' ? 'text-amber-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className={`w-5 h-5 mb-0.5 ${activeTab === 'leaderboard' ? 'text-amber-400' : 'text-slate-400'}`} />
            <span className={`text-[10px] font-bold ${activeTab === 'leaderboard' ? 'text-white' : 'text-slate-400'}`}>
              Ranking
            </span>
            {activeTab === 'leaderboard' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />}
          </button>

          {/* 4. LibrasDex */}
          <button
            onClick={() => {
              audio.playClick();
              onTabChange('glossary');
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'glossary' ? 'text-indigo-400 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className={`w-5 h-5 mb-0.5 ${activeTab === 'glossary' ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span className={`text-[10px] font-bold ${activeTab === 'glossary' ? 'text-white' : 'text-slate-400'}`}>
              LibrasDex
            </span>
            {activeTab === 'glossary' && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-0.5" />}
          </button>

          {/* 5. Perfil (ou Aba Secundária Ativa) com botão Mais */}
          <button
            onClick={() => {
              audio.playClick();
              if (activeTab === 'profile') {
                setShowMoreMenu(true);
              } else {
                onTabChange('profile');
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer flex-1 ${
              activeTab === 'profile' || isSecondaryTabActive
                ? 'text-emerald-400 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSecondaryTabActive && activeSecondaryTab ? (
              <>
                <activeSecondaryTab.icon className="w-5 h-5 mb-0.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-white truncate max-w-[50px]">
                  {activeSecondaryTab.label}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5" />
              </>
            ) : (
              <>
                <User className={`w-5 h-5 mb-0.5 ${activeTab === 'profile' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-bold ${activeTab === 'profile' ? 'text-white' : 'text-slate-400'}`}>
                  Perfil
                </span>
                {activeTab === 'profile' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />}
              </>
            )}
          </button>

          {/* 6. Mais (Trigger for all remaining screens) */}
          <button
            onClick={() => {
              audio.playClick();
              setShowMoreMenu(true);
            }}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl transition-all cursor-pointer flex-1 ${
              showMoreMenu ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mais abas e opções"
          >
            <MoreHorizontal className="w-5 h-5 mb-0.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-400">
              Mais
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
