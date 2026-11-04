import { UserStats } from '../types/libras';

export interface ThemeConfig {
  id: string;
  name: string;
  label: string;
  colorHex: string;
  accentHex: string;
  bodyBgHex: string;
  bgGradient: string;
  previewBg: string;
  avatarBorder: string;
  cardAura: string;
  activePillBg: string;
}

export interface ProfileColorConfig {
  id: string;
  name: string;
  label: string;
  colorHex: string;
  accentHex: string;
  avatarBorder: string;
  cardAura: string;
  activePillBg: string;
}

/**
 * Converte hex para RGB com fallback seguro
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return { r: 16, g: 185, b: 129 }; // default emerald
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Gera uma cor de fundo escura, profundamente matizada com a cor escolhida pelo usuário.
 * Em vez de preto genérico, cria um fundo atmosférico rico e vivo da mesma tonalidade.
 */
export function computeTintedBodyBg(colorHex: string): string {
  const { r, g, b } = hexToRgb(colorHex);
  // Mantém 12% da luminosidade da cor pura para um fundo rico e escuro mas visivelmente colorido
  const darkR = Math.max(3, Math.min(35, Math.round(r * 0.12)));
  const darkG = Math.max(3, Math.min(35, Math.round(g * 0.12)));
  const darkB = Math.max(4, Math.min(40, Math.round(b * 0.12)));
  return `#${darkR.toString(16).padStart(2, '0')}${darkG.toString(16).padStart(2, '0')}${darkB.toString(16).padStart(2, '0')}`;
}

