import React, { useState } from 'react';

export interface MascotEquipped {
  outfit?: string;
  hat?: string;
  glasses?: string;
  skin?: string;
}

interface LibrinhaMascotProps {
  mascotId?: string;
  mood?: 'happy' | 'cheering' | 'thinking' | 'encouraging';
  message?: string;
  size?: number;
  className?: string;
  equipped?: MascotEquipped;
}

export const LibrinhaMascot: React.FC<LibrinhaMascotProps> = ({
  mascotId = 'librinha',
  mood = 'happy',
  message,
  size = 110,
  className = '',
  equipped = {
    outfit: 'none',
    hat: 'none',
    glasses: 'none',
    skin: 'skin_esmeralda',
  },
}) => {
  const [isWaving, setIsWaving] = useState(false);

  // Determine skin colors
  const skin = equipped.skin || 'skin_esmeralda';
  let skinStart = '#6ee7b7';
  let skinEnd = '#10b981';
  let skinStroke = '#059669';
  let skinFingerFill = '#34d399';
  let glowColor = '#10b981';

  if (skin === 'skin_azul_cosmico') {
    skinStart = '#93c5fd';
    skinEnd = '#2563eb';
    skinStroke = '#1d4ed8';
    skinFingerFill = '#60a5fa';
    glowColor = '#3b82f6';
  } else if (skin === 'skin_ouro_solar') {
    skinStart = '#fef08a';
    skinEnd = '#eab308';
    skinStroke = '#ca8a04';
    skinFingerFill = '#facc15';
    glowColor = '#eab308';
  } else if (skin === 'skin_rosa_neon') {
    skinStart = '#fbcfe8';
    skinEnd = '#db2777';
    skinStroke = '#be185d';
    skinFingerFill = '#f472b6';
    glowColor = '#ec4899';
  } else if (skin === 'skin_onix_sombra') {
    skinStart = '#94a3b8';
    skinEnd = '#334155';
    skinStroke = '#0f172a';
    skinFingerFill = '#64748b';
    glowColor = '#818cf8';
  }

  const outfit = equipped.outfit || 'none';
  const hat = equipped.hat || 'none';
  const glasses = equipped.glasses || 'none';

  // Render character specific body & head
  const renderCompanionBody = () => {
    switch (mascotId) {
      case 'corujita':
        // Corujita Bilíngue: Wise purple owl with big eyes and wings
        return (
          <g>
            <circle cx="60" cy="60" r="54" fill="#8b5cf6" fillOpacity="0.2" />
            {/* Body */}
            <ellipse cx="60" cy="68" rx="28" ry="30" fill="#7c3aed" stroke="#5b21b6" strokeWidth="3" />
            {/* Belly */}
            <ellipse cx="60" cy="74" rx="18" ry="20" fill="#ede9fe" />
            {/* Feather details */}
            <path d="M 52 70 Q 60 74 68 70" stroke="#8b5cf6" strokeWidth="2" fill="none" />
            <path d="M 50 78 Q 60 82 70 78" stroke="#8b5cf6" strokeWidth="2" fill="none" />
            {/* Wings */}
            <path
              d="M 32 60 C 20 68, 22 84, 34 86 C 36 78, 36 68, 32 60 Z"
              fill="#6d28d9"
              stroke="#5b21b6"
              strokeWidth="2.5"
              className={isWaving || mood === 'cheering' ? 'animate-bounce' : ''}
            />
            <path
              d="M 88 60 C 100 68, 98 84, 86 86 C 84 78, 84 68, 88 60 Z"
              fill="#6d28d9"
              stroke="#5b21b6"
              strokeWidth="2.5"
            />
            {/* Ear Tufts */}
            <polygon points="40,42 34,22 48,36" fill="#6d28d9" stroke="#5b21b6" strokeWidth="2" />
            <polygon points="80,42 86,22 72,36" fill="#6d28d9" stroke="#5b21b6" strokeWidth="2" />
            {/* Big Wise Eyes */}
            <circle cx="48" cy="50" r="13" fill="#ffffff" stroke="#5b21b6" strokeWidth="2.5" />
            <circle cx="72" cy="50" r="13" fill="#ffffff" stroke="#5b21b6" strokeWidth="2.5" />
            <circle cx="48" cy="50" r="7" fill="#fbbf24" />
            <circle cx="72" cy="50" r="7" fill="#fbbf24" />
            <circle cx="49" cy="49" r="4.5" fill="#0f172a" />
            <circle cx="73" cy="49" r="4.5" fill="#0f172a" />
            <circle cx="51" cy="47" r="1.8" fill="#ffffff" />
            <circle cx="75" cy="47" r="1.8" fill="#ffffff" />
            {/* Cute Yellow Beak */}
            <polygon points="56,58 64,58 60,67" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            {/* Feet */}
            <rect x="48" y="96" width="7" height="6" rx="3" fill="#f59e0b" />
            <rect x="65" y="96" width="7" height="6" rx="3" fill="#f59e0b" />
          </g>
        );

      case 'robo_neon':
        // Cyborg Neon 3000: High-tech mecha with glowing cyan visor screen
        return (
          <g>
            <circle cx="60" cy="60" r="54" fill="#06b6d4" fillOpacity="0.22" />
            {/* Robot Head / Body Frame */}
            <rect x="30" y="32" width="60" height="56" rx="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="3.5" />
            {/* Glowing Antenna */}
            <line x1="60" y1="32" x2="60" y2="18" stroke="#06b6d4" strokeWidth="3" />
            <circle cx="60" cy="16" r="5" fill="#22d3ee" className="animate-pulse" />
            {/* Side Ear Bolts */}
            <rect x="23" y="48" width="8" height="18" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
            <rect x="89" y="48" width="8" height="18" rx="3" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
            {/* Digital Eye Display Screen */}
            <rect x="36" y="42" width="48" height="26" rx="6" fill="#082f49" stroke="#38bdf8" strokeWidth="2" />
            {/* Cyan Digital Eyes */}
            <rect x="42" y="48" width="10" height="12" rx="2" fill="#22d3ee" className="animate-pulse" />
            <rect x="68" y="48" width="10" height="12" rx="2" fill="#22d3ee" className="animate-pulse" />
            {/* Digital Smile line */}
            <path d="M 48 76 L 72 76" stroke="#22d3ee" strokeWidth="3" strokeDasharray="3 2" />
            {/* Torso Circuits */}
            <rect x="38" y="88" width="44" height="14" rx="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
            <circle cx="48" cy="95" r="2.5" fill="#10b981" />
            <circle cx="60" cy="95" r="2.5" fill="#38bdf8" />
            <circle cx="72" cy="95" r="2.5" fill="#f43f5e" />
          </g>
        );

      case 'astronauta':
        // Astro-Libras: Astronaut explorer with reflective helmet
        return (
          <g>
            <circle cx="60" cy="60" r="54" fill="#f59e0b" fillOpacity="0.2" />
            {/* Suit Body */}
            <ellipse cx="60" cy="74" rx="26" ry="24" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />
            {/* Space Chest Plate */}
            <rect x="48" y="68" width="24" height="16" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <circle cx="54" cy="76" r="2" fill="#38bdf8" />
            <circle cx="60" cy="76" r="2" fill="#10b981" />
            <circle cx="66" cy="76" r="2" fill="#f43f5e" />
            {/* Big Helmet */}
            <circle cx="60" cy="46" r="28" fill="#ffffff" stroke="#94a3b8" strokeWidth="3.5" />
            {/* Golden Sun Visor */}
            <ellipse cx="60" cy="46" rx="20" ry="16" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            {/* Starlight Reflection on Visor */}
            <path d="M 48 38 Q 60 42 70 38" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" fill="none" />
            <circle cx="66" cy="48" r="2" fill="#ffffff" />
            {/* Backpack Thruster Tubes */}
            <rect x="25" y="44" width="7" height="34" rx="3.5" fill="#64748b" />
            <rect x="88" y="44" width="7" height="34" rx="3.5" fill="#64748b" />
          </g>
        );

      case 'dragaozinho':
        // Pequeno Draco: Friendly pink/red mini dragon with wings and horns
        return (
          <g>
            <circle cx="60" cy="60" r="54" fill="#ec4899" fillOpacity="0.22" />
            {/* Dragon Wings */}
            <path
              d="M 32 50 C 12 40, 16 68, 34 72 Z"
              fill="#db2777"
              stroke="#be185d"
              strokeWidth="2.5"
              className={isWaving || mood === 'cheering' ? 'animate-bounce' : ''}
            />
            <path
              d="M 88 50 C 108 40, 104 68, 86 72 Z"
              fill="#db2777"
              stroke="#be185d"
              strokeWidth="2.5"
            />
            {/* Dragon Body */}
            <ellipse cx="60" cy="68" rx="26" ry="26" fill="#f43f5e" stroke="#be123c" strokeWidth="3" />
            {/* Soft Cream Belly Plates */}
            <ellipse cx="60" cy="74" rx="16" ry="17" fill="#fef2f2" />
            <path d="M 50 68 Q 60 72 70 68" stroke="#fca5a5" strokeWidth="2" fill="none" />
            <path d="M 48 76 Q 60 80 72 76" stroke="#fca5a5" strokeWidth="2" fill="none" />
            {/* Head */}
            <circle cx="60" cy="46" r="24" fill="#f43f5e" stroke="#be123c" strokeWidth="3" />
            {/* Cute Yellow Horns */}
            <polygon points="44,32 38,14 49,26" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            <polygon points="76,32 82,14 71,26" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
            {/* Cute Big Eyes */}
            <circle cx="50" cy="44" r="6" fill="#0f172a" />
            <circle cx="70" cy="44" r="6" fill="#0f172a" />
            <circle cx="48" cy="42" r="2.2" fill="#ffffff" />
            <circle cx="68" cy="42" r="2.2" fill="#ffffff" />
            {/* Dragon Snout / Smile */}
            <ellipse cx="60" cy="54" rx="10" ry="7" fill="#fb7185" />
            <circle cx="57" cy="52" r="1.5" fill="#be123c" />
            <circle cx="63" cy="52" r="1.5" fill="#be123c" />
            <path d="M 55 56 Q 60 60 65 56" stroke="#be123c" strokeWidth="1.8" fill="none" />
          </g>
        );

      case 'librinha':
      default:
        // Librinha Clássica: Friendly green hand mascot
        return (
          <g>
            <circle cx="60" cy="60" r="54" fill={glowColor} fillOpacity="0.18" />
            {/* Hand Head / Body */}
            <rect
              x="32"
              y="38"
              width="56"
              height="54"
              rx="22"
              fill="url(#librinhaSkinGradient)"
              stroke={skinStroke}
              strokeWidth="3.5"
            />
            {/* Hand fingers on top of head */}
            <g className={isWaving || mood === 'cheering' ? 'animate-bounce' : ''}>
              <rect x="36" y="22" width="9" height="24" rx="4.5" fill={skinFingerFill} stroke={skinStroke} strokeWidth="2.5" />
              <rect x="47" y="16" width="9" height="28" rx="4.5" fill={skinFingerFill} stroke={skinStroke} strokeWidth="2.5" />
              <rect x="58" y="12" width="10" height="32" rx="5" fill={skinFingerFill} stroke={skinStroke} strokeWidth="2.5" />
              <rect x="70" y="16" width="9" height="28" rx="4.5" fill={skinFingerFill} stroke={skinStroke} strokeWidth="2.5" />
              <path
                d="M 86 52 C 94 48, 98 58, 92 64 C 88 68, 86 64, 86 56 Z"
                fill={skinFingerFill}
                stroke={skinStroke}
                strokeWidth="2.5"
              />
            </g>
            {/* Expressive animated eyes */}
            <g>
              <ellipse cx="48" cy="58" rx="7" ry="8" fill="#0f172a" />
              <circle cx="46" cy="56" r="2.8" fill="#ffffff" />
              <circle cx="51" cy="62" r="1.2" fill="#ffffff" />
              <ellipse cx="72" cy="58" rx="7" ry="8" fill="#0f172a" />
              <circle cx="70" cy="56" r="2.8" fill="#ffffff" />
              <circle cx="75" cy="62" r="1.2" fill="#ffffff" />
              <circle cx="39" cy="66" r="4.5" fill="#f43f5e" fillOpacity="0.4" />
              <circle cx="81" cy="66" r="4.5" fill="#f43f5e" fillOpacity="0.4" />
            </g>
            {/* Smile Mouth */}
            <path
              d={
                mood === 'cheering'
                  ? 'M 50 68 Q 60 80 70 68 Z'
                  : 'M 52 70 Q 60 76 68 70'
              }
              fill={mood === 'cheering' ? '#0f172a' : 'none'}
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        );
    }
  };

  return (
    <div
      className={`relative inline-flex items-center gap-3 select-none ${className}`}
      onMouseEnter={() => setIsWaving(true)}
      onMouseLeave={() => setIsWaving(false)}
    >
      {/* Mascot Graphic */}
      <div
        className="relative flex-shrink-0 cursor-pointer transform hover:scale-105 transition-transform"
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 120 120"
          className="w-full h-full filter drop-shadow-[0_8px_16px_rgba(16,185,129,0.3)]"
        >
          {/* Main Mascot Character Graphic */}
          {renderCompanionBody()}

          {/* --- CUSTOMIZATIONS LAYER --- */}

          {/* 1. OUTFITS / ROUPAS */}
          {outfit === 'outfit_brasil' && (
            <g>
              <path
                d="M 32 72 Q 60 76 88 72 L 88 92 Q 60 96 32 92 Z"
                fill="#facc15"
                stroke="#ca8a04"
                strokeWidth="2"
              />
              <path d="M 46 72 Q 60 80 74 72" stroke="#16a34a" strokeWidth="3" fill="none" />
              <polygon points="60,77 64,81 60,85 56,81" fill="#16a34a" />
              <circle cx="60" cy="81" r="2" fill="#2563eb" />
            </g>
          )}

          {outfit === 'outfit_cyber' && (
            <g>
              <path
                d="M 32 72 L 88 72 L 84 92 L 36 92 Z"
                fill="#0f172a"
                stroke="#06b6d4"
                strokeWidth="2.5"
              />
              <circle cx="60" cy="82" r="5" fill="#22d3ee" stroke="#38bdf8" strokeWidth="1.5" />
              <line x1="42" y1="82" x2="52" y2="82" stroke="#06b6d4" strokeWidth="1.5" />
              <line x1="68" y1="82" x2="78" y2="82" stroke="#06b6d4" strokeWidth="1.5" />
            </g>
          )}

          {outfit === 'outfit_estudante' && (
            <g>
              <path
                d="M 32 72 Q 60 75 88 72 L 88 92 Q 60 95 32 92 Z"
                fill="#1e3a8a"
                stroke="#172554"
                strokeWidth="2"
              />
              <polygon points="50,72 60,80 70,72" fill="#ffffff" />
              <polygon points="58,74 62,74 63,88 60,91 57,88" fill="#dc2626" />
            </g>
          )}

          {outfit === 'outfit_mestre' && (
            <g>
              <path
                d="M 30 70 Q 60 75 90 70 L 92 93 Q 60 97 28 93 Z"
                fill="#be123c"
                stroke="#facc15"
                strokeWidth="2.5"
              />
              <circle cx="36" cy="74" r="3" fill="#facc15" />
              <circle cx="84" cy="74" r="3" fill="#facc15" />
              <path d="M 36 74 Q 60 78 84 74" stroke="#facc15" strokeWidth="2" fill="none" />
            </g>
          )}

          {outfit === 'outfit_streetwear' && (
            <g>
              <path
                d="M 32 72 Q 60 75 88 72 L 88 92 Q 60 95 32 92 Z"
                fill="#7c3aed"
                stroke="#5b21b6"
                strokeWidth="2"
              />
              <rect x="44" y="80" width="32" height="10" rx="3" fill="#6d28d9" />
              <line x1="55" y1="74" x2="55" y2="81" stroke="#ffffff" strokeWidth="1.5" />
              <line x1="65" y1="74" x2="65" y2="81" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}

          {/* 2. GLASSES / ÓCULOS */}
          {glasses === 'glasses_oculos_sol' && (
            <g>
              <rect x="38" y="52" width="19" height="13" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <rect x="63" y="52" width="19" height="13" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
              <line x1="57" y1="56" x2="63" y2="56" stroke="#0f172a" strokeWidth="2.5" />
              <line x1="42" y1="55" x2="48" y2="61" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
              <line x1="67" y1="55" x2="73" y2="61" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
            </g>
          )}

          {glasses === 'glasses_visor_holo' && (
            <g>
              <rect
                x="36"
                y="52"
                width="48"
                height="14"
                rx="5"
                fill="#06b6d4"
                fillOpacity="0.4"
                stroke="#22d3ee"
                strokeWidth="2"
              />
              <line x1="38" y1="59" x2="82" y2="59" stroke="#67e8f9" strokeWidth="1.2" strokeDasharray="3 2" />
            </g>
          )}

          {glasses === 'glasses_mascara_expressiva' && (
            <g>
              {/* Holographic facial expression mesh mask */}
              <ellipse cx="60" cy="58" rx="26" ry="16" fill="#818cf8" fillOpacity="0.3" stroke="#6366f1" strokeWidth="2" />
              <polygon points="60,46 64,54 60,62 56,54" fill="#a5b4fc" />
              <circle cx="48" cy="56" r="4" fill="none" stroke="#a5b4fc" strokeWidth="1.5" />
              <circle cx="72" cy="56" r="4" fill="none" stroke="#a5b4fc" strokeWidth="1.5" />
            </g>
          )}

          {/* 3. HATS / ACESSÓRIOS DE CABEÇA */}
          {hat === 'hat_bone_tras' && (
            <g>
              <path
                d="M 34 38 Q 60 26 86 38 L 88 42 Q 60 38 32 42 Z"
                fill="#ea580c"
                stroke="#c2410c"
                strokeWidth="2"
              />
              <ellipse cx="60" cy="33" rx="14" ry="4" fill="#c2410c" />
              <circle cx="60" cy="30" r="2.5" fill="#f97316" />
            </g>
          )}

          {hat === 'hat_coroa_ouro' && (
            <g>
              <polygon
                points="34,38 40,24 50,32 60,18 70,32 80,24 86,38"
                fill="#facc15"
                stroke="#ca8a04"
                strokeWidth="2"
              />
              <circle cx="60" cy="24" r="2.5" fill="#dc2626" />
              <circle cx="40" cy="28" r="2" fill="#2563eb" />
              <circle cx="80" cy="28" r="2" fill="#16a34a" />
            </g>
          )}

          {hat === 'hat_tiara_emocoes' && (
            <g>
              {/* Neon Tiara with floating crystal */}
              <path d="M 36 36 Q 60 28 84 36" stroke="#ec4899" strokeWidth="3" fill="none" />
              <polygon points="60,20 66,28 60,36 54,28" fill="#f472b6" stroke="#db2777" strokeWidth="1.5" className="animate-pulse" />
              <circle cx="60" cy="28" r="2" fill="#ffffff" />
            </g>
          )}

          {hat === 'hat_fone_gamer' && (
            <g>
              <path
                d="M 30 52 C 26 28, 94 28, 90 52"
                stroke="#1e293b"
                strokeWidth="5"
                fill="none"
              />
              <path
                d="M 34 48 C 30 32, 90 32, 86 48"
                stroke="#10b981"
                strokeWidth="2"
                fill="none"
              />
              <rect x="25" y="46" width="9" height="18" rx="4.5" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
              <rect x="86" y="46" width="9" height="18" rx="4.5" fill="#1e293b" stroke="#10b981" strokeWidth="2" />
            </g>
          )}

          {/* Gradients */}
          <defs>
            <linearGradient id="librinhaSkinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={skinStart} />
              <stop offset="100%" stopColor={skinEnd} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Speech Bubble (if message exists) */}
      {message && (
        <div className="relative bg-slate-900 border border-emerald-500/40 text-slate-100 px-4 py-2.5 rounded-2xl shadow-xl max-w-xs text-xs font-bold">
          <p className="leading-snug">{message}</p>
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-r-8 border-r-slate-900 border-b-6 border-b-transparent"></div>
        </div>
      )}
    </div>
  );
};
