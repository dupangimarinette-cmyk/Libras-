import type { Landmark } from './handTracker';
import type { MotionTemplate } from '../types/libras';

/**
 * RECONHECIMENTO DE SINAIS EM MOVIMENTO
 *
 * Em vez de comparar UM quadro parado, guardamos a trajetória da mão ao longo do tempo:
 *  - posição da palma (relativa ao ponto onde o sinal começou e dividida pelo tamanho da mão,
 *    então não importa onde a pessoa está na tela nem a distância da câmera);
 *  - formato da mão em cada instante (21 pontos relativos ao pulso, também normalizados).
 * A trajetória é reamostrada em N pontos uniformes no tempo e comparada com DTW
 * (Dynamic Time Warping), que tolera fazer o sinal mais rápido ou mais devagar.
 * Também testa a versão espelhada (canhotos / sinal ensinado por outra pessoa).
 */

export const MOTION_POINTS = 24;            // pontos por trajetória
const POS_WEIGHT = 1.0;                      // peso da posição da palma no custo
const SHAPE_WEIGHT = 1.6;                    // peso do formato da mão no custo
const BAND = 5;                              // faixa de Sakoe-Chiba (quanto o ritmo pode variar)
export const MIN_FRAMES = 8;
export const MAX_GAP_MS = 600;               // buraco máximo sem mão detectada
export const DYNAMIC_PATH_MIN = 0.8;         // trajetória mínima (em "tamanhos de mão") para contar como movimento
export const DYNAMIC_SHAPE_MIN = 0.8;        // ou mudança acumulada de formato da mão
export const MATCH_THRESHOLD = 72;           // nota mínima (0-100) para aceitar o sinal em movimento

export interface MotionFrame {
  t: number; // ms
  lm: Landmark[];
}

const PALM_IDS = [0, 5, 9, 13, 17];

function palmCenter(lm: Landmark[]) {
  let x = 0;
  let y = 0;
  for (const i of PALM_IDS) {
    x += lm[i].x;
    y += lm[i].y;
  }
  return { x: x / PALM_IDS.length, y: y / PALM_IDS.length };
}

function handSize(lm: Landmark[]): number {
  const a = lm[0];
  const b = lm[9];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function median(values: number[]): number {
  const s = [...values].sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)];
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Buffer circular com os últimos quadros em que a mão foi vista. */
export class MotionBuffer {
  private frames: MotionFrame[] = [];
  constructor(private maxMs = 6000) {}

  push(t: number, lm: Landmark[] | null) {
    if (lm && lm.length >= 21) {
      this.frames.push({ t, lm: lm.map((p) => ({ x: p.x, y: p.y, z: p.z })) });
    }
    const cutoff = t - this.maxMs;
    while (this.frames.length && this.frames[0].t < cutoff) this.frames.shift();
  }

  clear() {
    this.frames = [];
  }

  /** Quadros dos últimos `ms` milissegundos até `now`. */
  window(ms: number, now: number): MotionFrame[] {
    const from = now - ms;
    return this.frames.filter((f) => f.t >= from && f.t <= now);
  }

  /** Quadros desde o instante `from`. */
  since(from: number): MotionFrame[] {
    return this.frames.filter((f) => f.t >= from);
  }

  get length() {
    return this.frames.length;
  }
}

function hasBigGap(frames: MotionFrame[], startT?: number, endT?: number): boolean {
  if (startT !== undefined && frames[0].t - startT > MAX_GAP_MS) return true;
  if (endT !== undefined && endT - frames[frames.length - 1].t > MAX_GAP_MS) return true;
  for (let i = 1; i < frames.length; i++) if (frames[i].t - frames[i - 1].t > MAX_GAP_MS) return true;
  return false;
}

interface RawPoint {
  c: [number, number];
  s: number[]; // 42
}