export const APP_THEMES: ThemeConfig[] = [
  {
    id: 'emerald',
    name: 'Verde Esmeralda',
    label: 'Libras Clássico & Natureza Radiante',
    colorHex: '#10b981',
    accentHex: '#34d399',
    bodyBgHex: '#021810',
    bgGradient: 'bg-gradient-to-b from-[#063321] via-[#032014] to-[#021810] text-slate-100',
    previewBg: 'bg-gradient-to-br from-emerald-800 via-teal-950 to-slate-950',
    avatarBorder: 'border-emerald-400 shadow-emerald-500/50',
    cardAura: 'bg-emerald-500/25',
    activePillBg: 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50',
  },
  {
    id: 'neon-cyber',
    name: 'Cyberpunk Neon',
    label: 'Contraste Alto com Ciano & Menta',
    colorHex: '#06b6d4',
    accentHex: '#34d399',
    bodyBgHex: '#02161c',
    bgGradient: 'bg-gradient-to-b from-[#062c38] via-[#031d25] to-[#02161c] text-slate-100',
    previewBg: 'bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-950',
    avatarBorder: 'border-cyan-400 shadow-cyan-500/50',
    cardAura: 'bg-cyan-500/25',
    activePillBg: 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50',
  },
  {
    id: 'cyan',
    name: 'Ciano Futurista',
    label: 'Interface Holográfica AR',
    colorHex: '#06b6d4',
    accentHex: '#22d3ee',
    bodyBgHex: '#011822',
    bgGradient: 'bg-gradient-to-b from-[#053242] via-[#02212c] to-[#011822] text-slate-100',
    previewBg: 'bg-gradient-to-br from-cyan-800 via-teal-950 to-slate-950',
    avatarBorder: 'border-cyan-400 shadow-cyan-500/50',
    cardAura: 'bg-cyan-500/25',
    activePillBg: 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50',
  },
  {
    id: 'purple',
    name: 'Roxo Místico',
    label: 'Ametista & Violeta Cósmico',
    colorHex: '#a855f7',
    accentHex: '#c084fc',
    bodyBgHex: '#140624',
    bgGradient: 'bg-gradient-to-b from-[#2a0e48] via-[#1b0830] to-[#140624] text-slate-100',
    previewBg: 'bg-gradient-to-br from-purple-800 via-violet-950 to-slate-950',
    avatarBorder: 'border-purple-400 shadow-purple-500/50',
    cardAura: 'bg-purple-500/25',
    activePillBg: 'bg-purple-500/25 text-purple-300 border-purple-400/50',
  },
  {
    id: 'blue',
    name: 'Azul Cósmico',
    label: 'Oceano Noturno & Safira',
    colorHex: '#38bdf8',
    accentHex: '#60a5fa',
    bodyBgHex: '#031427',
    bgGradient: 'bg-gradient-to-b from-[#0a294d] via-[#051c36] to-[#031427] text-slate-100',
    previewBg: 'bg-gradient-to-br from-blue-800 via-sky-950 to-slate-950',
    avatarBorder: 'border-sky-400 shadow-sky-500/50',
    cardAura: 'bg-sky-500/25',
    activePillBg: 'bg-sky-500/25 text-sky-300 border-sky-400/50',
  },
  {
    id: 'pink',
    name: 'Rosa Neon',
    label: 'Sakura Sunset & Cyber Magenta',
    colorHex: '#ec4899',
    accentHex: '#f472b6',
    bodyBgHex: '#220417',
    bgGradient: 'bg-gradient-to-b from-[#420a2e] via-[#2d061f] to-[#220417] text-slate-100',
    previewBg: 'bg-gradient-to-br from-pink-800 via-rose-950 to-slate-950',
    avatarBorder: 'border-pink-400 shadow-pink-500/50',
    cardAura: 'bg-pink-500/25',
    activePillBg: 'bg-pink-500/25 text-pink-300 border-pink-400/50',
  },
  {
    id: 'gold-champion',
    name: 'Dourado Campeão',
    label: 'Ouro e Glória das Conquistas',
    colorHex: '#f59e0b',
    accentHex: '#fbbf24',
    bodyBgHex: '#1f1302',
    bgGradient: 'bg-gradient-to-b from-[#3d2505] via-[#291803] to-[#1f1302] text-slate-100',
    previewBg: 'bg-gradient-to-br from-amber-800 via-yellow-950 to-slate-950',
    avatarBorder: 'border-amber-400 shadow-amber-500/50',
    cardAura: 'bg-amber-500/25',
    activePillBg: 'bg-amber-500/25 text-amber-300 border-amber-400/50',
  },
  {
    id: 'crimson',
    name: 'Vermelho Carmesim',
    label: 'Rubi Intenso & Chama Ardente',
    colorHex: '#f43f5e',
    accentHex: '#fb7185',
    bodyBgHex: '#220409',
    bgGradient: 'bg-gradient-to-b from-[#440a13] via-[#2e050d] to-[#220409] text-slate-100',
    previewBg: 'bg-gradient-to-br from-rose-800 via-red-950 to-slate-950',
    avatarBorder: 'border-rose-400 shadow-rose-500/50',
    cardAura: 'bg-rose-500/25',
    activePillBg: 'bg-rose-500/25 text-rose-300 border-rose-400/50',
  },
  {
    id: 'indigo',
    name: 'Índigo Espacial',
    label: 'Espaço Profundo & Constelações',
    colorHex: '#6366f1',
    accentHex: '#818cf8',
    bodyBgHex: '#0c0e29',
    bgGradient: 'bg-gradient-to-b from-[#181d52] via-[#101338] to-[#0c0e29] text-slate-100',
    previewBg: 'bg-gradient-to-br from-indigo-800 via-slate-950 to-black',
    avatarBorder: 'border-indigo-400 shadow-indigo-500/50',
    cardAura: 'bg-indigo-500/25',
    activePillBg: 'bg-indigo-500/25 text-indigo-300 border-indigo-400/50',
  },
  {
    id: 'dark',
    name: 'Escuro Cyber',
    label: 'Modo Noturno Minimalista Slate',
    colorHex: '#64748b',
    accentHex: '#94a3b8',
    bodyBgHex: '#090d16',
    bgGradient: 'bg-slate-950 text-slate-100',
    previewBg: 'bg-slate-950',
    avatarBorder: 'border-slate-500 shadow-slate-500/30',
    cardAura: 'bg-slate-700/20',
    activePillBg: 'bg-slate-800 text-slate-300 border-slate-600',
  },
];

/**
 * Lista de cores da paleta para Perfil e Fundo
 */
