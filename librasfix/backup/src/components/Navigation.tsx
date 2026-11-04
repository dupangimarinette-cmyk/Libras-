import React from 'react';
import { Map, Camera, Trophy, BookOpen, User, LogIn, Target, ShoppingBag, Info, Shield, Gift, MessageSquare } from 'lucide-react';
import { audio } from '../services/audioService';

export type TabType = 'path' | 'ar_lab' | 'leaderboard' | 'glossary' | 'profile' | 'login' | 'missions' | 'shop' | 'about' | 'admin' | 'redeem' | 'feedback';

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
  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    isSpecial?: boolean;
    badge?: number;
  }> = [
    { id: 'path', label: 'Trilha', icon: Map, color: 'text-emerald-400' },
    { id: 'ar_lab', label: 'Prática', icon: Camera, color: 'text-cyan-400', isSpecial: true },
    { id: 'leaderboard', label: 'Ranking', icon: Trophy, color: 'text-amber-400' },
    { id: 'glossary', label: 'LibrasDex', icon: BookOpen, color: 'text-indigo-400' },
    { id: 'login', label: 'Login', icon: LogIn, color: 'text-violet-400' },
    { id: 'redeem', label: 'Resgate', icon: Gift, color: 'text-fuchsia-400' },
    { id: 'profile', label: 'Perfil', icon: User, color: 'text-emerald-400' },
    { id: 'feedback', label: 'Feedbacks', icon: MessageSquare, color: 'text-teal-400' },
    { id: 'admin' as TabType, label: 'Admin', icon: Shield, color: 'text-indigo-400' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-md border-t border-white/10 px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-2xl mx-auto flex items-center justify-around overflow-x-auto no-scrollbar gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                audio.playClick();
                onTabChange(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-1.5 sm:px-2.5 rounded-xl transition-all cursor-pointer min-w-[42px] sm:min-w-[50px] flex-shrink-0 sm:flex-shrink ${
                isActive
                  ? 'text-emerald-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              } ${tab.isSpecial ? 'group' : ''}`}
            >
              {tab.isSpecial && (
                <div
                  className={`absolute -top-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 scale-110 shadow-cyan-500/30'
                      : 'bg-slate-800 border border-cyan-500/40 text-cyan-400 group-hover:scale-105'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
              )}

              {!tab.isSpecial && (
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
    </nav>
  );
};
