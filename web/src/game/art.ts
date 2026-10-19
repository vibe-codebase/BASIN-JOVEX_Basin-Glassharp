/**
 * Glass Harp art, painted with Canvas 2D: a dark room with candlelight on a walnut table, crystal goblets with
 * etched measures and a gold line where their note lies, a brass spring and a copper basin, and a little stave
 * for the tune. Water is drawn live by the scene, so it can level itself when a glass tips.
 */
export type Mood = { name: string; wall: [string, string]; table: [string, string]; glow: string; water: number; waterA: number };
export const MOODS: Mood[] = [
  { name: 'candle', wall: ['#2a1a1e', '#120a0e'], table: ['#5a3020', '#2a160e'], glow: 'rgba(255,190,120,', water: 0x9fd4ff, waterA: 0.42 },
  { name: 'evening', wall: ['#1a1a2e', '#0a0a16'], table: ['#3a2a30', '#1a1016'], glow: 'rgba(210,190,255,', water: 0xb8c8ff, waterA: 0.4 },
  { name: 'garden', wall: ['#16241e', '#08100c'], table: ['#4a3a22', '#221a0e'], glow: 'rgba(220,255,200,', water: 0xa8f0d8, waterA: 0.4 },
];
/** Gem colours for the glasses' tags and their notes on the stave. */
export const GEMS = ['#e8a0a8', '#9cc8f0', '#f0d080', '#a8dcb0', '#c8a8f0'];
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d')! };
}
const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const TAU = Math.PI * 2;

/** Half the width of a goblet's bowl (w wide, h tall) at height y (y up negative, 0 the inside bottom). */
export function halfW(w: number, h: number, y: number) {
  const r = Math.min(w / 2, h * 0.32), half = (t: number) => (w / 2) * (0.8 + 0.2 * Math.sin(Math.PI * (0.2 + 0.7 * t)));
  if (-y >= r) return half(-y / h);
  const hw = half(r / h), d = (y + r) / r; return hw * Math.sqrt(Math.max(0, 1 - d * d));
}
/** A goblet's bowl as a polygon, origin at the bottom of the bowl's inside, y up negative: w wide, h tall. */
export function bowl(w: number, h: number, n = 24): [number, number][] {
  const r = Math.min(w / 2, h * 0.32), left: [number, number][] = [];
  for (let k = 0; k <= n; k++) { const y = -h + (k / n) * (h - r); left.push([-halfW(w, h, y), y]); }
  // the rounded bottom, from the left side round to the right
  const hw = halfW(w, h, -r), bottom: [number, number][] = [];
  for (let k = 1; k < 16; k++) { const th = Math.PI - (k / 16) * Math.PI; bottom.push([Math.cos(th) * hw, -r + Math.sin(th) * r]); }
  const right = left.slice().reverse().map(([x, y]) => [-x, y] as [number, number]);
  return [...left, ...bottom, ...right];
}
/** Area of a polygon. */
export function area(p: [number, number][]) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; }
/** The part of a polygon below the horizontal line y = L (larger y is lower). */
export function below(p: [number, number][], L: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], ia = a[1] >= L, ib = b[1] >= L;
    if (ia) out.push(a);
    if (ia !== ib) { const t = (L - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, L]); }
  }
  return out;
}

/** The room: a dark wall with candlelight and a walnut table top from y = tableY down. */
export function room(m: Mood, W: number, H: number, tableY: number, r: number) {
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  const wall = g.createLinearGradient(0, 0, 0, tableY); wall.addColorStop(0, m.wall[1]); wall.addColorStop(1, m.wall[0]);
  g.fillStyle = wall; g.fillRect(0, 0, W, tableY);
  // candlelight from behind the glasses
  const cl = g.createRadialGradient(W * 0.5, tableY - 60, 10, W * 0.5, tableY - 60, Math.max(W, H) * 0.7); cl.addColorStop(0, `${m.glow}0.32)`); cl.addColorStop(0.5, `${m.glow}0.08)`); cl.addColorStop(1, `${m.glow}0)`);
  g.fillStyle = cl; g.fillRect(0, 0, W, H);
  // a damask pattern, very faint
  g.strokeStyle = 'rgba(255,220,180,0.035)'; g.lineWidth = 1;
  for (let y = 20; y < tableY; y += 46) for (let x = (y / 46) % 2 ? 23 : 0; x < W + 46; x += 46) { g.beginPath(); g.ellipse(x, y, 10, 16, 0, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x, y + 22); g.stroke(); }
  // the table
  const tb = g.createLinearGradient(0, tableY, 0, H); tb.addColorStop(0, m.table[0]); tb.addColorStop(1, m.table[1]);
  g.fillStyle = tb; g.fillRect(0, tableY, W, H - tableY);
  for (let i = 0; i < 60; i++) { const y = tableY + 4 + hash(i, 3) * (H - tableY), w = 40 + hash(i, 4) * 140; g.strokeStyle = `rgba(0,0,0,${0.06 + hash(i, 5) * 0.08})`; g.lineWidth = 0.6 + hash(i, 6); g.beginPath(); g.moveTo(hash(i, 7) * W, y); g.quadraticCurveTo(hash(i, 7) * W + w / 2, y + (hash(i, 8) - 0.5) * 6, hash(i, 7) * W + w, y + (hash(i, 9) - 0.5) * 4); g.stroke(); }
  g.fillStyle = 'rgba(255,220,180,0.18)'; g.fillRect(0, tableY, W, 1.5);
  const sheen = g.createLinearGradient(0, tableY, 0, tableY + 60); sheen.addColorStop(0, `${m.glow}0.12)`); sheen.addColorStop(1, `${m.glow}0)`); g.fillStyle = sheen; g.fillRect(0, tableY, W, 60);
  return c;
}