export const COLOR_PALETTE = [
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#10b981', accentHex: '#34d399', description: 'Clássico & Vibrante' },
  { id: 'neon-cyber', name: 'Cyberpunk Neon', hex: '#06b6d4', accentHex: '#34d399', description: 'Ciano & Menta' },
  { id: 'cyan', name: 'Ciano Neon', hex: '#06b6d4', accentHex: '#22d3ee', description: 'Holográfico Futurista' },
  { id: 'purple', name: 'Roxo Místico', hex: '#a855f7', accentHex: '#c084fc', description: 'Ametista & Cósmico' },
  { id: 'blue', name: 'Azul Cósmico', hex: '#38bdf8', accentHex: '#60a5fa', description: 'Oceano Noturno & Safira' },
  { id: 'pink', name: 'Rosa Neon', hex: '#ec4899', accentHex: '#f472b6', description: 'Cyber Sakura & Magenta' },
  { id: 'gold-champion', name: 'Dourado Campeão', hex: '#f59e0b', accentHex: '#fbbf24', description: 'Ouro das Conquistas' },
  { id: 'crimson', name: 'Vermelho Carmesim', hex: '#f43f5e', accentHex: '#fb7185', description: 'Rubi Intenso Flamejante' },
  { id: 'indigo', name: 'Índigo Espacial', hex: '#6366f1', accentHex: '#818cf8', description: 'Constelação Noturna' },
  { id: 'dark', name: 'Escuro Minimalista', hex: '#64748b', accentHex: '#94a3b8', description: 'Slate Noturno' },
];

/**
 * Retorna a configuração completa para o tema solicitado com fallback seguro.
 * Suporta identificadores pré-definidos ou códigos hexadecimais personalizados.
 */
export function getThemeConfig(themeId?: string): ThemeConfig {
  if (!themeId) return APP_THEMES[0];

  const normalizedId = themeId === 'amethyst' ? 'purple' : themeId;
  const found = APP_THEMES.find((t) => t.id === normalizedId);
  if (found) return found;

  // Busca na paleta por ID ou Hex
  const paletteMatch = COLOR_PALETTE.find((c) => c.id === normalizedId || c.hex.toLowerCase() === normalizedId.toLowerCase());
  if (paletteMatch) {
    const bodyBg = computeTintedBodyBg(paletteMatch.hex);
    return {
      id: paletteMatch.id,
      name: paletteMatch.name,
      label: paletteMatch.description,
      colorHex: paletteMatch.hex,
      accentHex: paletteMatch.accentHex,
      bodyBgHex: bodyBg,
      bgGradient: 'text-slate-100',
      previewBg: `bg-[${bodyBg}]`,
      avatarBorder: 'border-white/80 shadow-lg',
      cardAura: 'bg-white/20',
      activePillBg: 'bg-slate-800 text-white border-slate-700',
    };
  }

  // Se for um hex customizado (#xxxxxx)
  if (themeId.startsWith('#')) {
    const bodyBg = computeTintedBodyBg(themeId);
    return {
      id: themeId,
      name: `Personalizado (${themeId.toUpperCase()})`,
      label: 'Cor personalizada escolhida pelo usuário',
      colorHex: themeId,
      accentHex: themeId,
      bodyBgHex: bodyBg,
      bgGradient: 'text-slate-100',
      previewBg: `bg-[${bodyBg}]`,
      avatarBorder: 'border-white/80 shadow-lg',
      cardAura: 'bg-white/20',
      activePillBg: 'bg-slate-800 text-white border-slate-700',
    };
  }

  return APP_THEMES[0];
}

/**
 * Retorna o estilo CSS dinâmico para o fundo com iluminação atmosférica evidente e elegante
 */
export function getThemeBackgroundStyle(themeId?: string): React.CSSProperties {
  const config = getThemeConfig(themeId);
  return {
    backgroundColor: config.bodyBgHex,
    backgroundImage: `radial-gradient(ellipse 120% 75% at 50% -8%, ${config.colorHex}55 0%, ${config.accentHex}28 48%, ${config.bodyBgHex} 90%), radial-gradient(circle at 100% 100%, ${config.accentHex}20 0%, transparent 60%)`,
    backgroundAttachment: 'fixed',
    minHeight: '100vh',
  };
}

/**
 * Retorna a configuração de cor do perfil com fallback
 */
