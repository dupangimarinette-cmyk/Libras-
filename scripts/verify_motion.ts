// Verificação do reconhecimento em movimento com mãos sintéticas.
// Rodar: node --experimental-transform-types --no-warnings scripts/verify_motion.ts   (ou: npx tsx scripts/verify_motion.ts)
import assert from 'assert';
import { MotionBuffer, buildMotionTemplate, evaluateMotion, MATCH_THRESHOLD } from '../src/services/motionRecognizer.ts';

type LM = { x: number; y: number; z: number };
// mão base (tamanho pulso->dedo médio base = 0.1)
const BASE: [number, number][] = [
  [0, 0], [-0.05, -0.04], [-0.08, -0.07], [-0.1, -0.1], [-0.12, -0.13],
  [-0.04, -0.1], [-0.04, -0.15], [-0.04, -0.19], [-0.04, -0.23],
  [0, -0.1], [0, -0.16], [0, -0.21], [0, -0.26],
  [0.04, -0.1], [0.04, -0.15], [0.04, -0.19], [0.04, -0.22],
  [0.08, -0.09], [0.08, -0.13], [0.08, -0.16], [0.08, -0.19],
];
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
function hand(cx: number, cy: number, closed = 0, noise = 0, sz = 1): LM[] {
  return BASE.map(([x, y], i) => {
    const tip = i >= 4 && [4, 8, 12, 16, 20].includes(i) ? 1 : [3, 7, 11, 15, 19, 2, 6, 10, 14, 18].includes(i) ? 0.5 : 0;
    const k = 1 - 0.6 * closed * (tip ? 1 : 0.4);
    return { x: cx + x * sz * k + noise * rnd(), y: cy + y * sz * k + noise * rnd(), z: 0 };
  });
}
type Path = (u: number) => { cx: number; cy: number; closed: number };
const sweepUp: Path = (u) => ({ cx: 0.5, cy: 0.8 - 0.3 * u, closed: 0 });
const sweepDown: Path = (u) => ({ cx: 0.5, cy: 0.5 + 0.3 * u, closed: 0 });
const circle: Path = (u) => ({ cx: 0.5 + 0.12 * Math.sin(2 * Math.PI * u), cy: 0.6 - 0.12 * Math.cos(2 * Math.PI * u) + 0.12, closed: 0 });
const wave: Path = (u) => ({ cx: 0.5 + 0.1 * Math.sin(4 * Math.PI * u), cy: 0.6, closed: 0 });
const openClose: Path = (u) => ({ cx: 0.5, cy: 0.6, closed: u });
const still: Path = () => ({ cx: 0.5, cy: 0.6, closed: 0 });

function record(path: Path, o: { ms?: number; fps?: number; noise?: number; dx?: number; dy?: number; sz?: number; idleBefore?: number; flip?: boolean } = {}) {
  const { ms = 2000, fps = 25, noise = 0.003, dx = 0, dy = 0, sz = 1, idleBefore = 0, flip = false } = o;
  const buf = new MotionBuffer();
  let t = 1000;
  for (let i = 0; i < (idleBefore * fps) / 1000; i++, t += 1000 / fps) buf.push(t, hand(0.5 + dx, path(0).cy + dy, path(0).closed, noise, sz));
  const n = Math.round((ms * fps) / 1000);
  const startT = t;
  for (let i = 0; i <= n; i++, t += 1000 / fps) {
    const p = path(i / n);
    const p0 = path(0); // quem está mais perto da câmera também faz o gesto maior na tela
    let h = hand(p0.cx + (p.cx - p0.cx) * sz + dx, p0.cy + (p.cy - p0.cy) * sz + dy, p.closed, noise, sz);
    if (flip) h = h.map((q) => ({ ...q, x: 1 - q.x }));
    buf.push(t, h);
  }
  return { buf, startT, endT: t - 1000 / fps };
}

const rec = (p: Path) => { const r = record(p); const tpl = buildMotionTemplate(r.buf.since(r.startT))!; assert(tpl, 'template'); return tpl; };
const score = (tpl: any, p: Path, o: any = {}) => { const r = record(p, o); return evaluateMotion(r.buf, tpl, r.endT).score; };
const out: Record<string, number> = {};
const show = (k: string, v: number) => { out[k] = v; };

const tUp = rec(sweepUp), tCircle = rec(circle), tWave = rec(wave), tOC = rec(openClose), tStill = rec(still);
assert(tUp.isDynamic && tCircle.isDynamic && tWave.isDynamic && tOC.isDynamic, 'dinâmicos');
assert(!tStill.isDynamic, 'parado não é dinâmico');
assert(tUp.points.length === 24 && JSON.stringify(tUp).length < 20000, 'tamanho do template');

// repetição correta (ruído, posição diferente, distância da câmera diferente, mais rápido/lento, parada antes)
show('mesmo sinal', score(tUp, sweepUp));
show('outra posição na tela', score(tUp, sweepUp, { dx: 0.15, dy: -0.1 }));
show('mão maior (mais perto)', score(tUp, sweepUp, { sz: 1.5 }));
show('30% mais rápido', score(tUp, sweepUp, { ms: 1400 }));
show('40% mais lento', score(tUp, sweepUp, { ms: 2800 }));
show('com mão parada antes', score(tUp, sweepUp, { idleBefore: 1200 }));
show('círculo repetido', score(tCircle, circle));
show('onda repetida', score(tWave, wave));
show('abrir-fechar repetido', score(tOC, openClose));
show('espelhado (outra mão)', score(tUp, sweepUp, { flip: true }));
// sinais errados
show('sinal errado: descer em vez de subir', score(tUp, sweepDown));
show('sinal errado: círculo em vez de subir', score(tUp, circle));
show('sinal errado: onda em vez de círculo', score(tCircle, wave));
show('sinal errado: parado em vez de subir', score(tUp, still));
show('sinal errado: parado em vez de círculo', score(tCircle, still));
show('sinal errado: subir em vez de abrir-fechar', score(tOC, sweepUp));
show('sinal errado: abrir-fechar em vez de subir', score(tUp, openClose));
console.table(out);

for (const k of ['mesmo sinal', 'outra posição na tela', 'mão maior (mais perto)', '30% mais rápido', '40% mais lento', 'com mão parada antes', 'círculo repetido', 'onda repetida', 'abrir-fechar repetido', 'espelhado (outra mão)'])
  assert(out[k] >= MATCH_THRESHOLD, `${k} deveria passar (${out[k]})`);
for (const k of Object.keys(out).filter((k) => k.startsWith('sinal errado')))
  assert(out[k] < MATCH_THRESHOLD - 15, `${k} deveria falhar (${out[k]})`);

// sem mão / poucos quadros
const empty = new MotionBuffer();
assert.equal(evaluateMotion(empty, tUp, 5000).score, 0);
// buraco longo sem mão invalida a gravação
const gap = new MotionBuffer(); for (let i = 0; i < 10; i++) gap.push(1000 + i * 40, hand(0.5, 0.5)); for (let i = 0; i < 10; i++) gap.push(3000 + i * 40, hand(0.5, 0.5));
assert.equal(buildMotionTemplate(gap.since(0)), null);
console.log('OK: reconhecimento em movimento verificado');
