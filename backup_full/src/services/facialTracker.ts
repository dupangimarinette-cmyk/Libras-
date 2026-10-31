import { FacialTrackingState, HeadPoseData, HeadMovementType, EyebrowsState, MouthState } from '../types/libras';

export interface FaceLandmark2D {
  x: number;
  y: number;
}

export class FacialTracker {
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D | null;
  
  // Temporal history for gesture detection (nodding / shaking)
  private pitchHistory: { pitch: number; time: number }[] = [];
  private yawHistory: { yaw: number; time: number }[] = [];
  private smoothedYaw = 0;
  private smoothedPitch = 0;
  private smoothedRoll = 0;
  private smoothedEyebrowScore = 50;
  private smoothedMouthScore = 20;

  // Latch timers for dynamic gestures (nods, shakes)
  private lastNodTimestamp = 0;
  private lastShakeTimestamp = 0;

  // Adaptive baseline
  private baselineEyebrowRatio = 0.48;
  private framesSeen = 0;

  constructor() {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 160;
    this.offscreenCanvas.height = 120;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Evaluates face presence, head angles, eyebrow elevation, and mouth state from webcam feed or canvas/image
   */
  public analyzeFace(source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement): FacialTrackingState {
    const defaultState: FacialTrackingState = {
      isFaceDetected: false,
      confidence: 0,
      headPose: {
        yaw: 0,
        pitch: 0,
        roll: 0,
        movement: 'neutral',
        isNoddingYes: false,
        isShakingNo: false,
      },
      eyebrowsState: 'neutral',
      eyebrowRaiseScore: 50,
      mouthState: 'neutral',
      mouthOpenScore: 20,
      eyeBlink: { left: false, right: false },
      landmarks: null,
      feedbackMessage: 'Posicione seu rosto dentro do molde guia da câmera...',
      detectedExpressions: [],
    };

    if (!this.offscreenCtx) return defaultState;

    const isVideo = source instanceof HTMLVideoElement;
    if (isVideo && (source.readyState < 2 || !source.videoWidth || !source.videoHeight)) {
      return defaultState;
    }

    const w = this.offscreenCanvas.width;
    const h = this.offscreenCanvas.height;

    try {
      this.offscreenCtx.drawImage(source, 0, 0, w, h);
    } catch {
      return defaultState;
    }

    const imgData = this.offscreenCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let skinPixelCount = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;

    // Scan for face skin pixels with inclusive chrominance model
    for (let y = 6; y < h - 6; y += 2) {
      for (let x = 8; x < w - 8; x += 2) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const sum = r + g + b || 1;
        const normR = r / sum;
        const normG = g / sum;

        // Expanded skin color models supporting all tones, lighting and webcam variations
        const isSkin =
          (r > 30 && g > 20 && b > 14 && r >= b - 15 && normR >= 0.26 && normR <= 0.74 && normG >= 0.18 && normG <= 0.52) ||
          (r > 40 && g > 25 && b > 18 && Math.abs(r - g) < 110) ||
          (r > 20 && g > 15 && b > 10 && r > g && g >= b);

        if (isSkin) {
          skinPixelCount++;
          sumX += x;
          sumY += y;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Require face mass (lowered to 20 pixels for high tolerance)
    if (skinPixelCount < 20) {
      this.smoothedYaw *= 0.8;
      this.smoothedPitch *= 0.8;
      return defaultState;
    }

    this.framesSeen++;

    const faceCenterX = sumX / skinPixelCount;
    const faceCenterY = sumY / skinPixelCount;
    const faceWidth = Math.max(22, maxX - minX);
    const faceHeight = Math.max(26, maxY - minY);

    // Normalize coordinates to 0..1
    const normX = faceCenterX / w;
    const normY = faceCenterY / h;

    // Head Pitch: vertical displacement from camera center
    const rawPitch = ((faceCenterY - h * 0.45) / (h * 0.5)) * 45;
    this.smoothedPitch = this.smoothedPitch * 0.6 + rawPitch * 0.4;

    // Head Roll: tilt angle based on horizontal asymmetry
    const rawRoll = (normX - 0.5) * 35;
    this.smoothedRoll = this.smoothedRoll * 0.6 + rawRoll * 0.4;

    // Head Yaw: left vs right skin energy distribution
    let leftSkinEnergy = 0;
    let rightSkinEnergy = 0;
    const midX = faceCenterX;

    for (let y = Math.floor(minY); y < Math.floor(maxY); y += 3) {
      for (let x = Math.floor(minX); x < Math.floor(maxX); x += 3) {
        const idx = (y * w + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        if (x < midX) leftSkinEnergy += lum;
        else rightSkinEnergy += lum;
      }
    }

    const energyTotal = leftSkinEnergy + rightSkinEnergy || 1;
    const rawYaw = ((leftSkinEnergy - rightSkinEnergy) / energyTotal) * 110;
    this.smoothedYaw = this.smoothedYaw * 0.6 + rawYaw * 0.4;

    // Real dynamic Eyebrow location detection:
    const browScanTop = Math.max(0, Math.floor(minY + faceHeight * 0.05));
    const browScanBottom = Math.min(h - 1, Math.floor(minY + faceHeight * 0.48));
    const leftBrowX = Math.floor(faceCenterX - faceWidth * 0.24);
    const rightBrowX = Math.floor(faceCenterX + faceWidth * 0.24);

    let darkestBrowY = browScanTop;
    let minBrowLum = 99999;

    for (let sy = browScanTop; sy < browScanBottom; sy++) {
      let rowLum = 0;
      let count = 0;
      for (let sx = Math.max(0, leftBrowX - 8); sx < Math.min(w, rightBrowX + 8); sx += 2) {
        const idx = (sy * w + sx) * 4;
        rowLum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        count++;
      }
      const avgLum = count > 0 ? rowLum / count : 255;
      if (avgLum < minBrowLum) {
        minBrowLum = avgLum;
        darkestBrowY = sy;
      }
    }

    // Measure relative eyebrow height inside upper face
    // Higher eyebrow = lower darkestBrowY (closer to forehead top)
    const currentEyebrowRatio = (darkestBrowY - minY) / faceHeight;

    if (this.framesSeen <= 15) {
      this.baselineEyebrowRatio = this.baselineEyebrowRatio * 0.6 + currentEyebrowRatio * 0.4;
    } else {
      // Gentle drift adaptation towards natural face rest
      this.baselineEyebrowRatio = this.baselineEyebrowRatio * 0.998 + currentEyebrowRatio * 0.002;
    }

    // Ratio difference with responsive amplification
    const diff = (this.baselineEyebrowRatio - currentEyebrowRatio);
    let rawEyebrowScore = Math.min(100, Math.max(0, 50 + diff * 480));
    this.smoothedEyebrowScore = this.smoothedEyebrowScore * 0.55 + rawEyebrowScore * 0.45;

    let eyebrowsState: EyebrowsState = 'neutral';
    if (this.smoothedEyebrowScore >= 52 || diff > 0.012) {
      eyebrowsState = 'raised';
    } else if (this.smoothedEyebrowScore <= 48 || diff < -0.012) {
      eyebrowsState = 'furrowed';
    }

    // Dynamic Mouth aperture detection
    const mouthLevelY = minY + faceHeight * 0.72;
    const mouthBoxW = faceWidth * 0.38;
    const mouthBoxH = faceHeight * 0.18;
    const mStartX = Math.floor(faceCenterX - mouthBoxW / 2);
    const mStartY = Math.floor(mouthLevelY - mouthBoxH / 2);

    let mouthDarkness = 0;
    let mouthSampleCount = 0;

    for (let my = mStartY; my < mStartY + mouthBoxH; my++) {
      for (let mx = mStartX; mx < mStartX + mouthBoxW; mx++) {
        if (mx >= 0 && mx < w && my >= 0 && my < h) {
          const idx = (my * w + mx) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          mouthDarkness += lum;
          mouthSampleCount++;
        }
      }
    }

    const avgMouthLum = mouthSampleCount > 0 ? mouthDarkness / mouthSampleCount : 120;
    const rawMouthScore = Math.min(100, Math.max(0, (148 - avgMouthLum) * 1.25));
    this.smoothedMouthScore = this.smoothedMouthScore * 0.6 + rawMouthScore * 0.4;

    let mouthState: MouthState = 'neutral';
    if (this.smoothedMouthScore >= 40) {
      mouthState = 'open';
    } else if (this.smoothedMouthScore >= 22) {
      mouthState = 'smile';
    }

    // Dynamic Motion detection: Nodding (affirmation) vs Shaking (negation)
    const now = Date.now();
    this.pitchHistory.push({ pitch: this.smoothedPitch, time: now });
    this.yawHistory.push({ yaw: this.smoothedYaw, time: now });

    // Keep last 1200ms of head movement
    this.pitchHistory = this.pitchHistory.filter((p) => now - p.time < 1200);
    this.yawHistory = this.yawHistory.filter((y) => now - y.time < 1200);

    const detectedNod = this.detectRapidMovement(this.pitchHistory.map((p) => p.pitch), 2.8) || Math.abs(this.smoothedPitch) >= 7;
    const detectedShake = this.detectRapidMovement(this.yawHistory.map((y) => y.yaw), 2.8) || Math.abs(this.smoothedYaw) >= 8;

    if (detectedNod) {
      this.lastNodTimestamp = now;
    }
    if (detectedShake) {
      this.lastShakeTimestamp = now;
    }

    // Latch gestures for 1800ms so challenges have time to validate
    const isNoddingYes = (now - this.lastNodTimestamp) < 1800;
    const isShakingNo = (now - this.lastShakeTimestamp) < 1800;

    let movement: HeadMovementType = 'neutral';
    if (isNoddingYes) movement = 'nod_yes';
    else if (isShakingNo) movement = 'shake_no';
    else if (this.smoothedRoll > 12) movement = 'tilt_right';
    else if (this.smoothedRoll < -12) movement = 'tilt_left';

    // Key 12 landmarks for holographic overlay
    const eyeLevelY = minY + faceHeight * 0.38;
    const noseY = minY + faceHeight * 0.52;
    const browLevelY = darkestBrowY;

    const landmarks = [
      // 0: Chin / Jaw center
      { x: normX, y: (maxY - faceHeight * 0.04) / h },
      // 1: Left Jaw
      { x: (minX + faceWidth * 0.12) / w, y: (minY + faceHeight * 0.74) / h },
      // 2: Right Jaw
      { x: (maxX - faceWidth * 0.12) / w, y: (minY + faceHeight * 0.74) / h },
      // 3: Nose Tip
      { x: normX, y: noseY / h },
      // 4: Left Eye Center
      { x: (faceCenterX - faceWidth * 0.22) / w, y: eyeLevelY / h },
      // 5: Right Eye Center
      { x: (faceCenterX + faceWidth * 0.22) / w, y: eyeLevelY / h },
      // 6: Left Eyebrow (Inner)
      { x: (faceCenterX - faceWidth * 0.12) / w, y: browLevelY / h },
      // 7: Left Eyebrow (Outer)
      { x: (faceCenterX - faceWidth * 0.32) / w, y: browLevelY / h },
      // 8: Right Eyebrow (Inner)
      { x: (faceCenterX + faceWidth * 0.12) / w, y: browLevelY / h },
      // 9: Right Eyebrow (Outer)
      { x: (faceCenterX + faceWidth * 0.32) / w, y: browLevelY / h },
      // 10: Mouth Center Upper
      { x: normX, y: (mouthLevelY - 2) / h },
      // 11: Mouth Center Lower
      { x: normX, y: (mouthLevelY + (mouthState === 'open' ? 4 : 2)) / h },
    ];

    // Detected expressions tag list
    const detectedExpressions: string[] = [];
    if (eyebrowsState === 'raised') detectedExpressions.push('Sobrancelhas Levantadas (Interrogativa)');
    if (eyebrowsState === 'furrowed') detectedExpressions.push('Sobrancelhas Franzidas (Intensidade/Foco)');
    if (isNoddingYes) detectedExpressions.push('Aceno de Afirmação (Cabeça)');
    if (isShakingNo) detectedExpressions.push('Movimento de Negação (Cabeça)');
    if (mouthState === 'open') detectedExpressions.push('Boca Aberta / Expressão Marcada');
    if (mouthState === 'smile') detectedExpressions.push('Sorriso / Expressão Acolhedora');

    let feedbackMessage = 'Rosto detectado. Mantenha a expressão solicitada!';
    if (eyebrowsState === 'raised') feedbackMessage = 'Excelente! Sobrancelhas levantadas para interrogativa.';
    else if (eyebrowsState === 'furrowed') feedbackMessage = 'Muito bem! Sobrancelhas franzidas com foco.';
    else if (isNoddingYes) feedbackMessage = 'Aceno afirmativo detectado!';
    else if (isShakingNo) feedbackMessage = 'Movimento de negação com a cabeça detectado!';
    else if (mouthState === 'smile') feedbackMessage = 'Sorriso alegre detectado!';
    else if (mouthState === 'open') feedbackMessage = 'Expressão de intensidade detectada!';

    return {
      isFaceDetected: true,
      confidence: Math.min(99, Math.round(82 + (skinPixelCount / 300) * 17)),
      headPose: {
        yaw: Math.round(this.smoothedYaw),
        pitch: Math.round(this.smoothedPitch),
        roll: Math.round(this.smoothedRoll),
        movement,
        isNoddingYes,
        isShakingNo,
      },
      eyebrowsState,
      eyebrowRaiseScore: Math.round(this.smoothedEyebrowScore),
      mouthState,
      mouthOpenScore: Math.round(this.smoothedMouthScore),
      eyeBlink: { left: false, right: false },
      landmarks,
      feedbackMessage,
      detectedExpressions,
    };
  }

  /**
   * Detects rapid head oscillations (nods or shakes)
   */
  private detectRapidMovement(history: number[], threshold: number): boolean {
    if (history.length < 4) return false;
    const maxVal = Math.max(...history);
    const minVal = Math.min(...history);
    const range = maxVal - minVal;
    return range >= threshold;
  }

  /**
   * Manually calibrate current facial pose as baseline
   */
  public calibrateBaseline(): void {
    this.framesSeen = 0;
    this.smoothedPitch = 0;
    this.smoothedYaw = 0;
    this.smoothedRoll = 0;
    this.smoothedEyebrowScore = 50;
    this.smoothedMouthScore = 20;
    this.lastNodTimestamp = 0;
    this.lastShakeTimestamp = 0;
  }
}

export const facialTracker = new FacialTracker();
