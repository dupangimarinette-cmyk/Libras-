import { TaughtSign, TaughtSignSample, FacialTrackingState } from '../types/libras';
import { Landmark } from './handTracker';
import { userFetch } from './userAuth';

const STORAGE_TAUGHT_SIGNS = 'librasgo_user_taught_signs';

export interface AISignEvaluationResult {
  confidence: number; // 0 - 100
  isMatch: boolean;
  handScore: number;
  faceScore: number;
  matchedSampleId?: string;
  feedbackAdvice: string;
  detectedFeatures: string[];
}

class AISignLearner {
  private cachedSigns: TaughtSign[] = [];

  constructor() {
    this.loadFromLocalCache();
  }

  private loadFromLocalCache() {
    try {
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_TAUGHT_SIGNS);
        if (raw) {
          this.cachedSigns = JSON.parse(raw);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar sinais ensinados do cache local:', e);
    }
  }

  private saveToLocalCache() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_TAUGHT_SIGNS, JSON.stringify(this.cachedSigns));
      }
    } catch {}
  }

  public async fetchUserSigns(usernameOrCode: string): Promise<TaughtSign[]> {
    if (!usernameOrCode) return this.cachedSigns;

    try {
      const res = await fetch(`/api/user/custom-signs/${encodeURIComponent(usernameOrCode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.signs)) {
          this.cachedSigns = data.signs;
          this.saveToLocalCache();
          return this.cachedSigns;
        }
      }
    } catch (e) {
      console.warn('Sincronização offline para sinais ensinados:', e);
    }

    return this.cachedSigns;
  }

  public getCachedSigns(): TaughtSign[] {
    return this.cachedSigns;
  }

  public async fetchCommunitySigns(): Promise<TaughtSign[]> {
    try {
      const res = await fetch('/api/community/taught-signs');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.signs)) {
          const signMap = new Map<string, TaughtSign>();
          // Combine locally cached signs with community signs
          this.cachedSigns.forEach((s) => signMap.set(s.id, s));
          data.signs.forEach((s: TaughtSign) => signMap.set(s.id, s));
          const merged = Array.from(signMap.values());
          this.cachedSigns = merged;
          this.saveToLocalCache();
          return merged;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar sinais da comunidade da API:', e);
    }
    return this.cachedSigns;
  }

  public async saveTaughtSign(
    username: string,
    syncCode: string,
    sign: {
      id?: string;
      name: string;
      meaning: string;
      category: string;
      contextSentence?: string;
      samples: TaughtSignSample[];
    }
  ): Promise<{ success: boolean; message: string; sign?: TaughtSign }> {
    const signPayload: TaughtSign = {
      id: sign.id || `taught_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username,
      name: sign.name.trim(),
      meaning: sign.meaning.trim(),
      category: sign.category || 'cotidiano',
      contextSentence: sign.contextSentence?.trim() || `Exemplo de uso prático ensinado para o sinal de ${sign.name}.`,
      samples: sign.samples || [],
      createdAt: new Date().toISOString(),
      practiceCount: 0,
      bestAccuracy: 0,
    };

    // Save locally immediately
    const existingIdx = this.cachedSigns.findIndex((s) => s.id === signPayload.id);
    if (existingIdx >= 0) {
      this.cachedSigns[existingIdx] = signPayload;
    } else {
      this.cachedSigns.unshift(signPayload);
    }
    this.saveToLocalCache();

    // Persist to shared database on cloud
    try {
      const res = await userFetch('/api/user/custom-signs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          syncCode,
          sign: signPayload,
        }),
      }, { username, syncCode });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { success: true, message: data.message || 'Sinal gravado e vinculado à sua conta com sucesso!', sign: data.sign || signPayload };
        }
      }
    } catch (err: any) {
      console.warn('Erro ao persistir sinal na nuvem, salvo em cache local:', err.message);
    }

    return {
      success: true,
      message: 'Sinal salvo com sucesso no seu dispositivo!',
      sign: signPayload,
    };
  }

  public async deleteTaughtSign(signId: string, username?: string, syncCode?: string): Promise<boolean> {
    this.cachedSigns = this.cachedSigns.filter((s) => s.id !== signId);
    this.saveToLocalCache();

    try {
      const query = new URLSearchParams();
      if (username) query.append('username', username);
      if (syncCode) query.append('syncCode', syncCode);

      const res = await userFetch(`/api/user/custom-signs/${encodeURIComponent(signId)}?${query.toString()}`, {
        method: 'DELETE',
      }, { username, syncCode });
      return res.ok;
    } catch {
      return true;
    }
  }

  /**
   * Evaluates live user performance against stored samples of a taught sign
   */
  public evaluateAgainstSign(
    currentLandmarks: Landmark[] | null,
    currentFace: FacialTrackingState | null,
    taughtSign: TaughtSign
  ): AISignEvaluationResult {
    if (!taughtSign || taughtSign.samples.length === 0) {
      return {
        confidence: 0,
        isMatch: false,
        handScore: 0,
        faceScore: 0,
        feedbackAdvice: 'Este sinal não possui amostras gravadas suficientes.',
        detectedFeatures: [],
      };
    }

    let bestSampleConfidence = 0;
    let bestHandScore = 0;
    let bestFaceScore = 0;
    let bestSampleId = taughtSign.samples[0].id;
    const adviceList: string[] = [];
    const detectedFeatures: string[] = [];

    for (const sample of taughtSign.samples) {
      let handScore = 100;
      let faceScore = 100;

      // 1. Hand Landmarks comparison
      if (sample.handLandmarks && sample.handLandmarks.length > 0) {
        if (!currentLandmarks || currentLandmarks.length === 0) {
          handScore = 0;
          adviceList.push('Posicione sua mão na frente da câmera');
        } else {
          // Calculate mean squared Euclidean distance between normalized landmarks
          const minLen = Math.min(sample.handLandmarks.length, currentLandmarks.length);
          let totalDist = 0;

          // Normalize relative to wrist landmark[0]
          const curWrist = currentLandmarks[0] || { x: 0.5, y: 0.5, z: 0 };
          const sampWrist = sample.handLandmarks[0] || { x: 0.5, y: 0.5, z: 0 };

          for (let i = 0; i < minLen; i++) {
            const curNormX = currentLandmarks[i].x - curWrist.x;
            const curNormY = currentLandmarks[i].y - curWrist.y;
            const sampNormX = sample.handLandmarks[i].x - sampWrist.x;
            const sampNormY = sample.handLandmarks[i].y - sampWrist.y;

            const dx = curNormX - sampNormX;
            const dy = curNormY - sampNormY;
            totalDist += Math.sqrt(dx * dx + dy * dy);
          }

          const avgDist = totalDist / minLen;
          handScore = Math.max(0, Math.min(100, Math.round(100 - avgDist * 320)));
        }
      }

      // 2. Facial Features comparison
      if (sample.facialFeatures) {
        if (!currentFace || !currentFace.isFaceDetected) {
          faceScore = 20;
          adviceList.push('Mantenha o rosto visível para a IA');
        } else {
          let fScore = 100;

          // Eyebrows
          if (sample.facialFeatures.eyebrowsState !== 'neutral') {
            if (currentFace.eyebrowsState === sample.facialFeatures.eyebrowsState) {
              fScore += 0;
              detectedFeatures.push(`Sobrancelhas ${sample.facialFeatures.eyebrowsState === 'raised' ? 'Levantadas' : 'Franzidas'} ✓`);
            } else {
              fScore -= 30;
              if (sample.facialFeatures.eyebrowsState === 'raised') {
                adviceList.push('Levante mais as sobrancelhas (expressão interrogativa)');
              } else {
                adviceList.push('Franza as sobrancelhas para dar intensidade');
              }
            }
          }

          // Head Movement
          if (sample.facialFeatures.headMovement !== 'neutral') {
            if (currentFace.headPose.movement === sample.facialFeatures.headMovement) {
              fScore += 0;
              detectedFeatures.push(`Movimento de Cabeça Correto ✓`);
            } else {
              fScore -= 35;
              if (sample.facialFeatures.headMovement === 'nod_yes') {
                adviceList.push('Faça o aceno de cabeça afirmativo');
              } else if (sample.facialFeatures.headMovement === 'shake_no') {
                adviceList.push('Gire a cabeça lateralmente em negação');
              }
            }
          }

          faceScore = Math.max(0, Math.min(100, fScore));
        }
      }

      // Weighted Total Confidence
      const hasHandRequirement = Boolean(sample.handLandmarks && sample.handLandmarks.length > 0);
      const hasFaceRequirement = Boolean(sample.facialFeatures && (sample.facialFeatures.eyebrowsState !== 'neutral' || sample.facialFeatures.headMovement !== 'neutral'));

      let sampleConfidence = 0;
      if (hasHandRequirement && hasFaceRequirement) {
        sampleConfidence = Math.round(handScore * 0.6 + faceScore * 0.4);
      } else if (hasHandRequirement) {
        sampleConfidence = handScore;
      } else if (hasFaceRequirement) {
        sampleConfidence = faceScore;
      } else {
        sampleConfidence = Math.round((handScore + faceScore) / 2);
      }

      if (sampleConfidence > bestSampleConfidence) {
        bestSampleConfidence = sampleConfidence;
        bestHandScore = handScore;
        bestFaceScore = faceScore;
        bestSampleId = sample.id;
      }
    }

    const isMatch = bestSampleConfidence >= 75;
    let feedbackAdvice = 'Excelente execução do sinal!';
    if (!isMatch) {
      if (adviceList.length > 0) {
        feedbackAdvice = adviceList[0];
      } else {
        feedbackAdvice = 'Ajuste a postura das mãos e a expressão facial para atingir o padrão gravado.';
      }
    }

    return {
      confidence: bestSampleConfidence,
      isMatch,
      handScore: bestHandScore,
      faceScore: bestFaceScore,
      matchedSampleId: bestSampleId,
      feedbackAdvice,
      detectedFeatures,
    };
  }
}

export const aiSignLearner = new AISignLearner();
