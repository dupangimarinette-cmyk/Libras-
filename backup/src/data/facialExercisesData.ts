import { EyebrowsState, HeadMovementType, MouthState } from '../types/libras';

export type FacialCategory = 'interrogativas' | 'afirmacao_negacao' | 'intensidade_emocao' | 'combinado_mao_rosto';

export interface FacialExercise {
  id: string;
  title: string;
  category: FacialCategory;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  level: number;
  instruction: string;
  linguisticExplanation: string;
  referenceSignName?: string;
  referenceSignId?: string;
  requiresHand: boolean;
  requiredHandSignId?: string;
  targetEyebrows?: EyebrowsState;
  targetHeadMovement?: HeadMovementType;
  targetMouth?: MouthState;
  minPitch?: number; // Para inclinação para frente em perguntas
  maxPitch?: number;
  minRoll?: number;  // Para inclinação lateral de cabeça
  maxRoll?: number;
  holdDurationSeconds: number;
  xpReward: number;
  gemsReward: number;
  mascotRewardItemId?: string; // Item desbloqueado para a Librinha
  tips: string[];
}

export const FACIAL_EXERCISES: FacialExercise[] = [
  // ==========================================================================
  // 1. INTERROGATIVAS (Expressões Não Manuais Gramaticais de Pergunta)
  // ==========================================================================
  {
    id: 'face_interrog_1',
    title: 'Pergunta Sim/Não: Sobrancelhas Levantadas',
    category: 'interrogativas',
    difficulty: 'iniciante',
    level: 1,
    instruction: 'Levante bem as sobrancelhas e incline levemente a cabeça para a frente.',
    linguisticExplanation: 'Em Libras, perguntas cuja resposta é "Sim" ou "Não" (ex: "Você gosta de estudar?") exigem sobrancelhas levantadas e cabeça levemente inclinada para frente ao final da frase.',
    requiresHand: false,
    targetEyebrows: 'raised',
    targetHeadMovement: 'neutral',
    holdDurationSeconds: 1.5,
    xpReward: 35,
    gemsReward: 15,
    tips: [
      'Erga as duas sobrancelhas como se estivesse curioso.',
      'Mantenha o olhar fixo no interlocutor (na câmera).',
      'Incline a cabeça levemente para a frente.',
    ],
  },
  {
    id: 'face_interrog_2',
    title: 'Pergunta com Pronome Interrogativo (QUEM? / ONDE?): Sobrancelhas Franzidas',
    category: 'interrogativas',
    difficulty: 'intermediario',
    level: 2,
    instruction: 'Franza as sobrancelhas (olhar focado) e projete o queixo levemente para a frente.',
    linguisticExplanation: 'Perguntas com pronomes interrogativos (Quem, Onde, O quê, Quando, Por quê) são marcadas gramaticalmente pelo franzir de sobrancelhas e inclinação da cabeça.',
    requiresHand: false,
    targetEyebrows: 'furrowed',
    holdDurationSeconds: 1.8,
    xpReward: 45,
    gemsReward: 20,
    tips: [
      'Aproxime as sobrancelhas como se estivesse investigando algo.',
      'Não é expressão de raiva, e sim de busca por informação específica.',
      'Mantenha a postura estável por 1.8 segundos.',
    ],
  },
  {
    id: 'face_interrog_3',
    title: 'Frase Interrogativa Completa: "ONDE?" com Rosto e Mão',
    category: 'interrogativas',
    difficulty: 'avancado',
    level: 3,
    instruction: 'Posicione sua mão com a palma para cima em oscilação e franza as sobrancelhas para perguntar "ONDE?".',
    linguisticExplanation: 'O sinal de "ONDE" só adquire valor de pergunta real quando acompanhado da expressão facial interrogativa de sobrancelhas franzidas.',
    requiresHand: true,
    requiredHandSignId: 'onde',
    targetEyebrows: 'furrowed',
    holdDurationSeconds: 2.0,
    xpReward: 60,
    gemsReward: 25,
    mascotRewardItemId: 'glasses_visor_holo',
    tips: [
      'Mantenha a mão em frente ao peito com a palma virada para cima.',
      'Ao mesmo tempo, franza as sobrancelhas mantendo o olhar na câmera.',
    ],
  },

  // ==========================================================================
  // 2. AFIRMAÇÃO E NEGAÇÃO (Movimentos de Cabeça e Expressão)
  // ==========================================================================
  {
    id: 'face_afirm_1',
    title: 'Afirmação Enfática: Aceno Positivo de Cabeça',
    category: 'afirmacao_negacao',
    difficulty: 'iniciante',
    level: 1,
    instruction: 'Acene com a cabeça para cima e para baixo de forma clara e assertiva.',
    linguisticExplanation: 'Em Libras, orações afirmativas frequentemente dispensam a palavra falada "sim"; o movimento contínuo da cabeça para cima e para baixo valida a afirmação da frase.',
    requiresHand: false,
    targetHeadMovement: 'nod_yes',
    holdDurationSeconds: 1.6,
    xpReward: 35,
    gemsReward: 15,
    tips: [
      'Faça o movimento vertical suave e ritmado.',
      'Mantenha os olhos voltados para a câmera.',
    ],
  },
  {
    id: 'face_negac_1',
    title: 'Negação Gramatical: Movimento Lateral de Cabeça',
    category: 'afirmacao_negacao',
    difficulty: 'iniciante',
    level: 2,
    instruction: 'Balance a cabeça de um lado para o outro (movimento de "não") com expressão séria.',
    linguisticExplanation: 'A negação em Libras pode ser realizada incorporando o movimento da cabeça de um lado para o outro sobre o verbo ou sinal (ex: "NÃO-SABER", "NÃO-TER").',
    requiresHand: false,
    targetHeadMovement: 'shake_no',
    holdDurationSeconds: 1.8,
    xpReward: 40,
    gemsReward: 15,
    tips: [
      'Gire a cabeça suavemente para a esquerda e para a direita.',
      'Sua expressão facial deve ser decidida.',
    ],
  },
  {
    id: 'face_negac_2',
    title: 'Negação com Mão e Rosto: "NÃO-GOSTAR"',
    category: 'afirmacao_negacao',
    difficulty: 'avancado',
    level: 3,
    instruction: 'Sinalize rejeição com a mão enquanto balança a cabeça negativamente.',
    linguisticExplanation: 'O sinal "NÃO-GOSTAR" une o desvio da mão no peito com a negação simultânea da cabeça e franzir de lábios.',
    requiresHand: true,
    requiredHandSignId: 'nao_gostar',
    targetHeadMovement: 'shake_no',
    targetEyebrows: 'furrowed',
    holdDurationSeconds: 2.0,
    xpReward: 65,
    gemsReward: 30,
    mascotRewardItemId: 'hat_tiara_emocoes',
    tips: [
      'Balance a cabeça em negação no mesmo instante em que sua mão faz o sinal.',
      'A sincronia entre cabeça e mãos é o segredo da fluência em Libras.',
    ],
  },

  // ==========================================================================
  // 3. INTENSIDADE E EMOÇÃO (Modificadores Não Manuais)
  // ==========================================================================
  {
    id: 'face_intens_1',
    title: 'Intensidade / Grandeza: Bochechas Cheias & Olhos Arregalados',
    category: 'intensidade_emocao',
    difficulty: 'intermediario',
    level: 2,
    instruction: 'Arregale os olhos e abra a boca expressivamente para indicar algo "ENORME" ou "MUITO".',
    linguisticExplanation: 'A intensidade em Libras não usa advérbios falados como "muito" sempre; a expressão facial amplia ou reduz o grau do sinal (ex: "CASA" vs "MANSÃO ENORME").',
    requiresHand: false,
    targetEyebrows: 'raised',
    targetMouth: 'open',
    holdDurationSeconds: 1.8,
    xpReward: 45,
    gemsReward: 20,
    tips: [
      'Abra bem os olhos e a boca para transmitir o tamanho surpreendente.',
      'Mantenha a expressão viva e estável.',
    ],
  },
  {
    id: 'face_intens_2',
    title: 'Esforço / Cansaço Extremo: Olhos Semicerrados e Lábios Tensos',
    category: 'intensidade_emocao',
    difficulty: 'intermediario',
    level: 2,
    instruction: 'Aperte os olhos levemente e aperte os lábios demonstrando grande esforço físico.',
    linguisticExplanation: 'Ao sinalizar "TRABALHAR-MUITO" ou "CANSADO", a contração dos músculos da face transmite a intensidade do desgaste físico.',
    requiresHand: false,
    targetEyebrows: 'furrowed',
    targetMouth: 'tense',
    holdDurationSeconds: 1.8,
    xpReward: 45,
    gemsReward: 20,
    tips: [
      'Franza a testa e comprima os lábios como quem ergue um peso.',
      'Mantenha a musculatura firme por 1.8s.',
    ],
  },
  {
    id: 'face_emocao_1',
    title: 'Expressão de Alegria Radiante: Sorriso Aberto e Olhar Vivo',
    category: 'intensidade_emocao',
    difficulty: 'iniciante',
    level: 1,
    instruction: 'Sorria amplamente para a câmera demonstrando alegria genuína.',
    linguisticExplanation: 'Sinais como "FELIZ", "ALEGRIA", "COMEMORAR" e "BEM-VINDO" exigem expressão facial congruente. Um sinal alegre com rosto neutro soa artificial ou contraditório.',
    requiresHand: false,
    targetMouth: 'smile',
    holdDurationSeconds: 1.6,
    xpReward: 35,
    gemsReward: 15,
    tips: [
      'Sorria de forma natural mostrando os dentes.',
      'Olhe diretamente na lente da câmera.',
    ],
  },

  // ==========================================================================
  // 4. COMBINADO: ROSTO + MÃOS EM SINAIS COMPLEXOS
  // ==========================================================================
  {
    id: 'face_comb_1',
    title: 'Mestre da Expressão: "BOM DIA!" com Sorriso Acolhedor',
    category: 'combinado_mao_rosto',
    difficulty: 'intermediario',
    level: 2,
    instruction: 'Faça a configuração de mão de saudação enquanto mantém um sorriso cordial e acolhedor.',
    linguisticExplanation: 'A saudação em Libras estabelece contato visual e afeto comunitário. A expressão amigável é indispensável.',
    requiresHand: true,
    requiredHandSignId: 'bom_dia',
    targetMouth: 'smile',
    holdDurationSeconds: 2.0,
    xpReward: 55,
    gemsReward: 25,
    tips: [
      'Posicione a mão no queixo e projete para frente.',
      'Mantenha o sorriso amigável durante todo o movimento.',
    ],
  },
  {
    id: 'face_comb_2',
    title: 'Desafio Supremo: "QUEM É VOCÊ?" (Interrogação Pessoal)',
    category: 'combinado_mao_rosto',
    difficulty: 'avancado',
    level: 3,
    instruction: 'Sinalize o pronome enquanto franze as sobrancelhas e projeta levemente a cabeça para frente.',
    linguisticExplanation: 'A pergunta direta exige alta sincronização motora entre a mão apontada e a expressão não manual de dúvida.',
    requiresHand: true,
    requiredHandSignId: 'letra_l',
    targetEyebrows: 'furrowed',
    holdDurationSeconds: 2.2,
    xpReward: 70,
    gemsReward: 35,
    mascotRewardItemId: 'glasses_mascara_expressiva',
    tips: [
      'Franza as sobrancelhas sem tensionar os ombros.',
      'Sustente a pose por mais de 2 segundos para validar a mestria.',
    ],
  },
];