/** A goblet, drawn with its bowl's inside bottom at (S/2, by): stem, foot and the bowl's back wall, graduations, and the wish line. */
export function goblet(w: number, h: number, cap: number, want: number | null, gem: string, r: number, front: boolean) {
  const stem = h * 0.45 + 10, S = w + 24, T = h + stem + 18, { c, g } = canvas(S * r, T * r);
  g.scale(r, r);
  const ox = S / 2, by = h + 8;
  const P = bowl(w, h).map(([x, y]) => [ox + x, by + y] as [number, number]);
  const path = () => { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  if (!front) {
    // foot and stem
    const fy = by + stem;
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(ox + 3, fy + 4, w * 0.42, 4, 0, 0, TAU); g.fill();
    const glass = g.createLinearGradient(ox - w / 2, 0, ox + w / 2, 0); glass.addColorStop(0, 'rgba(220,235,255,0.35)'); glass.addColorStop(0.3, 'rgba(255,255,255,0.12)'); glass.addColorStop(0.7, 'rgba(255,255,255,0.08)'); glass.addColorStop(1, 'rgba(200,220,255,0.3)');
    g.fillStyle = glass; g.beginPath(); g.ellipse(ox, fy, w * 0.38, 3.6, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath(); g.ellipse(ox, fy, w * 0.38, 3.6, 0, Math.PI, TAU); g.stroke();
    g.fillStyle = 'rgba(230,240,255,0.32)'; g.fillRect(ox - 1.6, by + 2, 3.2, stem - 2);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(ox - 0.6, by + 4, 1, stem - 6);
    g.fillStyle = 'rgba(230,240,255,0.3)'; g.beginPath(); g.ellipse(ox, by + 3, 5, 3, 0, 0, TAU); g.fill();
    // the bowl's far wall: faint
    g.fillStyle = 'rgba(200,220,255,0.06)'; path(); g.fill();
    // etched measures: a tick for each, every other a little longer
    for (let k = 1; k < cap; k++) { const y = by - (k / cap) * h; g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 0.8; const L = k % 2 ? 4 : 7; const hx = halfW(w, h, y - by) - 1; g.beginPath(); g.moveTo(ox - hx, y); g.lineTo(ox - hx + L, y); g.stroke(); }
    // the wish: a gold line at the measure that rings the glass's note
    if (want !== null) {
      const y = by - (want / cap) * h, hx = halfW(w, h, y - by) - 1;
      g.strokeStyle = gem; g.lineWidth = 1.6; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(ox - hx + 1, y); g.lineTo(ox + hx - 1, y); g.stroke(); g.setLineDash([]);
      g.fillStyle = gem; g.beginPath(); g.moveTo(ox + hx + 2, y); g.lineTo(ox + hx + 7, y - 3.5); g.lineTo(ox + hx + 7, y + 3.5); g.closePath(); g.fill();
    }
  } else {
    // the near wall: the rim, edges catching the candle, a long highlight
    g.strokeStyle = 'rgba(235,245,255,0.55)'; g.lineWidth = 1.4; path(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.2; g.beginPath(); g.ellipse(ox, by - h, halfW(w, h, -h), 2.6, 0, 0, TAU); g.stroke();
    const hl = g.createLinearGradient(0, by - h, 0, by); hl.addColorStop(0, 'rgba(255,255,255,0.55)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = hl; g.lineWidth = 2.2; g.beginPath(); g.moveTo(ox - w * 0.3, by - h * 0.9); g.quadraticCurveTo(ox - w * 0.36, by - h * 0.45, ox - w * 0.22, by - h * 0.12); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(ox + w * 0.33, by - h * 0.8); g.quadraticCurveTo(ox + w * 0.38, by - h * 0.5, ox + w * 0.3, by - h * 0.25); g.stroke();
  }
  return { c, ox, by, S, T };
}

/** The spring: a carved stone pillar with a brass tap and its wheel; the spout's mouth is at the top right. */
export function spring(s: number, r: number) {
  const w = s, h = s * 1.5, { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(w * 0.4, h - 2, w * 0.34, 3, 0, 0, TAU); g.fill();
  // the pillar: dressed stone with a capital and a plinth
  const st = g.createLinearGradient(w * 0.12, 0, w * 0.64, 0); st.addColorStop(0, '#5e594f'); st.addColorStop(0.35, '#a49c8a'); st.addColorStop(1, '#4a463e');
  g.fillStyle = st; g.beginPath(); g.roundRect(w * 0.16, h * 0.4, w * 0.44, h * 0.56, 2); g.fill();
  g.beginPath(); g.roundRect(w * 0.1, h * 0.34, w * 0.56, h * 0.08, 3); g.fill();
  g.beginPath(); g.roundRect(w * 0.1, h * 0.92, w * 0.56, h * 0.08, 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,0.22)'; for (let i = 0; i < 3; i++) g.fillRect(w * 0.16, h * (0.55 + i * 0.13), w * 0.44, 1);
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(w * 0.1, h * 0.34, w * 0.56, 1);
  // a little water carved in relief
  g.strokeStyle = 'rgba(30,26,22,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w * 0.38, h * 0.5); g.quadraticCurveTo(w * 0.3, h * 0.6, w * 0.38, h * 0.63); g.quadraticCurveTo(w * 0.46, h * 0.6, w * 0.38, h * 0.5); g.stroke();
  // the brass tap: a body on the capital, a spout curving down to the right, a wheel on top
  const br = g.createLinearGradient(0, h * 0.14, 0, h * 0.34); br.addColorStop(0, '#fff0b8'); br.addColorStop(0.45, '#d8a850'); br.addColorStop(1, '#6a4418');
  g.fillStyle = br; g.beginPath(); g.roundRect(w * 0.28, h * 0.22, w * 0.2, h * 0.12, 3); g.fill();
  g.strokeStyle = br; g.lineWidth = Math.max(3, w * 0.09); g.lineCap = 'round'; g.beginPath(); g.moveTo(w * 0.44, h * 0.26); g.quadraticCurveTo(w * 0.86, h * 0.2, w * 0.88, h * 0.32); g.stroke();
  g.fillStyle = '#3a2408'; g.beginPath(); g.ellipse(w * 0.88, h * 0.335, w * 0.045, w * 0.02, 0, 0, TAU); g.fill();
  g.fillStyle = br; g.fillRect(w * 0.36, h * 0.13, w * 0.04, h * 0.09);
  g.strokeStyle = '#e8c070'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(w * 0.38, h * 0.12, w * 0.15, w * 0.045, 0, 0, TAU); g.stroke();
  g.beginPath(); g.moveTo(w * 0.23, h * 0.12); g.lineTo(w * 0.53, h * 0.12); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(w * 0.31, h * 0.235, w * 0.1, 1);
  return c;
}
/** The basin: a hammered copper bowl. */
export function basin(s: number, r: number) {
  const w = s * 1.2, h = s * 0.55, { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const cu = g.createLinearGradient(0, 0, w, 0); cu.addColorStop(0, '#5a2410'); cu.addColorStop(0.35, '#e08a52'); cu.addColorStop(0.6, '#b8582a'); cu.addColorStop(1, '#4a1a08');
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(w / 2 + 3, h - 3, w * 0.42, 5, 0, 0, TAU); g.fill();
  g.fillStyle = cu; g.beginPath(); g.moveTo(w * 0.04, h * 0.2); g.quadraticCurveTo(w * 0.08, h * 0.95, w / 2, h * 0.95); g.quadraticCurveTo(w * 0.92, h * 0.95, w * 0.96, h * 0.2); g.closePath(); g.fill();
  g.fillStyle = '#2a0e04'; g.beginPath(); g.ellipse(w / 2, h * 0.2, w * 0.46, h * 0.12, 0, 0, TAU); g.fill();
  g.strokeStyle = '#f2b07a'; g.lineWidth = 1.4; g.beginPath(); g.ellipse(w / 2, h * 0.2, w * 0.46, h * 0.12, 0, 0, TAU); g.stroke();
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,220,180,${0.08 + hash(i, 1) * 0.1})`; g.beginPath(); g.arc(w * (0.15 + hash(i, 2) * 0.7), h * (0.35 + hash(i, 3) * 0.5), 1.5, 0, TAU); g.fill(); }
  return c;
}
/** A soft round glow. */
export function glow(rad: number, col: string, r: number) {
  const S = rad * 2, { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const gr = g.createRadialGradient(rad, rad, 0, rad, rad, rad); gr.addColorStop(0, `${col}0.6)`); gr.addColorStop(1, `${col}0)`);
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  return c;
}
