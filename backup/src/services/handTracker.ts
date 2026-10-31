import { LibrasSign, ARTrackingState } from '../types/libras';

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Distance helper in 2D normalized plane
export function dist2D(a: Landmark, b: Landmark): number {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Connections between hand landmarks for AR skeleton drawing
export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base
  [5, 9], [9, 13], [13, 17],
];

export interface FingerAnalysis {
  thumb: boolean;
  index: boolean;
  middle: boolean;
  ring: boolean;
  pinky: boolean;
  handScale: number;
  thumbSpread: number;
  indexSpread: number;
  pinchDist: number;
  handFacing: 'camera' | 'self' | 'side';
  wrist: Landmark;
  thumbTip: Landmark;
  indexTip: Landmark;
  middleTip: Landmark;
  ringTip: Landmark;
  pinkyTip: Landmark;
}

/**
 * Robust scale-invariant & angle-tolerant anatomical finger analysis
 * Evaluates finger extension even under camera perspective foreshortening
 */
export function analyzeFingers(landmarks: Landmark[]): FingerAnalysis {
  const wrist = landmarks[0];
  const thumbCmc = landmarks[1];
  const thumbMcp = landmarks[2];
  const thumbIp = landmarks[3];
  const thumbTip = landmarks[4];

  const indexMcp = landmarks[5];
  const indexPip = landmarks[6];
  const indexDip = landmarks[7];
  const indexTip = landmarks[8];

  const middleMcp = landmarks[9];
  const middlePip = landmarks[10];
  const middleDip = landmarks[11];
  const middleTip = landmarks[12];

  const ringMcp = landmarks[13];
  const ringPip = landmarks[14];
  const ringDip = landmarks[15];
  const ringTip = landmarks[16];

  const pinkyMcp = landmarks[17];
  const pinkyPip = landmarks[18];
  const pinkyDip = landmarks[19];
  const pinkyTip = landmarks[20];

  // Palm scale: distance between wrist and base of middle finger
  const handScale = Math.max(0.06, dist2D(wrist, middleMcp));

  // --- Finger Extension Check (Index, Middle, Ring, Pinky) ---
  const checkExtended = (
    mcp: Landmark,
    pip: Landmark,
    dip: Landmark,
    tip: Landmark
  ): boolean => {
    const tipToMcp = dist2D(tip, mcp) / handScale;
    const pipToMcp = dist2D(pip, mcp) / handScale;
    const tipToWrist = dist2D(tip, wrist);
    const pipToWrist = dist2D(pip, wrist);
    const dipToWrist = dist2D(dip, wrist);

    // 1. Tip must be extended away from MCP compared to PIP
    const isLengthened = tipToMcp > pipToMcp * 1.15;
    // 2. Tip is farther from wrist than PIP or DIP
    const isOutward = tipToWrist >= pipToWrist * 0.98 || tipToWrist > dipToWrist * 0.96;
    // 3. Absolute extension relative to hand scale (forgiving for foreshortening)
    const isLongEnough = tipToMcp > 0.48;
    // 4. If curled in a fist, tip touches palm or MCP
    const isCurledInFist = tipToMcp < 0.40 && tipToWrist < pipToWrist * 0.95;

    return (isLengthened || isOutward) && isLongEnough && !isCurledInFist;
  };

  const indexExtended = checkExtended(indexMcp, indexPip, indexDip, indexTip);
  const middleExtended = checkExtended(middleMcp, middlePip, middleDip, middleTip);
  const ringExtended = checkExtended(ringMcp, ringPip, ringDip, ringTip);
  const pinkyExtended = checkExtended(pinkyMcp, pinkyPip, pinkyDip, pinkyTip);

  // --- Thumb Extension Check ---
  // Distance from thumb tip to index MCP and pinky MCP
  const thumbSpread = dist2D(thumbTip, indexMcp) / handScale;
  const thumbToPinky = dist2D(thumbTip, pinkyMcp) / handScale;
  const thumbToWrist = dist2D(thumbTip, wrist) / handScale;
  const thumbToMiddleMcp = dist2D(thumbTip, middleMcp) / handScale;

  // Folded on palm (like in letter B or fist S)
  const isFoldedAcrossPalm = thumbToMiddleMcp < 0.38 && thumbSpread < 0.35;
  // Thumb extended out (L, Y, A, open hand)
  const thumbExtended =
    (thumbSpread > 0.36 || thumbToPinky > 0.58 || thumbToWrist > 0.65) && !isFoldedAcrossPalm;

  // Spread between index and middle (for V sign)
  const indexSpread = dist2D(indexTip, middleTip) / handScale;

  // Pinch distance between thumb tip and index tip (for O or F sign)
  const pinchDist = dist2D(thumbTip, indexTip) / handScale;

  return {
    thumb: thumbExtended,
    index: indexExtended,
    middle: middleExtended,
    ring: ringExtended,
    pinky: pinkyExtended,
    handScale,
    thumbSpread,
    indexSpread,
    pinchDist,
    handFacing: 'camera',
    wrist,
    thumbTip,
    indexTip,
    middleTip,
    ringTip,
    pinkyTip,
  };
}

