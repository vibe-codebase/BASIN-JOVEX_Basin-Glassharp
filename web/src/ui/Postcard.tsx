import { useEffect, useRef } from 'react';
import { area, below, bowl, canvas, GEMS, MOODS } from '../game/art';
import type { Level } from '../game/levels';
import { pour, solve } from '../game/sim';

const cache = new Map<string, HTMLCanvasElement>();
/** The level in miniature: its row of glasses on the table, at the start; once won, holding their tuned water. */
function paintCard(level: Level, solved: boolean, w: number, h: number, dpr: number) {
  const m = MOODS[level.chapter], { c, g } = canvas(w * dpr, h * dpr);
  g.scale(dpr, dpr);
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 8); g.clip();
  const wall = g.createLinearGradient(0, 0, 0, h); wall.addColorStop(0, m.wall[1]); wall.addColorStop(0.7, m.wall[0]); g.fillStyle = wall; g.fillRect(0, 0, w, h);
  const tableY = h * 0.72;
  const cl = g.createRadialGradient(w / 2, tableY - h * 0.15, 2, w / 2, tableY - h * 0.15, w * 0.9); cl.addColorStop(0, `${m.glow}0.35)`); cl.addColorStop(1, `${m.glow}0)`); g.fillStyle = cl; g.fillRect(0, 0, w, h);
  const tb = g.createLinearGradient(0, tableY, 0, h); tb.addColorStop(0, m.table[0]); tb.addColorStop(1, m.table[1]); g.fillStyle = tb; g.fillRect(0, tableY, w, h - tableY);
  g.fillStyle = 'rgba(255,220,180,0.2)'; g.fillRect(0, tableY, w, 1);
  // the glasses: as they start, or as the shortest solution leaves them
  let fin = level.start;
  if (solved) for (const mv of solve(level) ?? []) fin = pour(level, fin, mv) ?? fin;
  const sizes = level.glasses.map((gl) => ({ w: 42 + gl.cap * 2.2, h: 22 + gl.cap * 11 }));
  const extras = (level.spring ? 30 : 0) + (level.basin ? 30 : 0);
  const rowW = sizes.reduce((a, z) => a + z.w + 10, 0) + extras, maxH = Math.max(...sizes.map((z) => z.h));
  const k = Math.min((w - 8) / rowW, (tableY - 14) / (maxH * 1.45));
  let x = (w - rowW * k) / 2;
  if (level.spring) { g.fillStyle = '#6a665c'; g.fillRect(x + 4 * k, tableY - 30 * k, 16 * k, 30 * k); g.fillStyle = '#d8b46a'; g.fillRect(x + 8 * k, tableY - 34 * k, 22 * k, 4 * k); x += 30 * k; }
  level.glasses.forEach((gl, i) => {
    const gw = sizes[i].w * k, gh = sizes[i].h * k, cx = x + (sizes[i].w + 10) * k / 2, by = tableY - gh * 0.45 - 2;
    const P = bowl(gw, gh, 12).map(([px, py]) => [cx + px, by + py] as [number, number]);
    const amount = fin[i];
    if (amount > 0) {
      const want = area(below(bowl(gw, gh, 12), -(amount / gl.cap) * gh));
      let lo = by - gh, hi = by;
      for (let n = 0; n < 18; n++) { const mid = (lo + hi) / 2; if (area(below(P, mid)) > want) lo = mid; else hi = mid; }
      const wp = below(P, (lo + hi) / 2);
      const col = '#' + m.water.toString(16).padStart(6, '0');
      g.globalAlpha = 0.55; g.fillStyle = col; g.beginPath(); wp.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    g.strokeStyle = 'rgba(235,245,255,0.6)'; g.lineWidth = 0.8; g.beginPath(); P.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.stroke();
    g.fillStyle = 'rgba(230,240,255,0.45)'; g.fillRect(cx - 0.5, by, 1, gh * 0.45); g.fillRect(cx - gw * 0.28, tableY - 1.5, gw * 0.56, 1.2);
    if (gl.want !== null) { const y = by - (gl.want / gl.cap) * gh; g.strokeStyle = GEMS[i % GEMS.length]; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - gw * 0.38, y); g.lineTo(cx + gw * 0.38, y); g.stroke(); }
    if (solved) { const hg = g.createRadialGradient(cx, by - gh, 0, cx, by - gh, gw * 0.7); hg.addColorStop(0, 'rgba(255,240,200,0.35)'); hg.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = hg; g.fillRect(cx - gw, by - gh * 1.7, gw * 2, gh * 1.4); }
    x += (sizes[i].w + 10) * k;
  });
  if (level.basin) { g.fillStyle = '#b8582a'; g.beginPath(); g.ellipse(x + 15 * k, tableY - 6 * k, 13 * k, 7 * k, 0, 0, Math.PI); g.fill(); g.fillStyle = '#2a0e04'; g.beginPath(); g.ellipse(x + 15 * k, tableY - 6 * k, 13 * k, 2.4 * k, 0, 0, Math.PI * 2); g.fill(); }
  g.restore();
  return c;
}

export function Postcard({ level, solved, locked, width }: { level: Level; solved: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.25);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), key = `${level.id}|${solved}|${locked}|${width}|${dpr}`;
    let src = cache.get(key);
    if (!src) { src = paintCard(level, solved && !locked, width, height, dpr); cache.set(key, src); }
    el.width = src.width; el.height = src.height; el.getContext('2d')!.drawImage(src, 0, 0);
  }, [level, solved, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
