/**
 * Glass Harp: a row of wine glasses, each holding a whole number of measures of water. Pour one into another and
 * the water runs until the first is empty or the second is full. In later rooms a spring fills a glass to the brim
 * and a basin takes the water away. A glass rings lower with every measure it holds: its note is a degree of a
 * pentatonic scale, counted down from its own empty note. Each glass wants a note, so a level is solved when every
 * glass with a wish holds exactly its measure. The positions are few enough to search them all.
 */
export type Glass = { cap: number; top: number; want: number | null };
export type Level = { glasses: Glass[]; start: number[]; spring?: boolean; basin?: boolean };
export type Move = { from: number; to: number }; // -1 is the spring, -2 the basin

/** Major pentatonic, from G3: degree 0 is the lowest note. */
const PENTA = [0, 2, 4, 7, 9];
export function noteHz(degree: number) { const o = Math.floor(degree / 5), s = PENTA[((degree % 5) + 5) % 5] + o * 12; return 196 * Math.pow(2, s / 12); }
export const NOTE_NAMES = ['G', 'A', 'B', 'D', 'E'];
export const noteName = (degree: number) => NOTE_NAMES[((degree % 5) + 5) % 5];
/** The note with its octave, as a musician would write it: G3, A3, B3, D4, E4, G4… */
export function noteLabel(degree: number) { const o = Math.floor(degree / 5), midi = 55 + PENTA[((degree % 5) + 5) % 5] + o * 12; return `${noteName(degree)}${Math.floor(midi / 12) - 1}`; }
/** The note a glass rings with `amount` measures in it. */
export const degree = (g: Glass, amount: number) => g.top - amount;

export function moves(l: Level): Move[] {
  const out: Move[] = [], n = l.glasses.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) out.push({ from: i, to: j });
  if (l.spring) for (let j = 0; j < n; j++) out.push({ from: -1, to: j });
  if (l.basin) for (let i = 0; i < n; i++) out.push({ from: i, to: -2 });
  return out;
}
/** Pour: returns the new amounts, or null if nothing would move. */
export function pour(l: Level, s: number[], m: Move): number[] | null {
  const g = l.glasses, t = s.slice();
  if (m.from === -1) { if (t[m.to] === g[m.to].cap) return null; t[m.to] = g[m.to].cap; return t; }
  if (m.to === -2) { if (!t[m.from]) return null; t[m.from] = 0; return t; }
  const k = Math.min(t[m.from], g[m.to].cap - t[m.to]);
  if (!k) return null;
  t[m.from] -= k; t[m.to] += k;
  return t;
}
export const solved = (l: Level, s: number[]) => l.glasses.every((g, i) => g.want === null || s[i] === g.want);
export const key = (s: number[]) => s.join(',');

/** Breadth-first from `from`: the fewest pours to a solved row, as a list of moves. */
export function solve(l: Level, from = l.start, limit = 400000): Move[] | null {
  if (solved(l, from)) return [];
  const prev = new Map<string, [string, Move] | null>([[key(from), null]]);
  let frontier = [from];
  const ms = moves(l);
  while (frontier.length && prev.size < limit) {
    const next: number[][] = [];
    for (const s of frontier) for (const m of ms) {
      const t = pour(l, s, m); if (!t) continue;
      const k = key(t); if (prev.has(k)) continue;
      prev.set(k, [key(s), m]);
      if (solved(l, t)) {
        const path: Move[] = []; let c: string | undefined = k;
        while (c && prev.get(c)) { const [p, mv]: [string, Move] = prev.get(c)!; path.unshift(mv); c = p; }
        return path;
      }
      next.push(t);
    }
    frontier = next;
  }
  return null;
}
/** Every position reachable from the start, with its distance. */
export function reach(l: Level) {
  const dist = new Map<string, number>([[key(l.start), 0]]);
  let frontier = [l.start], d = 0;
  const ms = moves(l);
  while (frontier.length) {
    d++;
    const next: number[][] = [];
    for (const s of frontier) for (const m of ms) { const t = pour(l, s, m); if (!t) continue; const k = key(t); if (dist.has(k)) continue; dist.set(k, d); next.push(t); }
    frontier = next;
  }
  return dist;
}
export function starsFor(pours: number, par: number) { return pours <= par ? 3 : pours <= par + 2 ? 2 : 1; }