/**
 * Calculates match percentage, guidance, and hold progress for a specific Libras sign
 */
export function evaluateSignPose(
  landmarks: Landmark[] | null,
  sign: LibrasSign,
  previousHold: number,
  deltaMs: number,
  sensitivity: 'friendly' | 'strict' = 'friendly'
): ARTrackingState {
  if (!landmarks || landmarks.length < 21) {
    return {
      isHandDetected: false,
      currentAccuracy: 0,
      feedbackMessage: 'Aguardando mão na câmera... Mostre os sinais!',
      feedbackType: 'searching',
      fingersStatus: {
        thumb: false,
        index: false,
        middle: false,
        ring: false,
        pinky: false,
      },
      holdProgress: Math.max(0, previousHold - deltaMs * 0.04),
      isSuccess: false,
      landmarks: null,
    };
  }

  const analysis = analyzeFingers(landmarks);
  const rule = sign.poseRule;
  const issues: string[] = [];

  let matchedChecks = 0;
  let totalChecks = 5;

  // 1. Thumb check
  if (analysis.thumb === rule.thumbExtended) {
    matchedChecks += 1;
  } else {
    issues.push(rule.thumbExtended ? 'Abra o polegar' : 'Recolha o polegar na lateral');
  }

  // 2. Index check
  if (analysis.index === rule.indexExtended) {
    matchedChecks += 1;
  } else {
    issues.push(rule.indexExtended ? 'Estique o indicador' : 'Dobre o indicador');
  }

  // 3. Middle check
  if (analysis.middle === rule.middleExtended) {
    matchedChecks += 1;
  } else {
    issues.push(rule.middleExtended ? 'Estique o dedo médio' : 'Recolha o dedo médio');
  }

  // 4. Ring check
  if (analysis.ring === rule.ringExtended) {
    matchedChecks += 1;
  } else {
    issues.push(rule.ringExtended ? 'Estique o anelar' : 'Dobre o anelar');
  }

  // 5. Pinky check
  if (analysis.pinky === rule.pinkyExtended) {
    matchedChecks += 1;
  } else {
    issues.push(rule.pinkyExtended ? 'Erga o dedo mínimo' : 'Recolha o dedinho');
  }

  // Sign-specific heuristics for iconic Libras signs
  if (sign.id === 'letra_o' || rule.thumbTouchIndex) {
    totalChecks += 2;
    if (analysis.pinchDist < 0.40) {
      matchedChecks += 2;
    } else {
      issues.unshift('Junte a ponta do polegar com o indicador (formando o O)');
    }
  }

  if (sign.id === 'letra_l') {
    totalChecks += 1;
    if (analysis.thumbSpread > 0.35 && analysis.index) {
      matchedChecks += 1;
    } else {
      issues.unshift('Abra bem o polegar em 90° formando a letra L');
    }
  }

  if (sign.id === 'letra_v' || rule.indexMiddleSpread) {
    totalChecks += 1;
    if (analysis.indexSpread > 0.14) {
      matchedChecks += 1;
    } else {
      issues.unshift('Separe o indicador do dedo médio (sinal em V)');
    }
  }

  if (sign.id === 'letra_y') {
    totalChecks += 1;
    if (analysis.thumb && analysis.pinky && !analysis.index && !analysis.middle) {
      matchedChecks += 1;
    }
  }

  if (sign.id === 'letra_a') {
    // Fist with thumb on side
    if (!analysis.index && !analysis.middle && !analysis.ring && !analysis.pinky) {
      matchedChecks += 1;
      totalChecks += 1;
    }
  }

  if (sign.id === 'letra_b') {
    // 4 straight fingers up
    if (analysis.index && analysis.middle && analysis.ring && analysis.pinky) {
      matchedChecks += 1;
      totalChecks += 1;
    }
  }

  // Base raw accuracy percentage (0 - 100)
  const rawAccuracy = Math.round((matchedChecks / totalChecks) * 100);

  // Friendly curve so real users feel encouraged and don't get frustrated
  const accuracy =
    sensitivity === 'friendly'
      ? Math.min(100, Math.round(rawAccuracy * 1.08))
      : rawAccuracy;

  let feedbackMessage = '';
  let feedbackType: ARTrackingState['feedbackType'] = 'adjust';

  const threshold = sensitivity === 'friendly' ? 60 : 72;

  if (accuracy >= 80) {
    feedbackType = 'perfect';
    feedbackMessage = 'Perfeito! Mantenha o sinal estável ✨';
  } else if (accuracy >= threshold) {
    feedbackType = 'good';
    feedbackMessage = issues.length > 0 ? issues[0] : 'Muito bem! Segure para confirmar!';
  } else {
    feedbackType = 'adjust';
    feedbackMessage = issues.length > 0 ? issues[0] : 'Posicione sua mão conforme o molde guia';
  }

  // Hold progress: 0.9s required hold in friendly mode
  const requiredSeconds = sensitivity === 'friendly' ? 0.9 : 1.3;
  let newHold = previousHold;

  if (accuracy >= threshold) {
    const increment = (deltaMs / (requiredSeconds * 1000)) * 100;
    newHold = Math.min(100, previousHold + increment);
  } else {
    newHold = Math.max(0, previousHold - (deltaMs / 600) * 100);
  }

  const isSuccess = newHold >= 100;

  return {
    isHandDetected: true,
    currentAccuracy: accuracy,
    feedbackMessage: isSuccess ? 'SINAL RECONHECIDO COM SUCESSO! 🎉' : feedbackMessage,
    feedbackType: isSuccess ? 'perfect' : feedbackType,
    fingersStatus: {
      thumb: analysis.thumb,
      index: analysis.index,
      middle: analysis.middle,
      ring: analysis.ring,
      pinky: analysis.pinky,
    },
    holdProgress: newHold,
    isSuccess,
    landmarks,
  };
}

