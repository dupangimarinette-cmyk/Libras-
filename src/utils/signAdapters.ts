import { LibrasSign, TaughtSign, LearningModule, Lesson, HandPoseRule } from '../types/libras';

/**
 * Converte um sinal ensinado por um usuário (TaughtSign) em um LibrasSign completo
 * para ser exibido no LibrasDex e praticado em Realidade Aumentada.
 */
export function convertTaughtSignToLibrasSign(taught: TaughtSign): LibrasSign {
  const primarySample = taught.samples && taught.samples.length > 0 ? taught.samples[0] : undefined;
  const handAnalysis = primarySample?.handAnalysis;
  const facial = primarySample?.facialFeatures;

  // Constrói a regra de pose a partir da análise da mão gravada
  const poseRule: HandPoseRule = {
    thumbExtended: handAnalysis ? handAnalysis.thumb : true,
    indexExtended: handAnalysis ? handAnalysis.index : true,
    middleExtended: handAnalysis ? handAnalysis.middle : false,
    ringExtended: handAnalysis ? handAnalysis.ring : false,
    pinkyExtended: handAnalysis ? handAnalysis.pinky : false,
    palmOrientation: 'camera',
    descriptionHint: `Sinal ensinado por ${taught.username || 'Aluno'}. Reproduza a configuração da mão e a expressão facial.`,
  };

  // Constrói descrição amigável da expressão facial
  let facialDescription = 'Expressão neutra / focada';
  if (facial) {
    const parts: string[] = [];
    if (facial.eyebrowsState === 'raised') parts.push('Sobrancelhas levantadas');
    if (facial.eyebrowsState === 'furrowed') parts.push('Sobrancelhas franzidas');
    if (facial.headMovement === 'nod_yes') parts.push('Aceno com a cabeça (sim)');
    if (facial.headMovement === 'shake_no') parts.push('Negação com a cabeça (não)');
    if (facial.mouthState === 'smile') parts.push('Sorriso acolhedor');
    if (facial.mouthState === 'open') parts.push('Boca aberta / marcada');
    if (parts.length > 0) {
      facialDescription = parts.join(' • ');
    }
  }

  // Mapeia categoria com fallback seguro
  const validCategories: Array<LibrasSign['category']> = [
    'alfabeto', 'saudacoes', 'respostas', 'familia', 'sentimentos',
    'cotidiano', 'numeros', 'cores', 'alimentos', 'escola', 'lugares'
  ];
  const cat = validCategories.includes(taught.category as any)
    ? (taught.category as LibrasSign['category'])
    : 'cotidiano';

  return {
    id: taught.id,
    name: taught.name,
    category: cat,
    difficulty: 'iniciante',
    meaning: taught.meaning || `Sinal ensinado por ${taught.username}`,
    contextSentence: taught.contextSentence || `Exemplo prático do sinal de ${taught.name}.`,
    contextTranslation: `Em Libras: ${taught.name}`,
    parameters: {
      cm: handAnalysis ? `Mão gravada (${taught.name})` : 'Configuração livre ensinada à IA',
      pa: 'Espaço neutro em frente à câmera',
      m: facial?.headMovement === 'nod_yes' ? 'Movimento afirmativo com a cabeça' : 'Movimento registrado ao vivo',
      o: handAnalysis?.handFacing === 'front' ? 'Voltada para a câmera' : 'Espaço frontal',
      ef: facialDescription,
    },
    svgHandShape: 'custom_community',
    poseRule,
    tips: [
      `Sinal ensinado por ${taught.username || 'Aluno'} para a inteligência artificial.`,
      `Expressão Facial registrada: ${facialDescription}.`,
      taught.contextSentence ? `Frase de exemplo: "${taught.contextSentence}"` : 'Pratique mantendo a postura firme.',
    ],
    imageUrl: primarySample?.imageSnapshot,
    isCustom: true,
  };
}

/**
 * Gera um módulo dinâmico para a trilha de aprendizagem contendo todos os sinais
 * ensinados por alunos da comunidade.
 */
export function buildCommunityLearningModule(taughtSigns: TaughtSign[]): LearningModule | null {
  if (!taughtSigns || taughtSigns.length === 0) return null;

  const lessons: Lesson[] = taughtSigns.map((sign, index) => {
    const librasSign = convertTaughtSignToLibrasSign(sign);

    return {
      id: `lesson_community_${sign.id}`,
      moduleId: 'mod_community',
      title: `${sign.name}`,
      description: `Sinal ensinado por ${sign.username || 'Aluno'}: ${sign.meaning}`,
      xpReward: 40,
      gemsReward: 20,
      icon: 'Sparkles',
      targetSignIds: [librasSign.id],
      exercises: [
        {
          id: `ex_${sign.id}_learn`,
          type: 'learn',
          title: `Aprenda: ${sign.name}`,
          instruction: `Observe o sinal "${sign.name}" ensinado por ${sign.username} e sua expressão facial correspondente.`,
          signId: librasSign.id,
        },
        {
          id: `ex_${sign.id}_ar`,
          type: 'ar_challenge',
          title: `Desafio Prático: ${sign.name}`,
          instruction: `Posicione sua mão e reproduza o sinal "${sign.name}" em frente à câmera.`,
          signId: librasSign.id,
          targetHoldSeconds: 1.5,
        },
        {
          id: `ex_${sign.id}_quiz`,
          type: 'identify_sign',
          title: `Quiz de Fixação: ${sign.name}`,
          instruction: `Qual é o significado correto do sinal "${sign.name}"?`,
          signId: librasSign.id,
          options: [
            {
              id: 'opt_correct',
              text: sign.meaning,
              isCorrect: true,
              explanation: `Correto! Este sinal representa: ${sign.meaning}.`,
            },
            {
              id: 'opt_wrong_1',
              text: 'Sinal de despedida padrão',
              isCorrect: false,
              explanation: 'Incorreto. Observe o significado registrado pelo autor.',
            },
            {
              id: 'opt_wrong_2',
              text: 'Sinal de número cardinal',
              isCorrect: false,
              explanation: 'Incorreto. Este sinal possui valor léxico específico.',
            },
          ],
        },
      ],
    };
  });

  return {
    id: 'mod_community',
    level: 99,
    title: '🌟 Módulo Comunidade: Sinais dos Usuários',
    subtitle: 'Pratique sinais reais criados e ensinados pelos alunos com mãos e expressões faciais',
    themeColor: 'from-amber-500 via-purple-600 to-indigo-600',
    accentColor: '#f59e0b',
    icon: 'Sparkles',
    description: 'Explore sinais ensinados pela comunidade à inteligência artificial do LibrasGo. Cada sinal foi registrado em tempo real!',
    lessons,
    enabled: true,
  };
}
