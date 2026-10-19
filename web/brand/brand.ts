// Store icon, adaptive-icon layers, splash and feature graphic: crystal goblets in candlelight, tuned with water.
import * as A from '../src/game/art';

const M = A.MOODS[0];
const TAU = Math.PI * 2;
/** A goblet drawn at k times its design size: w and h are the bowl's design width and height, frac how full it is. */
function goblet(g: CanvasRenderingContext2D, cx: number, tableY: number, w: number, h: number, frac: number, k: number, gem: string, want: number | null = null, cap = 10, water = '#9fd4ff') {
  const back = A.goblet(w, h, cap, want, gem, k, false), front = A.goblet(w, h, cap, want, gem, k, true);
  const stem = h * 0.45 + 10, byW = tableY - (stem + 2) * k; // the bowl's inside bottom, in canvas pixels
  const x0 = cx - back.ox * k, y0 = byW - back.by * k;
  // a pool of candlelight on the table under the glass
  const pool = g.createRadialGradient(cx, tableY + 4 * k, 2, cx, tableY + 4 * k, w * 0.9 * k); pool.addColorStop(0, 'rgba(255,200,130,0.22)'); pool.addColorStop(1, 'rgba(255,200,130,0)');
  g.fillStyle = pool; g.beginPath(); g.ellipse(cx, tableY + 4 * k, w * 0.9 * k, 10 * k, 0, 0, TAU); g.fill();
  g.drawImage(back.c, x0, y0);
  if (frac > 0) {
    const poly = A.bowl(w - 4, h - 3), L = -frac * (h - 3), wp = A.below(poly, L);
    g.save(); g.translate(cx, byW); g.scale(k, k);
    const wg = g.createLinearGradient(0, L, 0, 0); wg.addColorStop(0, water); wg.addColorStop(1, '#4a7ab0');
    g.globalAlpha = 0.55; g.fillStyle = wg; g.beginPath(); wp.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    g.globalAlpha = 0.85; g.strokeStyle = '#ffffff'; g.lineWidth = 1; const hw = A.halfW(w - 4, h - 3, L);
    g.beginPath(); g.ellipse(0, L, hw - 0.5, 1.6, 0, 0, TAU); g.stroke();
    g.restore();
  }
  g.drawImage(front.c, x0, y0);
}
/** Rings of sound rising from a glass's rim. */
function rings(g: CanvasRenderingContext2D, cx: number, y: number, w: number, n: number, col: string) {
  for (let i = 0; i < n; i++) { g.strokeStyle = `${col}${(0.5 - i * 0.14).toFixed(2)})`; g.lineWidth = 3 - i * 0.6; g.beginPath(); g.ellipse(cx, y - i * w * 0.16, w * (0.62 + i * 0.22), w * (0.09 + i * 0.03), 0, 0, TAU); g.stroke(); }
}
/** A flowing stave with a few notes, from (x0, y0) to (x1, y1). */
function stave(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, gap: number, notes: [number, number, string][], alpha = 0.4) {
  const at = (t: number, k: number) => { const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI * 1.6) * gap * 2.2 + k * gap; return [x, y] as const; };
  g.strokeStyle = `rgba(246,234,216,${alpha})`; g.lineWidth = 1.4;
  for (let k = 0; k < 5; k++) { g.beginPath(); for (let i = 0; i <= 60; i++) { const [x, y] = at(i / 60, k); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  for (const [t, pos, col] of notes) {
    const [x, y] = at(t, 2 - pos / 2);
    g.fillStyle = col; g.beginPath(); g.ellipse(x, y, gap * 0.72, gap * 0.52, -0.35, 0, TAU); g.fill();
    g.strokeStyle = col; g.lineWidth = gap * 0.16; g.beginPath(); g.moveTo(x + gap * 0.66, y - gap * 0.1); g.lineTo(x + gap * 0.66, y - gap * 3.3); g.stroke();
  }
}
function roomBg(g: CanvasRenderingContext2D, W: number, H: number, tableY: number, k: number) { g.drawImage(A.room(M, W / k, H / k, tableY / k, k), 0, 0); }

export function icon() {
  const { c, g } = A.canvas(1024, 1024);
  roomBg(g, 1024, 1024, 820, 4);
  const halo = g.createRadialGradient(512, 430, 20, 512, 430, 470); halo.addColorStop(0, 'rgba(255,196,120,0.4)'); halo.addColorStop(1, 'rgba(255,196,120,0)'); g.fillStyle = halo; g.fillRect(0, 0, 1024, 1024);
  rings(g, 512, 222, 170, 3, 'rgba(255,226,160,');
  goblet(g, 512, 870, 104, 104, 0.5, 3.8, A.GEMS[2], null);
  return c;
}
export function adaptive() {
  const { c, g } = A.canvas(1024, 1024);
  rings(g, 512, 300, 120, 3, 'rgba(255,226,160,');
  goblet(g, 512, 770, 104, 104, 0.5, 2.7, A.GEMS[2], null);
  return c;
}
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); roomBg(g, 1024, 1024, 790, 4); return c; }
export function splash() {
  const W = 1284, H = 2778, { c, g } = A.canvas(W, H);
  roomBg(g, W, H, 2050, 3.6);
  const xs = [300, 520, 760, 1000], fr = [0.75, 0.55, 0.38, 0.2], hs = [70, 86, 100, 112];
  xs.forEach((x, i) => goblet(g, x, 2080, 44 + hs[i] * 0.3, hs[i], fr[i], 3.4, A.GEMS[i], null));
  stave(g, 120, 1100, 1160, 1150, 22, [[0.15, 0, A.GEMS[0]], [0.35, 2, A.GEMS[1]], [0.55, 4, A.GEMS[2]], [0.75, 3, A.GEMS[3]]]);
  g.textAlign = 'center'; g.font = '600 200px "Cormorant SC", serif';
  const tg = g.createLinearGradient(0, 560, 0, 760); tg.addColorStop(0, '#fff6e2'); tg.addColorStop(0.55, '#f0c878'); tg.addColorStop(1, '#a87a3a');
  g.shadowColor = 'rgba(255,190,110,0.4)'; g.shadowBlur = 50; g.fillStyle = tg; g.fillText('Glass Harp', W / 2, 720); g.shadowBlur = 0;
  g.save(); g.shadowBlur = 0; g.textAlign = g.textAlign; g.font = '600 58px "Inter Tight", sans-serif'; g.fillStyle = '#f0c878'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('BASIN', W / 2 + 17, 540); g.restore();
  return c;
}
/** The feature graphic: a row of goblets tuned high to low on the right, their song running off as a stave; the words on the left. */
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  roomBg(g, W, H, 410, 2);
  const halo = g.createRadialGradient(760, 300, 10, 760, 300, 420); halo.addColorStop(0, 'rgba(255,190,120,0.26)'); halo.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = halo; g.fillRect(0, 0, W, H);
  stave(g, 470, 70, 1060, 110, 9, [[0.12, 0, A.GEMS[4]], [0.3, 2, A.GEMS[0]], [0.48, 4, A.GEMS[1]], [0.66, 6, A.GEMS[2]], [0.84, 5, A.GEMS[3]]], 0.32);
  const row: [number, number, number, string][] = [[548, 66, 0.86, A.GEMS[0]], [674, 80, 0.62, A.GEMS[1]], [802, 94, 0.4, A.GEMS[2]], [932, 108, 0.18, A.GEMS[3]]];
  row.forEach(([x, h, f, gem]) => goblet(g, x, 430, 40 + h * 0.3, h, f, 1.7, gem, null));
  rings(g, 802, 166, 66, 2, 'rgba(255,226,160,');
  // the words, over a soft shade
  const shade = g.createLinearGradient(0, 0, 520, 0); shade.addColorStop(0, 'rgba(14,8,10,0.75)'); shade.addColorStop(1, 'rgba(14,8,10,0)'); g.fillStyle = shade; g.fillRect(0, 0, 520, H);
  g.textAlign = 'left';
  const tg = g.createLinearGradient(0, 90, 0, 180); tg.addColorStop(0, '#fff6e2'); tg.addColorStop(0.55, '#f0c878'); tg.addColorStop(1, '#b88440');
  g.save(); g.shadowBlur = 0; g.textAlign = g.textAlign; g.font = '600 22px "Inter Tight", sans-serif'; g.fillStyle = '#f0c878'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('BASIN', 62, 92); g.restore();
  g.shadowColor = 'rgba(255,190,110,0.35)'; g.shadowBlur = 24; g.fillStyle = tg; g.font = '600 86px "Cormorant SC", serif'; g.fillText('Glass Harp', 58, 168); g.shadowBlur = 0;
  g.fillStyle = '#f6ead8'; g.font = '500 33px "Cormorant SC", serif'; g.fillText('Every glass has a song.', 62, 218);
  g.fillStyle = '#f0c878'; g.fillRect(64, 240, 48, 2);
  g.fillStyle = 'rgba(246,234,216,0.84)'; g.font = '500 18px "Inter Tight", sans-serif';
  g.fillText('Pour, measure and tune crystal glasses', 64, 276);
  g.fillText('until each one rings true. 24 pieces.', 64, 302);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
