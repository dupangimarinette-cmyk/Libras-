import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  X,
  Check,
  RefreshCw,
  Gift,
} from 'lucide-react';
import { audio } from '../../services/audioService';

export interface PendingPurchaseItem {
  id: string;
  name: string;
  category: 'companion' | 'accessory' | 'title' | 'name_color' | 'chest' | 'hearts_refill' | 'heart_shield' | 'xp_boost' | 'streak_freeze' | 'special_track';
  costDiamonds: number;
  description: string;
  rarity?: 'comum' | 'raro' | 'epico' | 'lendario';
  icon?: string;
}

interface PurchaseConfirmModalProps {
  item: PendingPurchaseItem;
  currentDiamonds: number;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const PurchaseConfirmModal: React.FC<PurchaseConfirmModalProps> = ({
  item,
  currentDiamonds,
  isProcessing,
  onConfirm,
  onCancel,
}) => {
  const canAfford = currentDiamonds >= item.costDiamonds;
  const balanceAfter = currentDiamonds - item.costDiamonds;

  const getRarityBadge = (rarity?: string) => {
    switch (rarity) {
      case 'lendario':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'epico':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'raro':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 border-2 border-indigo-500/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Confirmação de Compra Segura</h3>
          </div>
          <button
            disabled={isProcessing}
            onClick={() => {
              audio.playClick();
              onCancel();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          
          {/* Item Preview Box */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/30 border border-indigo-500/40 flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
              {item.icon || '💎'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${getRarityBadge(item.rarity)}`}>
                  {item.rarity || 'Especial'}
                </span>
                <span className="text-xs font-black text-cyan-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {item.costDiamonds} Diamantes
                </span>
              </div>
              <h4 className="text-sm font-black text-white truncate">{item.name}</h4>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-tight">
                {item.description}
              </p>
            </div>
          </div>

          {/* Balance calculation */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300">
              <span>Seu Saldo Atual:</span>
              <span className="font-mono font-bold text-white flex items-center gap-1">
                {currentDiamonds} 💎
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span>Custo do Item:</span>
              <span className="font-mono font-bold text-rose-400">
                - {item.costDiamonds} 💎
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="font-bold text-white">Saldo Restante:</span>
              <span
                className={`font-mono font-black text-sm ${
                  canAfford ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {balanceAfter} 💎
              </span>
            </div>
          </div>

          {!canAfford && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>
                Saldo insuficiente! Pratique lições na Trilha ou conclua Missões Diárias para obter mais diamantes.
              </span>
            </div>
          )}

          {/* Security & Free Guarantee Notice */}
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 text-center">
            🔒 Compra autorizada diretamente pelo servidor. Moeda 100% virtual, sem dinheiro real.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              disabled={isProcessing}
              onClick={() => {
                audio.playClick();
                onCancel();
              }}
              className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              disabled={!canAfford || isProcessing}
              onClick={() => {
                audio.playClick();
                onConfirm();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Validando no Servidor...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Confirmar Compra</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