/** Converte quadros em N pontos uniformes no tempo (ou null se não der). */
function resample(frames: MotionFrame[], startT?: number, endT?: number): { pts: RawPoint[]; durationMs: number } | null {
  if (frames.length < MIN_FRAMES) return null;
  if (hasBigGap(frames, startT, endT)) return null;
  const scale = median(frames.map((f) => handSize(f.lm)));
  if (!(scale > 1e-4)) return null;

  const t0 = frames[0].t;
  const t1 = frames[frames.length - 1].t;
  const durationMs = t1 - t0;
  if (durationMs < 300) return null;

  const origin = palmCenter(frames[0].lm);
  const raw: RawPoint[] = frames.map((f) => {
    const c = palmCenter(f.lm);
    const w = f.lm[0];
    const s: number[] = [];
    for (let i = 0; i < 21; i++) {
      s.push((f.lm[i].x - w.x) / scale, (f.lm[i].y - w.y) / scale);
    }
    return { c: [(c.x - origin.x) / scale, (c.y - origin.y) / scale], s };
  });

  // Suaviza o tremor do rastreador (média móvel de 5 quadros) para ele não parecer "movimento".
  const sm: RawPoint[] = raw.map((_, i) => {
    const lo = Math.max(0, i - 2);
    const hi = Math.min(raw.length - 1, i + 2);
    const cnt = hi - lo + 1;
    const c: [number, number] = [0, 0];
    const s = new Array(raw[i].s.length).fill(0);
    for (let k = lo; k <= hi; k++) {
      c[0] += raw[k].c[0] / cnt;
      c[1] += raw[k].c[1] / cnt;
      for (let q = 0; q < s.length; q++) s[q] += raw[k].s[q] / cnt;
    }
    return { c, s };
  });

  const pts: RawPoint[] = [];
  let j = 0;
  for (let k = 0; k < MOTION_POINTS; k++) {
    const t = t0 + (durationMs * k) / (MOTION_POINTS - 1);
    while (j < frames.length - 2 && frames[j + 1].t < t) j++;
    const a = frames[j];
    const b = frames[j + 1];
    const span = b.t - a.t || 1;
    const u = Math.min(1, Math.max(0, (t - a.t) / span));
    const ra = sm[j];
    const rb = sm[j + 1];
    pts.push({
      c: [ra.c[0] + (rb.c[0] - ra.c[0]) * u, ra.c[1] + (rb.c[1] - ra.c[1]) * u],
      s: ra.s.map((v, i) => v + (rb.s[i] - v) * u),
    });
  }
  return { pts, durationMs };
}

function stats(pts: RawPoint[]) {
  let pathLength = 0;
  let shapeTravel = 0;
  for (let i = 1; i < pts.length; i++) {
    pathLength += Math.hypot(pts[i].c[0] - pts[i - 1].c[0], pts[i].c[1] - pts[i - 1].c[1]);
    let d = 0;
    for (let k = 0; k < pts[i].s.length; k++) d += (pts[i].s[k] - pts[i - 1].s[k]) ** 2;
    shapeTravel += Math.sqrt(d) / Math.sqrt(21);
  }
  return { pathLength, shapeTravel };
}

/** Cria o "gabarito" de movimento que é salvo junto com o sinal ensinado. */
export function buildMotionTemplate(frames: MotionFrame[], startT?: number, endT?: number): MotionTemplate | null {
  const r = resample(frames, startT, endT);
  if (!r) return null;
  const { pathLength, shapeTravel } = stats(r.pts);
  return {
    v: 1,
    durationMs: Math.round(r.durationMs),
    pathLength: round3(pathLength),
    shapeTravel: round3(shapeTravel),
    isDynamic: pathLength >= DYNAMIC_PATH_MIN || shapeTravel >= DYNAMIC_SHAPE_MIN,
    points: r.pts.map((p) => [round3(p.c[0]), round3(p.c[1]), ...p.s.map(round3)]),
  };
}

function toRaw(points: number[][]): RawPoint[] {
  return points.map((p) => ({ c: [p[0], p[1]], s: p.slice(2) }));
}

function mirror(pts: RawPoint[]): RawPoint[] {
  return pts.map((p) => ({ c: [-p.c[0], p.c[1]], s: p.s.map((v, i) => (i % 2 === 0 ? -v : v)) }));
}

function pointCost(a: RawPoint, b: RawPoint): number {
  const pos = Math.hypot(a.c[0] - b.c[0], a.c[1] - b.c[1]);
  let d = 0;
  for (let k = 0; k < a.s.length; k++) d += (a.s[k] - b.s[k]) ** 2;
  const shape = Math.sqrt(d / 21);
  return POS_WEIGHT * pos + SHAPE_WEIGHT * shape;
}

