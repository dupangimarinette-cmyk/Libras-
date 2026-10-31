import { LibrasSign, TaughtSign, TaughtFacialExpression, LearningModule, Lesson, HandPoseRule } from '../types/libras';
import { FACIAL_EXERCISES, FacialExercise } from '../data/facialExercisesData';
import { learnedExpressionsService } from '../services/learnedExpressionsService';

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
 * Converte um exercício facial padrão (FacialExercise) em um LibrasSign completo
 * garantindo compatibilidade total com o modal de lições, trilha e glossário.
 */
export function convertFacialExerciseToLibrasSign(exercise: FacialExercise): LibrasSign {
  const eyebrowText =
    exercise.targetEyebrows === 'raised'
      ? 'Sobrancelhas Levantadas (Curiosidade / Pergunta Polar)'
      : exercise.targetEyebrows === 'furrowed'
      ? 'Sobrancelhas Franzidas (Foco / Pergunta Qu-)'
      : 'Sobrancelhas Neutras';

  const headText =
    exercise.targetHeadMovement === 'nod_yes'
      ? 'Aceno Afirmativo com a Cabeça'
      : exercise.targetHeadMovement === 'shake_no'
      ? 'Balanço Negativo com a Cabeça'
      : exercise.targetHeadMovement === 'tilt_left' || exercise.targetHeadMovement === 'tilt_right'
      ? 'Inclinação Lateral da Cabeça'
      : 'Cabeça Alinhada Frontalmente';

  const mouthText =
    exercise.targetMouth === 'smile'
      ? 'Sorriso Acolhedor / Afeto'
      : exercise.targetMouth === 'open'
      ? 'Boca Aberta / Entonação Marcada'
      : exercise.targetMouth === 'wide'
      ? 'Boca Aberta com Ênfase'
      : exercise.targetMouth === 'tense'
      ? 'Lábios Comprimidos / Tensão e Foco'
      : 'Boca Neutra';

  return {
    id: exercise.id,
    name: exercise.title,
    category: 'sentimentos',
    difficulty: exercise.difficulty,
    meaning: exercise.instruction,
    contextSentence: exercise.linguisticExplanation,
    contextTranslation: `Expressão Não-Manual: ${exercise.title}`,
    parameters: {
      cm: exercise.requiresHand ? 'Mão sincronizada com o rosto' : 'Parâmetro Não-Manual (Expressão Facial)',
      pa: 'Face e Movimento de Cabeça',
      m: headText,
      o: 'Voltada para a frente / interlocutor',
      ef: `${eyebrowText} • ${headText} • ${mouthText}`,
    },
    svgHandShape: 'custom_community',
    poseRule: {
      thumbExtended: false,
      indexExtended: false,
      middleExtended: false,
      ringExtended: false,
      pinkyExtended: false,
      palmOrientation: 'camera',
      descriptionHint: `Expressão facial: ${eyebrowText}, ${headText}.`,
    },
    tips: exercise.tips || ['Observe o movimento das sobrancelhas e a inclinação da cabeça.'],
    isCustom: false,
  };
}

/**
 * Retorna todos os sinais de expressões faciais (padrão + comunitários ensinados à IA)
 */
export function getAllFacialSigns(communityExpressions: TaughtFacialExpression[] = []): LibrasSign[] {
  const standardSigns = FACIAL_EXERCISES.map(convertFacialExerciseToLibrasSign);
  const communitySigns = communityExpressions.map((exp) => learnedExpressionsService.convertToLibrasSign(exp));
  return [...standardSigns, ...communitySigns];
}

/**
 * Gera o Módulo de Expressões Faciais & Parâmetros Não-Manuais para a trilha do LibrasGo.
 * Contém lições completas para expressões padrão e para expressões ensinadas pelos alunos.
 */
