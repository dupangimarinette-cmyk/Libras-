import React from 'react';

interface LibrasSignIllustrationProps {
  signId: string;
  className?: string;
  size?: number;
  highlightColor?: string;
}

export const LibrasSignIllustration: React.FC<LibrasSignIllustrationProps> = ({
  signId,
  className = '',
  size = 140,
  highlightColor = '#10b981',
}) => {
  // Renders clear, recognizable vector silhouettes and outlines for Libras hand configurations
  const renderSignGraphics = () => {
    switch (signId) {
      case 'letra_a':
        return (
          <g>
            {/* Palm & 4 folded fingers */}
            <rect x="50" y="55" width="46" height="52" rx="14" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
            {/* Folded fingers creases */}
            <path d="M 50 72 Q 73 75 96 72" stroke="#d97706" strokeWidth="3" fill="none" />
            <path d="M 50 88 Q 73 90 96 88" stroke="#d97706" strokeWidth="3" fill="none" />
            <line x1="62" y1="56" x2="62" y2="72" stroke="#d97706" strokeWidth="2.5" />
            <line x1="73" y1="56" x2="73" y2="72" stroke="#d97706" strokeWidth="2.5" />
            <line x1="84" y1="56" x2="84" y2="72" stroke="#d97706" strokeWidth="2.5" />
            {/* Thumb extended along index side pointing UP */}
            <path
              d="M 46 95 C 40 85, 38 62, 45 42 C 48 35, 54 36, 56 44 C 58 56, 57 75, 52 95 Z"
              fill="#fde68a"
              stroke="#b45309"
              strokeWidth="4"
            />
            {/* Thumb fingernail */}
            <ellipse cx="51" cy="43" rx="4" ry="5" fill="#fef3c7" stroke="#b45309" strokeWidth="2" />
            {/* Wrist */}
            <path d="M 58 107 L 58 135 L 88 135 L 88 107" fill="#f59e0b" stroke="#d97706" strokeWidth="4" />
            {/* Letter badge */}
            <circle cx="106" cy="34" r="18" fill={highlightColor} />
            <text x="106" y="41" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">A</text>
          </g>
        );

      case 'letra_b':
        return (
          <g>
            {/* 4 Straight vertical fingers together */}
            <rect x="52" y="24" width="11" height="65" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="64" y="18" width="11" height="71" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="76" y="22" width="11" height="67" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="88" y="32" width="10" height="57" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            {/* Palm */}
            <rect x="52" y="72" width="46" height="42" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Thumb folded horizontally across palm */}
            <path
              d="M 40 92 C 40 82, 54 80, 78 80 C 84 80, 84 90, 78 92 C 58 92, 48 98, 44 102 Z"
              fill="#fef08a"
              stroke="#b45309"
              strokeWidth="3.5"
            />
            {/* Wrist */}
            <path d="M 58 114 L 58 136 L 88 136 L 88 114" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Letter badge */}
            <circle cx="112" cy="34" r="18" fill={highlightColor} />
            <text x="112" y="41" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">B</text>
          </g>
        );

      case 'letra_c':
        return (
          <g>
            {/* C-curved hand shape */}
            <path
              d="M 98 42 C 78 30, 48 38, 42 62 C 36 84, 46 112, 72 120 C 88 124, 102 116, 104 108 C 105 101, 95 98, 86 98 C 68 96, 62 82, 64 68 C 66 54, 76 48, 92 50 C 99 51, 102 44, 98 42 Z"
              fill="#fbbf24"
              stroke="#d97706"
              strokeWidth="4"
            />
            {/* Inner thumb arch */}
            <path d="M 88 98 C 76 98, 68 90, 68 76" stroke="#b45309" strokeWidth="3" fill="none" />
            {/* Wrist */}
            <path d="M 44 112 L 32 135 L 56 138 L 62 118" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Letter badge */}
            <circle cx="114" cy="32" r="18" fill={highlightColor} />
            <text x="114" y="39" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">C</text>
          </g>
        );

      case 'letra_l':
        return (
          <g>
            {/* Palm */}
            <rect x="58" y="68" width="42" height="46" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Folded middle, ring, pinky */}
            <path d="M 72 70 Q 86 72 100 70" stroke="#d97706" strokeWidth="3" fill="none" />
            <ellipse cx="80" cy="80" rx="6" ry="6" fill="#f59e0b" />
            <ellipse cx="92" cy="82" rx="5" ry="5" fill="#f59e0b" />
            {/* Vertical Index finger */}
            <rect x="58" y="16" width="13" height="60" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="4" />
            <ellipse cx="64.5" cy="22" rx="4.5" ry="5" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
            {/* Horizontal Thumb forming 90 deg */}
            <path
              d="M 64 88 L 22 88 C 16 88, 16 75, 22 75 L 64 75 Z"
              fill="#fde68a"
              stroke="#b45309"
              strokeWidth="4"
            />
            <ellipse cx="22" cy="81.5" rx="4" ry="5" fill="#fef3c7" stroke="#b45309" strokeWidth="1.5" />
            {/* 90 degree arc guide */}
            <path d="M 48 75 A 15 15 0 0 1 58 65" stroke={highlightColor} strokeWidth="3" strokeDasharray="3 3" fill="none" />
            {/* Wrist */}
            <path d="M 66 114 L 66 136 L 92 136 L 92 114" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Letter badge */}
            <circle cx="112" cy="30" r="18" fill={highlightColor} />
            <text x="112" y="37" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">L</text>
          </g>
        );

      case 'letra_v':
      case 'numero_2':
        return (
          <g>
            {/* Palm */}
            <rect x="52" y="66" width="44" height="46" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Index finger pointing slightly left */}
            <g transform="rotate(-15 56 68)">
              <rect x="50" y="16" width="13" height="58" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
              <ellipse cx="56.5" cy="22" rx="4" ry="5" fill="#fef3c7" />
            </g>
            {/* Middle finger pointing slightly right */}
            <g transform="rotate(15 76 68)">
              <rect x="70" y="14" width="13" height="60" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
              <ellipse cx="76.5" cy="20" rx="4" ry="5" fill="#fef3c7" />
            </g>
            {/* Thumb holding ring & pinky */}
            <path
              d="M 44 86 C 44 76, 60 76, 76 80 C 82 82, 80 92, 74 92 C 60 92, 50 96, 46 98 Z"
              fill="#fef08a"
              stroke="#b45309"
              strokeWidth="3.5"
            />
            {/* Wrist */}
            <path d="M 60 112 L 60 136 L 88 136 L 88 112" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Badge */}
            <circle cx="114" cy="34" r="18" fill={highlightColor} />
            <text x="114" y="41" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">
              {signId === 'numero_2' ? '2' : 'V'}
            </text>
          </g>
        );

      case 'letra_i':
      case 'saudacao_oi':
        return (
          <g>
            {/* Palm & 4 fingers folded */}
            <rect x="46" y="58" width="46" height="52" rx="12" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
            {/* Thumb over fingers */}
            <path d="M 42 78 C 48 70, 68 70, 78 76 C 80 82, 74 88, 66 88 L 44 88 Z" fill="#fef08a" stroke="#b45309" strokeWidth="3" />
            {/* Pinky finger extended high */}
            <rect x="84" y="16" width="11" height="52" rx="5.5" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            <ellipse cx="89.5" cy="21" rx="3.5" ry="4" fill="#fef3c7" />
            {/* Motion arrows for 'Oi' */}
            {signId === 'saudacao_oi' && (
              <path d="M 104 22 C 114 26, 114 42, 102 46" stroke="#38bdf8" strokeWidth="3.5" strokeDasharray="3 3" fill="none" markerEnd="url(#arrow)" />
            )}
            {/* Wrist */}
            <path d="M 56 110 L 56 136 L 82 136 L 82 110" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Badge */}
            <circle cx="34" cy="36" r="18" fill={highlightColor} />
            <text x="34" y="43" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
              {signId === 'saudacao_oi' ? 'OI' : 'I'}
            </text>
          </g>
        );

      case 'letra_o':
        return (
          <g>
            {/* Hollow O circle formed by curved fingers and thumb */}
            <ellipse cx="72" cy="74" rx="36" ry="34" fill="#fde68a" stroke="#d97706" strokeWidth="4.5" />
            <ellipse cx="72" cy="74" rx="16" ry="15" fill="#0f172a" />
            {/* Finger segmentation creases */}
            <line x1="88" y1="52" x2="104" y2="46" stroke="#b45309" strokeWidth="2.5" />
            <line x1="98" y1="72" x2="108" y2="72" stroke="#b45309" strokeWidth="2.5" />
            <line x1="88" y1="94" x2="102" y2="98" stroke="#b45309" strokeWidth="2.5" />
            {/* Wrist */}
            <path d="M 58 106 L 58 136 L 86 136 L 86 106" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Badge */}
            <circle cx="114" cy="34" r="18" fill={highlightColor} />
            <text x="114" y="41" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="bold">O</text>
          </g>
        );

      case 'letra_y':
      case 'resposta_desculpe':
        return (
          <g>
            {/* Palm */}
            <rect x="52" y="62" width="42" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Thumb extended out to the left */}
            <path d="M 58 84 L 20 84 C 14 84, 14 70, 20 70 L 58 70 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            {/* Pinky extended out to the right */}
            <path d="M 88 74 L 122 74 C 128 74, 128 86, 122 86 L 88 86 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            {/* 3 middle fingers folded */}
            <rect x="62" y="60" width="8" height="24" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            <rect x="71" y="60" width="8" height="24" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            <rect x="80" y="60" width="8" height="24" rx="4" fill="#f59e0b" stroke="#d97706" strokeWidth="2" />
            {/* Wrist */}
            <path d="M 60 110 L 60 136 L 86 136 L 86 110" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Badge */}
            <circle cx="72" cy="30" r="18" fill={highlightColor} />
            <text x="72" y="37" textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold">
              {signId === 'resposta_desculpe' ? 'DESC' : 'Y'}
            </text>
          </g>
        );

      case 'saudacao_obrigado':
      case 'sentimento_amor':
      case 'pessoa_amigo':
      case 'numero_5':
        return (
          <g>
            {/* Full 5 fingers open hand */}
            {/* Thumb */}
            <path d="M 44 88 C 30 82, 22 70, 26 58 C 30 50, 40 54, 46 66 L 52 82 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            {/* Index */}
            <rect x="46" y="22" width="11" height="60" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            {/* Middle */}
            <rect x="59" y="14" width="12" height="68" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            {/* Ring */}
            <rect x="73" y="20" width="11" height="62" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            {/* Pinky */}
            <rect x="86" y="30" width="10" height="52" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            {/* Palm base */}
            <rect x="44" y="68" width="52" height="42" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Heart symbol for Amor/Amigo */}
            {(signId === 'sentimento_amor' || signId === 'pessoa_amigo') && (
              <path d="M 70 82 C 70 76, 62 76, 62 82 C 62 89, 70 94, 70 94 C 70 94, 78 89, 78 82 C 78 76, 70 76, 70 82 Z" fill="#ef4444" />
            )}
            {/* Wrist */}
            <path d="M 56 110 L 56 136 L 84 136 L 84 110" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Badge */}
            <circle cx="114" cy="34" r="18" fill={highlightColor} />
            <text x="114" y="41" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">
              {signId === 'numero_5' ? '5' : 'OBR'}
            </text>
          </g>
        );

      case 'numero_1':
      case 'saudacao_bom_dia':
        return (
          <g>
            {/* Index only pointing up */}
            <rect x="52" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="66" y="16" width="13" height="60" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            <ellipse cx="72.5" cy="22" rx="4.5" ry="5" fill="#fef3c7" />
            {/* Thumb holding others */}
            <path d="M 46 80 C 52 74, 68 74, 78 80 C 80 86, 74 90, 64 90 L 46 90 Z" fill="#fef08a" stroke="#b45309" strokeWidth="3" />
            {/* Wrist */}
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            {/* Badge */}
            <circle cx="112" cy="34" r="18" fill={highlightColor} />
            <text x="112" y="41" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">1</text>
          </g>
        );

      case 'numero_3':
        return (
          <g>
            <rect x="52" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <path d="M 42 75 C 32 65, 30 50, 38 42 C 45 42, 50 56, 52 72 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="58" y="18" width="11" height="58" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="72" y="16" width="11" height="60" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill={highlightColor} />
            <text x="112" y="41" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">3</text>
          </g>
        );

      case 'numero_4':
        return (
          <g>
            <rect x="52" y="66" width="46" height="44" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="50" y="22" width="10" height="56" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="62" y="16" width="10" height="62" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="74" y="20" width="10" height="58" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="86" y="28" width="10" height="50" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <path d="M 58 110 L 58 136 L 86 136 L 86 110" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill={highlightColor} />
            <text x="112" y="41" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">4</text>
          </g>
        );

      case 'numero_6':
        return (
          <g>
            <rect x="52" y="60" width="46" height="48" rx="12" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Curved thumb and index touching */}
            <path d="M 50 50 C 44 32, 64 26, 74 36 C 80 44, 76 58, 66 60 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            <ellipse cx="64" cy="45" rx="5" ry="6" fill="#0f172a" />
            <path d="M 58 108 L 58 136 L 86 136 L 86 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill={highlightColor} />
            <text x="112" y="41" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">6</text>
          </g>
        );

      case 'cor_azul':
        return (
          <g>
            <rect x="54" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="66" y="16" width="12" height="60" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            <path d="M 40 76 L 68 76 C 70 82, 64 88, 56 88 L 40 88 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill="#3b82f6" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">AZUL</text>
          </g>
        );

      case 'cor_vermelho':
        return (
          <g>
            <rect x="52" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="66" y="18" width="12" height="58" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            {/* Red lip accent */}
            <path d="M 38 42 Q 48 36 58 42 Q 48 48 38 42 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="1.5" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill="#ef4444" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">VERM</text>
          </g>
        );

      case 'cor_amarelo':
        return (
          <g>
            <rect x="52" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="66" y="18" width="12" height="58" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill="#eab308" />
            <text x="112" y="40" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="bold">AMAR</text>
          </g>
        );

      case 'cor_verde':
        return (
          <g>
            <rect x="54" y="60" width="42" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="56" y="20" width="11" height="54" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" transform="rotate(-10 60 45)" />
            <rect x="76" y="20" width="11" height="54" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" transform="rotate(10 80 45)" />
            <path d="M 60 108 L 60 136 L 86 136 L 86 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="114" cy="34" r="18" fill="#10b981" />
            <text x="114" y="40" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">VERD</text>
          </g>
        );

      case 'alimento_agua':
        return (
          <g>
            <rect x="54" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="66" y="16" width="12" height="60" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            <path d="M 40 76 L 68 76 C 70 82, 64 88, 56 88 L 40 88 Z" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            {/* Water drop */}
            <path d="M 44 38 C 44 32, 50 26, 50 26 C 50 26, 56 32, 56 38 C 56 42, 53 45, 50 45 C 47 45, 44 42, 44 38 Z" fill="#38bdf8" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill="#0284c7" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">ÁGUA</text>
          </g>
        );

      case 'alimento_cafe':
        return (
          <g>
            <rect x="52" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Small cup */}
            <path d="M 32 46 L 48 46 L 46 62 L 34 62 Z" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
            <path d="M 48 50 C 52 50, 52 58, 48 58" stroke="#475569" strokeWidth="2" fill="none" />
            {/* Steam */}
            <path d="M 37 42 Q 39 36 37 32" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
            <path d="M 43 42 Q 45 36 43 32" stroke="#cbd5e1" strokeWidth="1.5" fill="none" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill="#b45309" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">CAFÉ</text>
          </g>
        );

      case 'alimento_pao':
        return (
          <g>
            <rect x="50" y="55" width="46" height="52" rx="14" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
            {/* Bread loaf icon */}
            <ellipse cx="46" cy="36" rx="16" ry="10" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
            <line x1="40" y1="32" x2="44" y2="40" stroke="#78350f" strokeWidth="1.5" />
            <line x1="48" y1="32" x2="52" y2="40" stroke="#78350f" strokeWidth="1.5" />
            <path d="M 58 107 L 58 135 L 88 135 L 88 107" fill="#f59e0b" stroke="#d97706" strokeWidth="4" />
            <circle cx="112" cy="34" r="18" fill="#d97706" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="bold">PÃO</text>
          </g>
        );

      case 'familia_pai':
      case 'familia_mae':
        return (
          <g>
            <rect x="52" y="60" width="44" height="48" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            <rect x="66" y="18" width="12" height="58" rx="6" fill="#fde68a" stroke="#b45309" strokeWidth="3.5" />
            {/* Heart of family */}
            <path d="M 44 40 C 44 35, 38 35, 38 40 C 38 45, 44 48, 44 48 C 44 48, 50 45, 50 40 C 50 35, 44 35, 44 40 Z" fill="#ec4899" />
            <path d="M 60 108 L 60 136 L 88 136 L 88 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill={signId === 'familia_pai' ? '#0284c7' : '#ec4899'} />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
              {signId === 'familia_pai' ? 'PAI' : 'MÃE'}
            </text>
          </g>
        );

      case 'lugar_casa':
        return (
          <g>
            {/* House roof silhouette */}
            <path d="M 40 68 L 70 36 L 100 68" stroke="#10b981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M 48 68 L 48 98 L 92 98 L 92 68" fill="#fbbf24" stroke="#d97706" strokeWidth="3" />
            <rect x="62" y="78" width="16" height="20" rx="3" fill="#0f172a" />
            <path d="M 58 108 L 58 136 L 86 136 L 86 108" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="112" cy="34" r="18" fill="#10b981" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">CASA</text>
          </g>
        );

      case 'escola_aprender':
      case 'escola_professor':
      case 'escola_livro':
        return (
          <g>
            <rect x="52" y="55" width="46" height="52" rx="14" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
            <rect x="60" y="24" width="12" height="54" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="74" y="20" width="12" height="58" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            {/* Book icon */}
            <path d="M 38 42 C 46 38, 54 44, 54 44 C 54 44, 62 38, 70 42 L 70 56 C 62 52, 54 58, 54 58 C 54 58, 46 52, 38 56 Z" fill="#6366f1" />
            <path d="M 58 107 L 58 135 L 88 135 L 88 107" fill="#f59e0b" stroke="#d97706" strokeWidth="4" />
            <circle cx="112" cy="34" r="18" fill="#6366f1" />
            <text x="112" y="40" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">EDU</text>
          </g>
        );

      case 'lugar_brasil':
        return (
          <g>
            {/* Hand in B */}
            <rect x="52" y="24" width="11" height="65" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="64" y="18" width="11" height="71" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="76" y="22" width="11" height="67" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="88" y="32" width="10" height="57" rx="5" fill="#fde68a" stroke="#d97706" strokeWidth="3.5" />
            <rect x="52" y="72" width="46" height="42" rx="10" fill="#fbbf24" stroke="#d97706" strokeWidth="3.5" />
            {/* Wave lines for Brazilian coast */}
            <path d="M 38 60 Q 44 54 50 60 Q 56 66 62 60" stroke="#10b981" strokeWidth="3" fill="none" />
            <path d="M 60 110 L 60 136 L 86 136 L 86 110" fill="#f59e0b" stroke="#d97706" strokeWidth="3.5" />
            <circle cx="114" cy="34" r="18" fill="#10b981" />
            <text x="114" y="40" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">BRA</text>
          </g>
        );

      default:
        // Generic friendly hand sign
        return (
          <g>
            <rect x="52" y="55" width="46" height="52" rx="14" fill="#fbbf24" stroke="#d97706" strokeWidth="4" />
            <rect x="60" y="24" width="12" height="54" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <rect x="74" y="20" width="12" height="58" rx="5" fill="#fde68a" stroke="#b45309" strokeWidth="3" />
            <path d="M 58 107 L 58 135 L 88 135 L 88 107" fill="#f59e0b" stroke="#d97706" strokeWidth="4" />
            <circle cx="106" cy="34" r="18" fill={highlightColor} />
            <text x="106" y="41" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="bold">✋</text>
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      className={`select-none ${className}`}
      aria-label={`Ilustração do sinal ${signId}`}
    >
      <defs>
        <radialGradient id="hologramGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={highlightColor} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Background soft ambient halo */}
      <circle cx="70" cy="70" r="62" fill="url(#hologramGlow)" />
      {renderSignGraphics()}
    </svg>
  );
};