/** DTW com faixa; devolve custo médio por passo do caminho. */
export function dtwCost(a: RawPoint[], b: RawPoint[], band = BAND): number {
  const n = a.length;
  const m = b.length;
  const INF = 1e9;
  const D: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(INF));
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  D[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    const lo = Math.max(1, i - band);
    const hi = Math.min(m, i + band);
    for (let j = lo; j <= hi; j++) {
      const c = pointCost(a[i - 1], b[j - 1]);
      let best = D[i - 1][j - 1];
      let len = L[i - 1][j - 1];
      if (D[i - 1][j] < best) {
        best = D[i - 1][j];
        len = L[i - 1][j];
      }
      if (D[i][j - 1] < best) {
        best = D[i][j - 1];
        len = L[i][j - 1];
      }
      D[i][j] = best + c;
      L[i][j] = len + 1;
    }
  }
  return D[n][m] >= INF ? INF : D[n][m] / L[n][m];
}

/** Custo médio -> nota 0..100. Calibrado com os testes de scripts/verify_motion.ts. */
export function costToScore(cost: number): number {
  return Math.max(0, Math.min(100, Math.round(100 * Math.exp(-cost / 0.35))));
}

export interface MotionEvaluation {
  score: number;       // 0-100
  isMatch: boolean;
  mirrored: boolean;
  liveIsDynamic: boolean;
  advice: string;
}

const WINDOW_SCALES = [0.7, 0.85, 1, 1.2, 1.45];

/**
 * Compara os últimos instantes da câmera com o gabarito gravado.
 * Testa janelas de durações diferentes (a pessoa pode ser mais rápida/lenta) e a versão espelhada.
 */
export function evaluateMotion(buffer: MotionBuffer, template: MotionTemplate, now: number): MotionEvaluation {
  const tpl = toRaw(template.points);
  const tplMirror = mirror(tpl);
  let bestCost = Infinity;
  let bestMirrored = false;
  let bestStats = { pathLength: 0, shapeTravel: 0 };
  let sawWindow = false;

  for (const sc of WINDOW_SCALES) {
    const ms = template.durationMs * sc;
    const frames = buffer.window(ms, now);
    const r = resample(frames, now - ms, now);
    if (!r) continue;
    sawWindow = true;
    const c1 = dtwCost(r.pts, tpl);
    const c2 = dtwCost(r.pts, tplMirror);
    const c = Math.min(c1, c2);
    if (c < bestCost) {
      bestCost = c;
      bestMirrored = c2 < c1;
      bestStats = stats(r.pts);
    }
  }

  if (!sawWindow) {
    return { score: 0, isMatch: false, mirrored: false, liveIsDynamic: false, advice: 'Mostre a mão na câmera e faça o movimento do sinal.' };
  }

  let score = costToScore(bestCost);
  const liveIsDynamic = bestStats.pathLength >= DYNAMIC_PATH_MIN * 0.5 || bestStats.shapeTravel >= DYNAMIC_SHAPE_MIN * 0.5;

  // Mão parada nunca vale como sinal em movimento.
  if (template.isDynamic && !liveIsDynamic) score = Math.min(score, 35);

  let advice = 'Movimento reconhecido!';
  if (score < MATCH_THRESHOLD) {
    const ratio = template.pathLength > 0.05 ? bestStats.pathLength / template.pathLength : 1;
    if (template.isDynamic && !liveIsDynamic) advice = 'Faça o movimento do sinal: a mão está parada.';
    else if (template.pathLength > 0.3 && ratio < 0.6) advice = 'Faça o movimento mais amplo, até o fim do trajeto.';
    else if (template.pathLength > 0.3 && ratio > 1.7) advice = 'Faça um movimento menor e mais controlado.';
    else if (bestStats.shapeTravel > template.shapeTravel * 1.8 + 0.5) advice = 'Mantenha a configuração da mão firme durante o movimento.';
    else advice = 'Siga a trajetória e o ritmo do sinal gravado.';
  }

  return { score, isMatch: score >= MATCH_THRESHOLD, mirrored: bestMirrored, liveIsDynamic, advice };
}
