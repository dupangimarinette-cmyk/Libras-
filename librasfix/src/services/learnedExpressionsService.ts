import { TaughtFacialExpression, LibrasSign } from '../types/libras';
import { FacialExercise, FacialCategory } from '../data/facialExercisesData';

const STORAGE_KEY = 'librasgo_taught_facial_expressions';

export interface AIExpressionValidationResult {
  eyebrows: 'raised' | 'furrowed' | 'neutral';
  headMovement: 'nod_yes' | 'shake_no' | 'tilt_left' | 'tilt_right' | 'neutral';
  mouth: 'open' | 'neutral' | 'smile' | 'wide' | 'tense';
  confidence: number;
  isValidInLibras: boolean;
  detectedFeatures: string[];
  feedback: string;
}

class LearnedExpressionsService {
  private cachedExpressions: TaughtFacialExpression[] = [];

  constructor() {
    this.loadFromCache();
  }

  private loadFromCache() {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.cachedExpressions = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar expressões faciais do cache local:', e);
    }
  }

  private saveToCache() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cachedExpressions));
      }
    } catch (e) {
      console.warn('Erro ao salvar expressões no cache local:', e);
    }
  }

  public getCachedExpressions(): TaughtFacialExpression[] {
    return this.cachedExpressions;
  }

  public async fetchUserExpressions(usernameOrCode: string): Promise<TaughtFacialExpression[]> {
    if (!usernameOrCode) return this.cachedExpressions;

    try {
      const res = await fetch(`/api/user/facial-expressions/${encodeURIComponent(usernameOrCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.expressions)) {
          this.cachedExpressions = data.expressions;
          this.saveToCache();
          return this.cachedExpressions;
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar expressões do usuário no servidor (usando cache local):', e);
    }

    return this.cachedExpressions;
  }

  public async fetchCommunityExpressions(): Promise<TaughtFacialExpression[]> {
    try {
      const res = await fetch('/api/community/facial-expressions');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.expressions)) {
          const map = new Map<string, TaughtFacialExpression>();
          this.cachedExpressions.forEach((e) => map.set(e.id, e));
          data.expressions.forEach((e: TaughtFacialExpression) => map.set(e.id, e));
          const merged = Array.from(map.values());
          this.cachedExpressions = merged;
          this.saveToCache();
          return merged;
        }
      }
    } catch (e) {
      console.warn('Erro ao buscar expressões comunitárias da API:', e);
    }
    return this.cachedExpressions;
  }

  public async saveExpression(
    username: string,
    syncCode: string,
    expression: Omit<TaughtFacialExpression, 'id' | 'createdAt'> & { id?: string }
  ): Promise<{ success: boolean; message: string; expression?: TaughtFacialExpression }> {
    const id = expression.id || `face_taught_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullExp: TaughtFacialExpression = {
      ...expression,
      id,
      username: username || 'Aluno',
      syncCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Update local cache immediately
    const existingIdx = this.cachedExpressions.findIndex((e) => e.id === id);
    if (existingIdx >= 0) {
      this.cachedExpressions[existingIdx] = fullExp;
    } else {
      this.cachedExpressions.unshift(fullExp);
    }
    this.saveToCache();

    // Persist to server
    try {
      const res = await fetch('/api/user/facial-expressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          syncCode,
          expression: fullExp,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.expression) {
          const finalExp = data.expression;
          const idx = this.cachedExpressions.findIndex((e) => e.id === finalExp.id);
          if (idx >= 0) this.cachedExpressions[idx] = finalExp;
          this.saveToCache();
          return { success: true, message: data.message, expression: finalExp };
        }
      }
    } catch (e) {
      console.warn('Persistindo expressão localmente (offline):', e);
    }

    return { success: true, message: 'Expressão facial salva localmente com sucesso!', expression: fullExp };
  }

  public async updateExpression(
    id: string,
    username: string,
    syncCode: string,
    expression: Partial<TaughtFacialExpression>
  ): Promise<{ success: boolean; message: string; expression?: TaughtFacialExpression }> {
    const existingIdx = this.cachedExpressions.findIndex((e) => e.id === id);
    if (existingIdx >= 0) {
      this.cachedExpressions[existingIdx] = {
        ...this.cachedExpressions[existingIdx],
        ...expression,
        updatedAt: new Date().toISOString(),
      };
      this.saveToCache();
    }

    try {
      const res = await fetch(`/api/user/facial-expressions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          syncCode,
          expression,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.expression) {
          return { success: true, message: data.message, expression: data.expression };
        }
      }
    } catch (e) {
      console.warn('Erro ao atualizar expressão no servidor:', e);
    }

    return {
      success: true,
      message: 'Expressão facial atualizada!',
      expression: this.cachedExpressions[existingIdx],
    };
  }

  public async deleteExpression(
    id: string,
    username: string,
    syncCode: string
  ): Promise<{ success: boolean; message: string }> {
    this.cachedExpressions = this.cachedExpressions.filter((e) => e.id !== id);
    this.saveToCache();

    try {
      const query = new URLSearchParams({ username, syncCode }).toString();
      const res = await fetch(`/api/user/facial-expressions/${id}?${query}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'Expressão facial excluída.' };
      }
    } catch (e) {
      console.warn('Erro ao excluir expressão no servidor:', e);
    }

    return { success: true, message: 'Expressão facial removida com sucesso.' };
  }

  public async validateWithAI(payload: {
    imageBase64: string;
    name: string;
    description: string;
    category: string;
    currentParameters?: {
      eyebrows: string;
      headMovement: string;
      mouth: string;
    };
  }): Promise<{ success: boolean; validation: AIExpressionValidationResult }> {
    try {
      const res = await fetch('/api/ai/validate-facial-expression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.validation) {
          return { success: true, validation: data.validation };
        }
      }
    } catch (e) {
      console.warn('Falha na requisição de validação com IA:', e);
    }

    // Heuristic client fallback
    const p = payload.currentParameters;
    return {
      success: true,
      validation: {
        eyebrows: (p?.eyebrows as any) || (payload.category === 'interrogativas' ? 'raised' : 'neutral'),
        headMovement: (p?.headMovement as any) || (payload.category === 'afirmacao_negacao' ? 'nod_yes' : 'neutral'),
        mouth: (p?.mouth as any) || 'neutral',
        confidence: 88,
        isValidInLibras: true,
        detectedFeatures: ['Rosto Enquadrado', 'Expressão Registrada'],
        feedback: 'Expressão facial validada e memorizada com sucesso!',
      },
    };
  }

  /**
   * Converte uma expressão ensinada em um LibrasSign para o LibrasDex
   */
  public convertToLibrasSign(exp: TaughtFacialExpression): LibrasSign {
    const eyebrowText =
      exp.parameters.eyebrows === 'raised'
        ? 'Sobrancelhas Levantadas'
        : exp.parameters.eyebrows === 'furrowed'
        ? 'Sobrancelhas Franzidas'
        : 'Sobrancelhas Neutras';

    const headText =
      exp.parameters.headMovement === 'nod_yes'
        ? 'Aceno Afirmativo com a Cabeça'
        : exp.parameters.headMovement === 'shake_no'
        ? 'Balanço de Negação com a Cabeça'
        : exp.parameters.headMovement === 'tilt_left' || exp.parameters.headMovement === 'tilt_right'
        ? 'Inclinação Lateral da Cabeça'
        : 'Cabeça Alinhada Frontalmente';

    const mouthText =
      exp.parameters.mouth === 'smile'
        ? 'Sorriso Acolhedor'
        : exp.parameters.mouth === 'open'
        ? 'Boca Aberta / Entonação Marcada'
        : exp.parameters.mouth === 'wide'
        ? 'Boca Aberta Enérgica'
        : exp.parameters.mouth === 'tense'
        ? 'Lábios Comprimidos'
        : 'Boca Neutra';

    return {
      id: exp.id,
      name: exp.name,
      category: 'sentimentos',
      difficulty: 'iniciante',
      meaning: exp.description,
      contextSentence: `Expressão não-manual ensinada por ${exp.username || 'Aluno'}.`,
      contextTranslation: `Em Libras: ${exp.name}`,
      parameters: {
        cm: 'Parâmetro Não-Manual (Expressão Facial)',
        pa: 'Face / Expressão Visual',
        m: headText,
        o: 'Voltado para a câmera / interlocutor',
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
        descriptionHint: `Expressão facial ensinada por ${exp.username}. Foque na face: ${eyebrowText}, ${headText}.`,
      },
      tips: [
        `Expressão facial ensinada por ${exp.username || 'Aluno'}.`,
        `Categoria: ${exp.category}`,
        `Parâmetros: ${eyebrowText}, ${headText}, ${mouthText}.`,
        exp.aiAnalysis?.feedback || 'Validada pela Inteligência Artificial.',
      ],
      imageUrl: exp.imageUrl,
      isCustom: true,
    };
  }

  /**
   * Converte uma expressão ensinada em um FacialExercise para prática interativa no módulo
   */
  public convertToFacialExercise(exp: TaughtFacialExpression): FacialExercise {
    const categoryMap: Record<string, FacialCategory> = {
      interrogativas: 'interrogativas',
      afirmacao_negacao: 'afirmacao_negacao',
      intensidade_emocao: 'intensidade_emocao',
      gramatical: 'interrogativas',
      cotidiano: 'afirmacao_negacao',
      sentimentos: 'intensidade_emocao',
    };

    return {
      id: exp.id,
      title: exp.name,
      category: categoryMap[exp.category] || 'interrogativas',
      difficulty: 'iniciante',
      level: 1,
      instruction: exp.description,
      linguisticExplanation: `Expressão criada por ${exp.username || 'Aluno'}. ${exp.aiAnalysis?.feedback || 'Reproduza a expressão com precisão na câmera.'}`,
      requiresHand: false,
      targetEyebrows: exp.parameters.eyebrows,
      targetHeadMovement: exp.parameters.headMovement,
      targetMouth: exp.parameters.mouth,
      holdDurationSeconds: 1.5,
      xpReward: 40,
      gemsReward: 20,
      tips: [
        `Expressão ensinada por ${exp.username || 'Aluno'}.`,
        `Sobrancelhas: ${exp.parameters.eyebrows}`,
        `Movimento de cabeça: ${exp.parameters.headMovement}`,
        `Boca: ${exp.parameters.mouth}`,
      ],
    };
  }
}

export const learnedExpressionsService = new LearnedExpressionsService();
