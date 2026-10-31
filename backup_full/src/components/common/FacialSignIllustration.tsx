import React from 'react';
import { LibrasSign } from '../../types/libras';

interface FacialSignIllustrationProps {
  sign?: Partial<LibrasSign>;
  signId?: string;
  size?: number;
  highlightColor?: string;
  className?: string;
}

export const FacialSignIllustration: React.FC<FacialSignIllustrationProps> = ({
  sign,
  signId,
  size = 140,
  highlightColor = '#a855f7',
  className = '',
}) => {
  const signText = `${sign?.name || ''} ${sign?.parameters?.ef || ''} ${sign?.meaning || ''} ${signId || ''}`.toLowerCase();

  // Eyebrows state detection
  const isRaised = signText.includes('levantad') || signText.includes('raised') || signText.includes('sim/não') || signText.includes('interrog_1');
  const isFurrowed = signText.includes('franzid') || signText.includes('furrowed') || signText.includes('quem') || signText.includes('onde') || signText.includes('interrog_2') || signText.includes('interrog_3');

  // Mouth state detection
  const isSmile = signText.includes('sorriso') || signText.includes('smile') || signText.includes('feliz') || signText.includes('alegre') || signText.includes('acolhedor');
  const isOpen = signText.includes('aberta') || signText.includes('open') || signText.includes('intens');
  const isTense = signText.includes('tens') || signText.includes('comprimid') || signText.includes('negac_2') || signText.includes('não');

  // Head movement detection
  const isNod = signText.includes('aceno') || signText.includes('afirmat') || signText.includes('nod_yes') || signText.includes('sim');
  const isShake = signText.includes('balanço') || signText.includes('negat') || signText.includes('shake_no') || signText.includes('não');
  const isTilt = signText.includes('inclin') || signText.includes('tilt');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className={`select-none ${className}`}
      aria-label={`Ilustração da Expressão Facial: ${sign?.name || signId}`}
    >
      <defs>
        <radialGradient id="facialHoloGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={highlightColor} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo Ambient Background */}
      <circle cx="70" cy="70" r="62" fill="url(#facialHoloGlow)" />

      {/* Head / Face Silhouette */}
      <ellipse cx="70" cy="72" rx="38" ry="46" fill="#1e1b4b" stroke={highlightColor} strokeWidth="3" />
      
      {/* Ears */}
      <ellipse cx="31" cy="72" rx="5" ry="9" fill="#312e81" stroke={highlightColor} strokeWidth="2" />
      <ellipse cx="109" cy="72" rx="5" ry="9" fill="#312e81" stroke={highlightColor} strokeWidth="2" />

      {/* Hair outline */}
      <path
        d="M 33 60 C 33 34, 107 34, 107 60 C 95 46, 45 46, 33 60 Z"
        fill="#4338ca"
        stroke={highlightColor}
        strokeWidth="2"
      />

      {/* EYEBROWS */}
      {isRaised ? (
        // Raised curved eyebrows (Sim/Não question or surprise)
        <g stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M 46 50 Q 56 40 64 50" />
          <path d="M 76 50 Q 84 40 94 50" />
        </g>
      ) : isFurrowed ? (
        // Furrowed angled eyebrows (Qu- question / focus)
        <g stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M 46 48 L 65 57" />
          <path d="M 94 48 L 75 57" />
        </g>
      ) : (
        // Neutral relaxed eyebrows
        <g stroke="#c084fc" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M 46 54 Q 55 50 64 54" />
          <path d="M 76 54 Q 85 50 94 54" />
        </g>
      )}

      {/* EYES */}
      <g fill="#ffffff">
        <ellipse cx="55" cy="65" rx="5" ry={isOpen ? 6 : 4} />
        <ellipse cx="85" cy="65" rx="5" ry={isOpen ? 6 : 4} />
      </g>
      <g fill={isFurrowed ? '#f59e0b' : '#38bdf8'}>
        <circle cx="55" cy="65" r="2.5" />
        <circle cx="85" cy="65" r="2.5" />
      </g>

      {/* NOSE */}
      <path d="M 70 66 L 68 76 L 73 76" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* MOUTH */}
      {isSmile ? (
        // Smiling mouth
        <path d="M 52 86 Q 70 102 88 86" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      ) : isOpen ? (
        // Open expressive mouth
        <ellipse cx="70" cy="89" rx="10" ry="7" fill="#f43f5e" stroke="#fb7185" strokeWidth="2" />
      ) : isTense ? (
        // Tight tense straight lips
        <line x1="56" y1="88" x2="84" y2="88" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
      ) : (
        // Gentle neutral mouth
        <path d="M 56 88 Q 70 91 84 88" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      )}

      {/* HEAD MOVEMENT BADGE INDICATOR */}
      {isNod && (
        <g fill="#10b981">
          <circle cx="114" cy="30" r="14" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
          <text x="114" y="35" textAnchor="middle" fontSize="13" fontWeight="bold">↕️</text>
        </g>
      )}
      {isShake && (
        <g fill="#f43f5e">
          <circle cx="114" cy="30" r="14" fill="#4c0519" stroke="#f43f5e" strokeWidth="2" />
          <text x="114" y="35" textAnchor="middle" fontSize="13" fontWeight="bold">↔️</text>
        </g>
      )}
      {isTilt && (
        <g fill="#8b5cf6">
          <circle cx="114" cy="30" r="14" fill="#2e1065" stroke="#8b5cf6" strokeWidth="2" />
          <text x="114" y="35" textAnchor="middle" fontSize="13" fontWeight="bold">↗️</text>
        </g>
      )}

      {/* Non-manual icon indicator */}
      <circle cx="26" cy="30" r="13" fill="#3b0764" stroke="#a855f7" strokeWidth="1.5" />
      <text x="26" y="35" textAnchor="middle" fontSize="12">🎭</text>
    </svg>
  );
};