/**
 * Draws the AR holographic skeleton and glow onto canvas
 */
export function drawARSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  theme: 'neon-cyber' | 'emerald' | 'gold-champion' | 'amethyst',
  accuracy: number
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  const colorMap = {
    'neon-cyber': {
      bone: accuracy >= 68 ? '#06b6d4' : '#38bdf8',
      joint: accuracy >= 68 ? '#22d3ee' : '#60a5fa',
      glow: accuracy >= 68 ? 'rgba(34, 211, 238, 0.5)' : 'rgba(96, 165, 250, 0.3)',
      perfectBone: '#10b981',
      perfectGlow: 'rgba(16, 185, 129, 0.7)',
    },
    emerald: {
      bone: '#10b981',
      joint: '#34d399',
      glow: 'rgba(16, 185, 129, 0.5)',
      perfectBone: '#059669',
      perfectGlow: 'rgba(5, 150, 105, 0.8)',
    },
    'gold-champion': {
      bone: '#f59e0b',
      joint: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.5)',
      perfectBone: '#eab308',
      perfectGlow: 'rgba(234, 179, 8, 0.8)',
    },
    amethyst: {
      bone: '#a855f7',
      joint: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.5)',
      perfectBone: '#9333ea',
      perfectGlow: 'rgba(147, 51, 234, 0.8)',
    },
  };

  const scheme = colorMap[theme] || colorMap['neon-cyber'];
  const boneColor = accuracy >= 75 ? scheme.perfectBone : scheme.bone;
  const glowColor = accuracy >= 75 ? scheme.perfectGlow : scheme.glow;

  ctx.save();

  // Draw Bones
  ctx.lineWidth = accuracy >= 75 ? 4.5 : 3;
  ctx.strokeStyle = boneColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = accuracy >= 75 ? 16 : 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];
    if (!p1 || !p2) return;

    ctx.beginPath();
    // Mirror webcam view
    ctx.moveTo((1 - p1.x) * width, p1.y * height);
    ctx.lineTo((1 - p2.x) * width, p2.y * height);
    ctx.stroke();
  });

  // Draw Joints
  landmarks.forEach((p, idx) => {
    const x = (1 - p.x) * width;
    const y = p.y * height;
    const isTip = [4, 8, 12, 16, 20].includes(idx);
    const radius = isTip ? 6.5 : idx === 0 ? 8 : 4.5;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isTip ? '#ffffff' : scheme.joint;
    ctx.fill();

    if (isTip) {
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, 2 * Math.PI);
      ctx.strokeStyle = boneColor;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  });

  ctx.restore();
}
