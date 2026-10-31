import React from 'react';
import { FacialTrackingState, EyebrowsState, HeadMovementType } from '../../types/libras';
import { Sparkles, CheckCircle2, AlertCircle, Eye, ArrowUp, ArrowDown, MoveHorizontal } from 'lucide-react';

interface FacialOverlayProps {
  trackingState: FacialTrackingState;
  targetExpression?: {
    eyebrows?: EyebrowsState;
    headMovement?: HeadMovementType;
    label: string;
    tip: string;
  };
  compact?: boolean;
}

export const FacialOverlay: React.FC<FacialOverlayProps> = ({
  trackingState,
  targetExpression,
  compact = false,
}) => {
  const { isFaceDetected, eyebrowsState, headPose, eyebrowRaiseScore, mouthState } = trackingState;

  // Eyebrow Match
  const isEyebrowMatch = !targetExpression?.eyebrows || targetExpression.eyebrows === eyebrowsState;
  // Head Movement Match
  const isHeadMatch = !targetExpression?.headMovement || targetExpression.headMovement === headPose.movement;

  const isOverallMatch = isFaceDetected && isEyebrowMatch && isHeadMatch;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-4 select-none">
      
      {/* Top Indicators Bar */}
      <div className="flex items-center justify-between gap-2 z-10 flex-wrap">
        <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 text-white text-xs font-bold shadow-lg">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isFaceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>{isFaceDetected ? 'Rosto Detectado' : 'Posicione o Rosto'}</span>
        </div>

        {targetExpression && (
          <div className="flex items-center gap-1.5 bg-indigo-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-indigo-500/40 text-white text-xs font-extrabold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-amber-200">Objetivo:</span>
            <span>{targetExpression.label}</span>
          </div>
        )}
      </div>

      {/* Center Holographic Face Wireframe Mold */}
      <div className="relative flex-1 flex items-center justify-center my-auto">
        <div
          className={`relative w-48 h-64 sm:w-56 sm:h-72 rounded-[48%] border-2 transition-all duration-300 ${
            isOverallMatch
              ? 'border-emerald-400/80 shadow-[0_0_30px_rgba(52,211,153,0.35)]'
              : isFaceDetected
              ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
              : 'border-white/30 border-dashed'
          }`}
        >
          {/* Eyebrows Guide Line */}
          <div className="absolute top-[26%] left-[18%] right-[18%] flex justify-between items-center">
            <div
              className={`h-1.5 w-14 rounded-full transition-all duration-300 ${
                eyebrowsState === 'raised'
                  ? '-translate-y-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : eyebrowsState === 'furrowed'
                  ? 'translate-y-1.5 bg-amber-400'
                  : 'bg-white/40'
              }`}
            />
            <div
              className={`h-1.5 w-14 rounded-full transition-all duration-300 ${
                eyebrowsState === 'raised'
                  ? '-translate-y-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                  : eyebrowsState === 'furrowed'
                  ? 'translate-y-1.5 bg-amber-400'
                  : 'bg-white/40'
              }`}
            />
          </div>

          {/* Eye Sight Crosshairs */}
          <div className="absolute top-[38%] left-[22%] w-7 h-7 rounded-full border border-white/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400/80" />
          </div>
          <div className="absolute top-[38%] right-[22%] w-7 h-7 rounded-full border border-white/40 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400/80" />
          </div>

          {/* Central Nose Axis Line */}
          <div className="absolute top-[38%] bottom-[35%] left-1/2 -translate-x-1/2 w-0.5 bg-white/30" />

          {/* Mouth Guide Arc */}
          <div
            className={`absolute bottom-[20%] left-1/2 -translate-x-1/2 w-16 h-6 rounded-b-full border-b-2 transition-all duration-300 ${
              mouthState === 'open'
                ? 'h-9 border-emerald-400 bg-emerald-500/10'
                : 'border-white/40'
            }`}
          />

          {/* Holographic scanning effect */}
          <div className="absolute inset-0 rounded-[48%] overflow-hidden pointer-events-none">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-scanLine" />
          </div>
        </div>
      </div>

      {/* Bottom Live Feedback Badges */}
      <div className="flex flex-col gap-2 z-10 max-w-md mx-auto w-full">
        {/* Real-time Facial Features Readout */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md ${
              eyebrowsState === 'raised'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                : eyebrowsState === 'furrowed'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>
              Sobrancelhas:{' '}
              {eyebrowsState === 'raised'
                ? 'Levantadas ↗'
                : eyebrowsState === 'furrowed'
                ? 'Franzidas ↘'
                : 'Neutras'}
            </span>
          </span>

          <span
            className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md ${
              headPose.movement === 'nod_yes'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                : headPose.movement === 'shake_no'
                ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900/80 text-slate-300 border border-slate-700/60'
            }`}
          >
            {headPose.movement === 'nod_yes' ? (
              <ArrowDown className="w-3.5 h-3.5" />
            ) : headPose.movement === 'shake_no' ? (
              <MoveHorizontal className="w-3.5 h-3.5" />
            ) : (
              <Eye className="w-3.5 h-3.5" />
            )}
            <span>
              Cabeça:{' '}
              {headPose.movement === 'nod_yes'
                ? 'Afirmação (Aceno) ✓'
                : headPose.movement === 'shake_no'
                ? 'Negação (Giro) ✓'
                : 'Neutra'}
            </span>
          </span>
        </div>

        {/* Actionable Prompt & Guidance */}
        {targetExpression && (
          <div
            className={`p-3 rounded-2xl backdrop-blur-md border text-center transition-all ${
              isOverallMatch
                ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                : 'bg-slate-950/90 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-bold">
              {isOverallMatch ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
              ) : (
                <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              )}
              <span>{isOverallMatch ? 'Expressão Correta! Segure a pose...' : targetExpression.tip}</span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
