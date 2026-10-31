import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Lightbulb,
  Check,
  Eye,
  Zap,
  ChevronRight,
  Hand
} from 'lucide-react';
import { LibrasSign } from '../../types/libras';
import { LibrasSignIllustration } from '../common/LibrasSignIllustration';
import { audio } from '../../services/audioService';

interface SignReferenceHelpOverlayProps {
  sign: LibrasSign;
  currentAccuracy: number;
  onDismiss: () => void;
  onInstantValidate?: () => void;
  isGhostOverlayActive: boolean;
  onToggleGhostOverlay: () => void;
}

export const SignReferenceHelpOverlay: React.FC<SignReferenceHelpOverlayProps> = ({
  sign,
  currentAccuracy,
  onDismiss,
  onInstantValidate,
  isGhostOverlayActive,
  onToggleGhostOverlay,
}) => {
  const [tab, setTab] = useState<'visual' | 'fingers'>('visual');

  return (
    <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-2xl text-white flex flex-col justify-between max-h-[95%] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400 block leading-tight">
                Ajuda Visual • Dificuldade Detectada
              </span>
              <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                Referência do Sinal: {sign.name}
              </h3>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playClick();
              onDismiss();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Fechar ajuda"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Static Reference Image Showcase */}
        <div className="my-3 flex flex-col items-center">
          <div className="relative w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-3 flex flex-col sm:flex-row items-center justify-center gap-4 shadow-inner">
            
            {/* High-contrast static vector illustration */}
            <div className="relative p-2 rounded-2xl bg-slate-900 border border-amber-500/30 flex items-center justify-center shadow-lg flex-shrink-0">
              <LibrasSignIllustration signId={sign.id} size={130} highlightColor="#f59e0b" />
              <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-amber-300 font-bold">
                POSE CORRETA
              </span>
            </div>

            {/* Quick breakdown list */}
            <div className="flex-1 text-left space-y-1.5 w-full">
              <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <span>✋ Configuração Correta:</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-snug">
                {sign.poseRule.descriptionHint}
              </p>

              {/* Finger checklist */}
              <div className="pt-1 grid grid-cols-2 gap-1 text-[10px]">
                <div className={`px-2 py-0.5 rounded ${sign.poseRule.thumbExtended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  Polegar: {sign.poseRule.thumbExtended ? 'Aberto' : 'Recolhido'}
                </div>
                <div className={`px-2 py-0.5 rounded ${sign.poseRule.indexExtended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  Indicador: {sign.poseRule.indexExtended ? 'Esticado' : 'Dobrado'}
                </div>
                <div className={`px-2 py-0.5 rounded ${sign.poseRule.middleExtended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  Médio: {sign.poseRule.middleExtended ? 'Esticado' : 'Dobrado'}
                </div>
                <div className={`px-2 py-0.5 rounded ${sign.poseRule.pinkyExtended ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  Mínimo: {sign.poseRule.pinkyExtended ? 'Erguido' : 'Dobrado'}
                </div>
              </div>
            </div>
          </div>

          {/* Golden tip */}
          {sign.tips && sign.tips.length > 0 && (
            <div className="w-full mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 text-left flex items-start gap-2">
              <span className="text-base flex-shrink-0">💡</span>
              <p>
                <strong>Dica do Tutor:</strong> {sign.tips[0]}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="flex gap-2">
            {/* Toggle direct ghost overlay */}
            <button
              onClick={() => {
                audio.playClick();
                onToggleGhostOverlay();
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                isGhostOverlayActive
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isGhostOverlayActive ? 'Molde Forte Ativo' : 'Fixar Molde na Câmera'}</span>
            </button>

            {/* Instant Validate if user understands */}
            {onInstantValidate && (
              <button
                onClick={() => {
                  audio.playClick();
                  onInstantValidate();
                }}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                title="Aprovar sinal se estiver correto"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Validar</span>
              </button>
            )}
          </div>

          <button
            onClick={() => {
              audio.playClick();
              onDismiss();
            }}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Entendi a pose, vou tentar agora!</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
