/**
 * Level generator. A level is a row of glasses of different sizes and a fixed amount of water (or a spring and a
 * basin). The generator explores every position, picks a target among those that take the right number of pours,
 * and keeps a level only if the wished-for notes are true tunings (not empty, not brimming, all different), par is
 * the true shortest, and the glasses' notes make a tune. The tune is written from the wished notes.
 * Run: npx esbuild tools/gen.ts --bundle --platform=node --format=esm --outfile=tools/.gen.mjs && node tools/.gen.mjs
 */
import fs from 'node:fs';
import { degree, key, reach, type Glass, type Level } from '../src/game/sim';

type T = { id: string; n: number; caps: [number, number]; wishes: number; spring: boolean; basin: boolean; par: [number, number]; full: number; seed: number };
const t = (id: string, n: number, caps: [number, number], wishes: number, spring: boolean, basin: boolean, par: [number, number], full: number, seed: number): T => ({ id, n, caps, wishes, spring, basin, par, full, seed });
const TEMPLATES: T[] = [
  t('a1', 2, [3, 7], 1, false, false, [1, 3], 1, 1), t('a2', 3, [3, 8], 1, false, false, [3, 4], 1, 2), t('a3', 3, [3, 8], 2, false, false, [4, 5], 1, 3), t('a4', 3, [3, 10], 2, false, false, [5, 6], 1, 4),
  t('a5', 3, [3, 10], 2, false, false, [6, 7], 1, 5), t('a6', 3, [4, 12], 2, false, false, [6, 8], 1, 6), t('a7', 3, [4, 12], 2, false, false, [6, 9], 1, 7), t('a8', 3, [4, 13], 2, false, false, [8, 11], 1, 8),
  t('b1', 4, [3, 9], 2, false, false, [4, 5], 1, 11), t('b2', 4, [3, 10], 3, false, false, [5, 6], 2, 12), t('b3', 4, [3, 10], 3, false, false, [6, 7], 1, 13), t('b4', 4, [3, 11], 3, false, false, [7, 8], 2, 14),
  t('b5', 4, [3, 11], 3, false, false, [7, 9], 2, 15), t('b6', 4, [3, 12], 3, false, false, [8, 10], 1, 16), t('b7', 4, [3, 12], 3, false, false, [9, 11], 2, 17), t('b8', 4, [3, 13], 3, false, false, [10, 13], 2, 18),
  t('c1', 3, [3, 9], 2, true, true, [4, 5], 0, 21), t('c2', 3, [3, 10], 2, true, true, [5, 6], 0, 22), t('c3', 4, [3, 10], 3, true, true, [6, 7], 0, 23), t('c4', 4, [3, 11], 3, true, true, [6, 8], 1, 24),
  t('c5', 4, [3, 11], 3, true, true, [7, 9], 0, 25), t('c6', 4, [3, 12], 3, true, true, [7, 10], 1, 26), t('c7', 5, [3, 12], 4, true, true, [8, 10], 0, 27), t('c8', 5, [3, 13], 4, true, true, [9, 12], 1, 28),
];
function rng(seed: number) { let s = Math.imul(seed + 0x9e3779b9, 2654435761) >>> 0 || 1; for (let i = 0; i < 8; i++) { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; } return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function attempt(T: T, rnd: () => number): (Level & { par: number; tune: number[] }) | null {
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const caps = new Set<number>(); while (caps.size < T.n) caps.add(ri(...T.caps));
  // glasses left to right in a pleasing order: largest at one end
  const cs = [...caps].sort((a, b) => b - a); if (rnd() < 0.5) cs.reverse();
  const glasses: Glass[] = cs.map((cap) => ({ cap, top: 16 - Math.floor(cap / 2), want: null }));
  // the water: the biggest glasses start full
  const order = cs.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
  const start = cs.map(() => 0); for (let k = 0; k < T.full; k++) start[order[k]] = cs[order[k]];
  const lv: Level = { glasses, start, ...(T.spring ? { spring: true } : {}), ...(T.basin ? { basin: true } : {}) };
  const dist = reach(lv);
  // candidate targets: positions at the far end of the par range
  const all = [...dist.entries()].map(([k, d]) => [k.split(',').map(Number), d] as [number[], number]);
  const cands = all.filter(([, d]) => d >= T.par[0] && d <= T.par[1]).sort((x, y) => y[1] - x[1] || rnd() - 0.5).map(([st]) => st);
  if (!cands.length) return null;
  for (let a = 0; a < 30; a++) {
    const s = cands[Math.min(cands.length - 1, Math.floor(Math.pow(rnd(), 2) * cands.length))];
    // which glasses have a wish: those holding a true tuning, not empty or brimming
    const able = s.map((v, i) => i).filter((i) => s[i] > 0 && s[i] < cs[i]);
    if (able.length < T.wishes) continue;
    const chosen = able.sort(() => rnd() - 0.5).slice(0, T.wishes);
    glasses.forEach((g, i) => (g.want = chosen.includes(i) ? s[i] : null));
    const notes = chosen.map((i) => degree(glasses[i], s[i]));
    if (new Set(notes).size < notes.length) continue;
    if (notes.some((d) => d < -2 || d > 16)) continue;
    if (chosen.every((i) => glasses[i].want === start[i])) continue;
    // par: the nearest position that satisfies every wish
    let par = Infinity; for (const [st, d] of all) if (glasses.every((g, i) => g.want === null || st[i] === g.want)) par = Math.min(par, d);
    if (par < T.par[0]) continue;
    // a short tune from the wished notes: rising, then falling home
    const byPitch = chosen.slice().sort((x, y) => degree(glasses[x], s[x]) - degree(glasses[y], s[y]));
    const tune = [...byPitch, ...byPitch.slice(0, -1).reverse()];
    void key;
    return { ...lv, glasses: glasses.map((g) => ({ ...g })), par, tune };
  }
  return null;
}

const out: Record<string, unknown> = {};
for (const T of TEMPLATES) {
  const rnd = rng(T.seed * 7919);
  let got = null, tries = 0;
  while (!got && tries < 20000) { tries++; got = attempt(T, rnd); }
  if (!got) { console.log(T.id, 'NONE'); continue; }
  out[T.id] = got;
  console.log(T.id, 'tries', tries, 'caps', got.glasses.map((g) => g.cap).join('/'), 'start', got.start.join('/'), 'want', got.glasses.map((g) => g.want ?? '-').join('/'), 'par', got.par);
}
fs.writeFileSync(new URL('../src/game/levels.json', import.meta.url), JSON.stringify(out) + '\n');