export function getProfileColorConfig(colorIdOrHex?: string): ProfileColorConfig {
  if (!colorIdOrHex) {
    const defaultTheme = APP_THEMES[0];
    return {
      id: defaultTheme.id,
      name: defaultTheme.name,
      label: defaultTheme.label,
      colorHex: defaultTheme.colorHex,
      accentHex: defaultTheme.accentHex,
      avatarBorder: defaultTheme.avatarBorder,
      cardAura: defaultTheme.cardAura,
      activePillBg: defaultTheme.activePillBg,
    };
  }

  // Verifica se é um tema da lista
  const normalizedId = colorIdOrHex === 'amethyst' ? 'purple' : colorIdOrHex;
  const matchedTheme = APP_THEMES.find((t) => t.id === normalizedId);
  if (matchedTheme) {
    return {
      id: matchedTheme.id,
      name: matchedTheme.name,
      label: matchedTheme.label,
      colorHex: matchedTheme.colorHex,
      accentHex: matchedTheme.accentHex,
      avatarBorder: matchedTheme.avatarBorder,
      cardAura: matchedTheme.cardAura,
      activePillBg: matchedTheme.activePillBg,
    };
  }

  // Verifica na paleta
  const matchedPalette = COLOR_PALETTE.find((c) => c.id === colorIdOrHex || c.hex.toLowerCase() === colorIdOrHex.toLowerCase());
  if (matchedPalette) {
    return {
      id: matchedPalette.id,
      name: matchedPalette.name,
      label: matchedPalette.description,
      colorHex: matchedPalette.hex,
      accentHex: matchedPalette.accentHex,
      avatarBorder: 'border-white/80 shadow-lg',
      cardAura: 'bg-white/20',
      activePillBg: 'bg-slate-800 text-white border-slate-700',
    };
  }

  // Se for código hexadecimal (#xxxxxx)
  if (colorIdOrHex.startsWith('#')) {
    return {
      id: colorIdOrHex,
      name: `Personalizado (${colorIdOrHex.toUpperCase()})`,
      label: 'Cor personalizada escolhida pelo usuário',
      colorHex: colorIdOrHex,
      accentHex: colorIdOrHex,
      avatarBorder: 'border-white/90 shadow-xl',
      cardAura: 'bg-white/25',
      activePillBg: 'bg-slate-800 text-white border-slate-700',
    };
  }

  const fallback = APP_THEMES[0];
  return {
    id: fallback.id,
    name: fallback.name,
    label: fallback.label,
    colorHex: fallback.colorHex,
    accentHex: fallback.accentHex,
    avatarBorder: fallback.avatarBorder,
    cardAura: fallback.cardAura,
    activePillBg: fallback.activePillBg,
  };
}

/**
 * Aplica o tema imediatamente ao elemento raiz, body e variáveis CSS
 */
export function applyThemeToDocument(themeId?: string): void {
  if (typeof document === 'undefined') return;

  const config = getThemeConfig(themeId);
  const bgStyle = `radial-gradient(ellipse 120% 75% at 50% -8%, ${config.colorHex}55 0%, ${config.accentHex}28 48%, ${config.bodyBgHex} 90%), radial-gradient(circle at 100% 100%, ${config.accentHex}20 0%, transparent 60%), ${config.bodyBgHex}`;

  // Apply to body and html
  document.documentElement.style.backgroundColor = config.bodyBgHex;
  document.documentElement.style.background = bgStyle;
  document.body.style.backgroundColor = config.bodyBgHex;
  document.body.style.background = bgStyle;
  document.body.style.backgroundAttachment = 'fixed';

  // Set CSS variables for global access
  document.documentElement.style.setProperty('--app-theme-color', config.colorHex);
  document.documentElement.style.setProperty('--app-theme-accent', config.accentHex);
  document.documentElement.style.setProperty('--app-theme-bg', config.bodyBgHex);

  // Update mobile browser chrome bar (Android / iOS Safari PWA)
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', config.bodyBgHex);
  }

  // Fast cache for zero-flicker reloads
  try {
    localStorage.setItem('librasgo_theme', config.id);
  } catch {
    // ignore
  }
}

/**
 * Aplica a cor do perfil no documento
 */
export function applyProfileColorToDocument(profileColor?: string): void {
  if (typeof document === 'undefined') return;

  const config = getProfileColorConfig(profileColor);
  document.documentElement.style.setProperty('--app-profile-color', config.colorHex);
  document.documentElement.style.setProperty('--app-profile-accent', config.accentHex);

  try {
    localStorage.setItem('librasgo_profile_color', config.id);
  } catch {
    // ignore
  }
}