export function buildFacialLearningModule(
  taughtExpressions: TaughtFacialExpression[] = []
): LearningModule {
  const lessons: Lesson[] = [];

  // Lição 1: Perguntas Interrogativas (Sim/Não e Pronomes Qu-)
  const interrogExercises = FACIAL_EXERCISES.filter((e) => e.category === 'interrogativas');
  lessons.push({
    id: 'lesson_face_interrog',
    moduleId: 'mod_facial',
    title: 'Perguntas: Sim/Não & Quem/Onde',
    description: 'Aprenda como sobrancelhas levantadas e franzidas alteram o significado de frases.',
    xpReward: 45,
    gemsReward: 25,
    icon: 'HelpCircle',
    targetSignIds: interrogExercises.map((e) => e.id),
    exercises: [
      {
        id: 'ex_face_interrog_1_learn',
        type: 'learn',
        title: 'Pergunta Sim/Não (Sobrancelhas Levantadas)',
        instruction: 'Em Libras, perguntas de Sim/Não exigem sobrancelhas levantadas e cabeça levemente projetada.',
        signId: 'face_interrog_1',
      },
      {
        id: 'ex_face_interrog_1_ar',
        type: 'ar_challenge',
        title: 'Desafio Facial: Sobrancelhas Levantadas',
        instruction: 'Posicione seu rosto na câmera, erga as sobrancelhas e incline a cabeça levemente por 1.5s.',
        signId: 'face_interrog_1',
        targetHoldSeconds: 1.5,
      },
      {
        id: 'ex_face_interrog_2_learn',
        type: 'learn',
        title: 'Perguntas QUEM? / ONDE? (Sobrancelhas Franzidas)',
        instruction: 'Pronomes interrogativos (Quem, Onde, O quê, Por quê) exigem franzir as sobrancelhas com olhar investigativo.',
        signId: 'face_interrog_2',
      },
      {
        id: 'ex_face_interrog_2_ar',
        type: 'ar_challenge',
        title: 'Desafio Facial: Sobrancelhas Franzidas',
        instruction: 'Franza as sobrancelhas para a câmera como quem investiga algo com atenção!',
        signId: 'face_interrog_2',
        targetHoldSeconds: 1.8,
      },
      {
        id: 'ex_face_interrog_quiz',
        type: 'identify_sign',
        title: 'Gramática da Libras: Perguntas',
        instruction: 'Como você pontua uma pergunta cuja resposta é Sim ou Não em Libras?',
        signId: 'face_interrog_1',
        options: [
          {
            id: 'opt_f1_a',
            text: 'Levantando as sobrancelhas e inclinando a cabeça à frente',
            isCorrect: true,
            explanation: 'Perfeito! As sobrancelhas levantadas marcam a interrogação polar Sim/Não.',
          },
          {
            id: 'opt_f1_b',
            text: 'Fechando os olhos e balançando a mão',
            isCorrect: false,
            explanation: 'Incorreto. O contato visual com o interlocutor é fundamental em Libras.',
          },
          {
            id: 'opt_f1_c',
            text: 'Mantendo o rosto neutro e rígido',
            isCorrect: false,
            explanation: 'Incorreto. Sem expressão facial, a frase perde o sentido de pergunta.',
          },
        ],
      },
    ],
  });

  // Lição 2: Afirmação & Negação Facial
  const afirmNegExercises = FACIAL_EXERCISES.filter((e) => e.category === 'afirmacao_negacao');
  lessons.push({
    id: 'lesson_face_afirm_negac',
    moduleId: 'mod_facial',
    title: 'Afirmação & Negação Facial',
    description: 'Sincronize o aceno afirmativo e a negação com a cabeça e os lábios.',
    xpReward: 50,
    gemsReward: 30,
    icon: 'ToggleRight',
    targetSignIds: afirmNegExercises.map((e) => e.id),
    exercises: [
      {
        id: 'ex_face_afirm_learn',
        type: 'learn',
        title: 'Afirmação com Aceno de Cabeça',
        instruction: 'O aceno de cabeça para cima e para baixo substitui ou enfatiza a palavra "Sim" na frase em Libras.',
        signId: 'face_afirm_1',
      },
      {
        id: 'ex_face_afirm_ar',
        type: 'ar_challenge',
        title: 'Desafio Facial: Aceno Afirmativo',
        instruction: 'Olhe para a câmera e faça o movimento afirmativo com a cabeça.',
        signId: 'face_afirm_1',
        targetHoldSeconds: 1.5,
      },
      {
        id: 'ex_face_negac_learn',
        type: 'learn',
        title: 'Negação com Balanço de Cabeça e Olhar Firme',
        instruction: 'Mover a cabeça de um lado para o outro com lábios comprimidos nega a sentença sem precisar soletrar "não".',
        signId: 'face_negac_1',
      },
      {
        id: 'ex_face_negac_ar',
        type: 'ar_challenge',
        title: 'Desafio Facial: Negação Enfática',
        instruction: 'Balance a cabeça suavemente de um lado para o outro na frente da câmera.',
        signId: 'face_negac_1',
        targetHoldSeconds: 1.8,
      },
      {
        id: 'ex_face_negac_quiz',
        type: 'identify_sign',
        title: 'Gramática da Negação em Libras',
        instruction: 'É possível negar uma frase inteira em Libras apenas com o movimento de cabeça?',
        signId: 'face_negac_1',
        options: [
          {
            id: 'opt_f2_a',
            text: 'Sim, o movimento de cabeça é um morfema gramatical de negação',
            isCorrect: true,
            explanation: 'Exato! Em Libras, os movimentos de cabeça atuam como morfemas sintáticos e gramaticais.',
          },
          {
            id: 'opt_f2_b',
            text: 'Não, é obrigatório soletrar N-A-O com as mãos sempre',
            isCorrect: false,
            explanation: 'Incorreto. A expressão não-manual é suficiente e natural na fluência da Libras.',
          },
        ],
      },
    ],
  });

  // Lição 3: Intensidade e Emoções
  const intensExercises = FACIAL_EXERCISES.filter((e) => e.category === 'intensidade_emocao' || e.category === 'combinado_mao_rosto');
  lessons.push({
    id: 'lesson_face_intens',
    moduleId: 'mod_facial',
    title: 'Intensidade, Afeto & Sentimentos',
    description: 'Use a abertura dos olhos e boca para demonstrar intensidade (muito, rápido, feliz).',
    xpReward: 55,
    gemsReward: 35,
    icon: 'Sparkles',
    targetSignIds: intensExercises.map((e) => e.id),
    exercises: [
      {
        id: 'ex_face_intens_learn',
        type: 'learn',
        title: 'Intensificador Visual: Olhos e Expressão',
        instruction: 'Olhos arregalados e boca expressiva indicam adjetivos aumentativos como "Muito Bonito" ou "Gigante".',
        signId: 'face_intens_1',
      },
      {
        id: 'ex_face_intens_ar',
        type: 'ar_challenge',
        title: 'Desafio Facial: Expressão de Intensidade',
        instruction: 'Abra bem a expressão diante da câmera com entusiasmo!',
        signId: 'face_intens_1',
        targetHoldSeconds: 1.8,
      },
      {
        id: 'ex_face_feliz_learn',
        type: 'learn',
        title: 'Expressão de Felicidade & Afeto',
        instruction: 'O sinal de Feliz exige sorriso radiante e olhar expressivo para transmitir o sentimento autêntico.',
        signId: 'face_emocao_1',
      },
      {
        id: 'ex_face_feliz_ar',
        type: 'ar_challenge',
        title: 'Desafio Facial: Sorriso Radiante',
        instruction: 'Sorria com alegria e firmeza diante da câmera!',
        signId: 'face_emocao_1',
        targetHoldSeconds: 1.5,
      },
    ],
  });

  // Lição 4: Expressões Criadas por Usuários (Sempre disponível na trilha)
  if (taughtExpressions && taughtExpressions.length > 0) {
    const customExercises = taughtExpressions.map((exp) => {
      const librSign = learnedExpressionsService.convertToLibrasSign(exp);
      return {
        id: `ex_taught_${exp.id}_learn`,
        type: 'learn' as const,
        title: `${exp.name} (Por ${exp.username || 'Aluno'})`,
        instruction: exp.description || 'Expressão facial ensinada e validada pela Inteligência Artificial.',
        signId: librSign.id,
      };
    });

    const customArExercises = taughtExpressions.map((exp) => {
      const librSign = learnedExpressionsService.convertToLibrasSign(exp);
      return {
        id: `ex_taught_${exp.id}_ar`,
        type: 'ar_challenge' as const,
        title: `Desafio na Câmera: ${exp.name}`,
        instruction: `Reproduza a expressão facial "${exp.name}" na câmera frontal.`,
        signId: librSign.id,
        targetHoldSeconds: 1.5,
      };
    });

    const customQuiz = {
      id: 'ex_taught_community_quiz',
      type: 'identify_sign' as const,
      title: 'Quiz das Expressões Criadas por Usuários',
      instruction: `Qual é o significado da expressão facial "${taughtExpressions[0].name}" ensinada à IA?`,
      signId: taughtExpressions[0].id,
      options: [
        {
          id: 'opt_tc_1',
          text: taughtExpressions[0].description,
          isCorrect: true,
          explanation: `Correto! O aluno registrou esta expressão para: ${taughtExpressions[0].description}.`,
        },
        {
          id: 'opt_tc_2',
          text: 'Sinal manual sem expressão facial',
          isCorrect: false,
          explanation: 'Incorreto. Esta é uma expressão não-manual.',
        },
      ],
    };

    lessons.push({
      id: 'lesson_face_community',
      moduleId: 'mod_facial',
      title: '🌟 Expressões Criadas por Usuários',
      description: 'Pratique as expressões faciais personalizadas que você e outros alunos ensinaram à IA!',
      xpReward: 60,
      gemsReward: 40,
      icon: 'Smile',
      targetSignIds: taughtExpressions.map((e) => e.id),
      exercises: [...customExercises.slice(0, 3), ...customArExercises.slice(0, 2), customQuiz],
    });
  } else {
    // Lição 4 sempre visível na trilha para permitir acesso imediato às expressões dos alunos
    lessons.push({
      id: 'lesson_face_community',
      moduleId: 'mod_facial',
      title: '🌟 Expressões Criadas por Usuários',
      description: 'Aprenda como ensinar novas expressões faciais à IA e pratique os parâmetros não-manuais da comunidade!',
      xpReward: 60,
      gemsReward: 40,
      icon: 'Smile',
      targetSignIds: ['face_intens_1', 'face_interrog_1'],
      exercises: [
        {
          id: 'ex_taught_welcome_learn',
          type: 'learn' as const,
          title: 'Expressões Criadas pelos Usuários',
          instruction: 'Você pode ensinar qualquer expressão facial à IA na aba "Ensinar Expressões à IA" do laboratório de RA. Cada expressão salva fica disponível aqui na trilha e no LibrasDex!',
          signId: 'face_intens_1',
        },
        {
          id: 'ex_taught_welcome_ar',
          type: 'ar_challenge' as const,
          title: 'Treino Facial: Expressividade ao Vivo',
          instruction: 'Posicione seu rosto na câmera frontal e expresse entusiasmo com sobrancelhas levantadas e sorriso.',
          signId: 'face_intens_1',
          targetHoldSeconds: 1.5,
        },
        {
          id: 'ex_taught_welcome_quiz',
          type: 'identify_sign' as const,
          title: 'Quiz: Parâmetros Ensinados à IA',
          instruction: 'Onde ficam disponíveis as expressões faciais ensinadas à IA pelos usuários?',
          signId: 'face_intens_1',
          options: [
            {
              id: 'opt_intro_1',
              text: 'Na trilha de aprendizagem, no LibrasDex e nas atividades de RA',
              isCorrect: true,
              explanation: 'Exatamente! As expressões salvas são integradas a todo o LibrasGo.',
            },
            {
              id: 'opt_intro_2',
              text: 'Ficam perdidas e não podem ser praticadas',
              isCorrect: false,
              explanation: 'Incorreto. Elas são salvas na sua conta e sincronizadas.',
            },
          ],
        },
      ],
    });
  }

  return {
    id: 'mod_facial',
    level: 3,
    title: '🎭 Módulo Especial: Expressões Faciais & Parâmetros Não-Manuais',
    subtitle: 'Aprenda e pratique expressões gramaticais essenciais e as expressões ensinadas à IA',
    themeColor: 'from-indigo-600 via-purple-600 to-pink-600',
    accentColor: '#8b5cf6',
    icon: 'Smile',
    description: 'Em Libras, o rosto dá voz ao sinal! Domine perguntas, afirmações, negações e expressões afetivas com validação de câmera.',
    lessons,
    enabled: true,
  };
}

/**
 * Gera um módulo dinâmico para a trilha de aprendizagem contendo todos os sinais
 * ensinados por alunos da comunidade.
 */
export function buildCommunityLearningModule(taughtSigns: TaughtSign[]): LearningModule | null {
  if (!taughtSigns || taughtSigns.length === 0) return null;

  const lessons: Lesson[] = taughtSigns.map((sign) => {
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
