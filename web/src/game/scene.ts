import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, type Level } from './levels';
import { degree, noteLabel, pour, solve, solved, starsFor, type Move } from './sim';
import { sound } from '../audio/sound';

export type Result = { pours: number; par: number; stars: number; hinted: boolean };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type HudState = { phase: 'play' | 'busy' | 'done'; pours: number; par: number; tuned: number; wishes: number; canUndo: boolean; hints: number; msg: string; msgId: number };

/** Bridge between React and the Phaser scene. */
export const harp = {
  hooks: {} as Hooks,
  scene: null as HarpScene | null,
  reducedMotion: false,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  undo() { this.scene?.undo(); },
  hint() { this.scene?.hint(); },
  restart() { this.scene?.restart(); },
  debug() { return this.scene?.debugState(); },
  /** QA only: CSS centre of a glass (or -1 the spring, -2 the basin). */
  qaTarget(i: number) { return this.scene?.qaTarget(i); },
  /** QA only: the shortest pours from here. */
  solvePath() { return this.scene ? solve(this.scene.level, this.scene.debugState().state) : null; },
};
(window as unknown as { __harp: typeof harp }).__harp = harp;

const VIEW_W = 360;
const TILT = 1.75;
const SHOWCASE = ['c8', 'b6', 'a8', 'c5', 'b8'];
type GlassView = { x: number; y: number; w: number; h: number; back: Phaser.GameObjects.Image; front: Phaser.GameObjects.Image; water: Phaser.GameObjects.Graphics; tilt: number; dx: number; dy: number; amount: number; glowT: number; tag: Phaser.GameObjects.Text; want: Phaser.GameObjects.Text };
type Anim = { m: Move; t: number; dur: number; from: number[]; to: number[]; done: () => void };

export class HarpScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private phase: 'play' | 'done' = 'play';
  private paused = false;
  private acted = false;
  private texSeq = 0;
  private r = 2;
  private viewW = VIEW_W; private viewH = 700;
  private s = 1;
  private tableY = 400;
  private state: number[] = [];
  private history: number[][] = [];
  private pours = 0; private hints = 0;
  private sel: number | null = null; // a glass index, or -1 the spring
  private anim: Anim | null = null;
  private glasses: GlassView[] = [];
  private springPos = { x: 0, y: 0, w: 0, h: 0 }; private basinPos = { x: 0, y: 0, w: 0, h: 0 };
  private g!: Phaser.GameObjects.Graphics;
  private stave!: Phaser.GameObjects.Graphics;
  private staveY = 120;
  private msg = ''; private msgId = 0;
  private clock = 0;
  private demo: { k: number; wait: number; path: Move[] } | null = null;
  private hintMove: Move | null = null; private hintT = -9;
  private polys: [number, number][][] = [];

  constructor() { super('harp'); }

  create() {
    harp.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0])!);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; }
  hudState(): HudState {
    const w = this.level.glasses.filter((g) => g.want !== null);
    return { phase: this.phase === 'done' ? 'done' : this.anim ? 'busy' : 'play', pours: this.pours, par: this.level.par, tuned: this.level.glasses.filter((g, i) => g.want !== null && this.state[i] === g.want).length, wishes: w.length, canUndo: this.history.length > 0 && this.phase === 'play', hints: this.hints, msg: this.msg, msgId: this.msgId };
  }
  debugState() { return { ...this.hudState(), mode: this.mode, state: this.state.slice(), sel: this.sel }; }
  qaTarget(i: number) {
    const z = this.cameras.main.zoom, kk = (this.game.canvas.clientWidth || VIEW_W) / this.scale.width;
    const p = i === -1 ? { x: this.springPos.x, y: this.springPos.y } : i === -2 ? { x: this.basinPos.x, y: this.basinPos.y } : { x: this.glasses[i].x, y: this.glasses[i].y - this.glasses[i].h * 0.4 };
    return { x: p.x * z * kk, y: p.y * z * kk };
  }
  private say(m: string) { this.msg = m; this.msgId++; }

  /** A timer that only fires if the scene has not been shown anew since: a finished demo must never bring the menu back over a new game. */
  private gen = 0;
  private later(ms: number, fn: () => void) { const g = this.gen; this.time.delayedCall(ms, () => { if (g === this.gen) fn(); }); }
  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode; this.level = level;
    this.gen++;
    this.paused = false; this.acted = false; this.phase = 'play';
    this.state = level.start.slice(); this.history = []; this.pours = 0; this.hints = 0; this.sel = null; this.anim = null; this.msg = ''; this.hintMove = null;
    this.demo = mode === 'menu' ? { k: 0, wait: 1.5, path: solve(level) ?? [] } : null;
    this.rebuild();
  }
  restart() { if (this.mode === 'play') this.show('play', this.level); }

  // ── layout ────────────────────────────────────────────────────────────
  private tex(prefix: string, c: HTMLCanvasElement) { const key = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(key, c); return key; }
  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    const pw = this.scale.width, ph = this.scale.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    const zoom = Math.min(pw / VIEW_W, ph / 640);
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewW = pw / zoom; this.viewH = ph / zoom;
    this.cameras.main.setZoom(zoom).centerOn(this.viewW / 2, this.viewH / 2);
    const css = zoom / dpr, play = this.mode === 'play', top = (play ? 64 : 230) / css, bottom = (play ? 92 : 200) / css;
    const W = this.viewW, H = this.viewH, l = this.level, m = A.MOODS[l.chapter], r = this.r;
    const stave = play ? 70 : 0;
    // glass sizes, then one scale so the row fits the width and the height between stave and HUD
    const sizes = l.glasses.map((g) => ({ w: 42 + g.cap * 2.2, h: 22 + g.cap * 11 }));
    const extras = (l.spring ? 60 : 0) + (l.basin ? 62 : 0);
    const rowW = sizes.reduce((a, z) => a + z.w + 18, 0) + extras;
    const maxH = Math.max(...sizes.map((z) => z.h));
    this.s = Math.min(1.6, (W - 20) / rowW, (H - top - bottom - stave - 60) / (maxH * 1.5 + 40));
    const s = this.s;
    const rowH = maxH * s * 1.5 + 30;
    this.tableY = top + stave + 14 + rowH + Math.max(0, (H - top - bottom - stave - 60 - rowH) * 0.45);
    this.add.image(0, 0, this.tex('room', A.room(m, W, H, this.tableY - 4, Math.min(r, 1.5)))).setOrigin(0, 0).setScale(1 / Math.min(r, 1.5));
    this.stave = this.add.graphics().setDepth(1);
    // the row
    let x = (W - rowW * s) / 2;
    if (l.spring) { const sw = 56 * s, img = this.add.image(x, this.tableY + 2, this.tex('spring', A.spring(sw, r))).setOrigin(0, 1).setScale(1 / r).setDepth(2); this.springPos = { x: x + sw * 0.88, y: this.tableY + 2 - sw * 1.5 * 0.67, w: sw, h: sw * 1.5 }; void img; x += 60 * s; }
    this.glasses = l.glasses.map((gl, i) => {
      const { w, h } = sizes[i], gw = w * s, gh = h * s, gem = A.GEMS[i % A.GEMS.length];
      const back = A.goblet(gw, gh, gl.cap, gl.want, gem, r, false), front = A.goblet(gw, gh, gl.cap, gl.want, gem, r, true);
      const cx = x + (w + 18) * s / 2, stem = gh * 0.45 + 10, by = this.tableY - stem - 2;
      const bi = this.add.image(cx, by, this.tex('gb', back.c)).setOrigin(back.ox / back.S, back.by / back.T).setScale(1 / r).setDepth(3 + i * 0.1);
      const water = this.add.graphics().setDepth(3.03 + i * 0.1);
      const fi = this.add.image(cx, by, this.tex('gf', front.c)).setOrigin(front.ox / front.S, front.by / front.T).setScale(1 / r).setDepth(3.06 + i * 0.1);
      const tag = this.add.text(cx, this.tableY + 18, '', { fontFamily: '"Cormorant SC", serif', fontSize: `${17 * r}px`, color: '#f6ead8' }).setOrigin(0.5, 0).setScale(1 / r).setDepth(4);
      const want = this.add.text(cx, this.tableY + 38, gl.want === null ? '' : `→ ${noteLabel(degree(gl, gl.want))}`, { fontFamily: '"Cormorant SC", serif', fontSize: `${14 * r}px`, color: gem }).setOrigin(0.5, 0).setScale(1 / r).setDepth(4);
      x += (w + 18) * s;
      return { x: cx, y: by, w: gw, h: gh, back: bi, front: fi, water, tilt: 0, dx: 0, dy: 0, amount: this.state[i], glowT: -9, tag, want };
    });
    this.polys = this.glasses.map((v) => A.bowl(v.w - 4, v.h - 3));
    if (l.basin) { const bw = 52 * s, img = this.add.image(x + 6 * s, this.tableY + 4, this.tex('basin', A.basin(bw, r))).setOrigin(0, 1).setScale(1 / r).setDepth(2); this.basinPos = { x: x + 6 * s + bw * 0.6, y: this.tableY - bw * 0.3, w: bw * 1.2, h: bw * 0.6 }; void img; }
    // the tune's stave, centred in the space above the tallest glass
    const tallest = Math.max(...this.glasses.map((v) => v.h * 1.45 + 12));
    this.staveY = Math.max(top + 6, (top + (this.tableY - tallest - 40)) / 2 - 10);
    if (play) this.add.text(W * 0.13, this.staveY - 12, 'the tune', { fontFamily: '"Cormorant SC", serif', fontSize: `${13 * r}px`, color: '#f0c878' }).setOrigin(0, 1).setScale(1 / r).setAlpha(0.8).setDepth(1);
    // little brass-edged plaques on the table, for each glass's note
    const pl = this.add.graphics().setDepth(3.9);
    this.glasses.forEach((v, i) => {
      const pw2 = Math.max(34, Math.min(50, v.w * 0.8)), ph2 = l.glasses[i].want === null ? 26 : 44;
      pl.fillStyle(0x0c0608, 0.42); pl.fillRoundedRect(v.x - pw2 / 2, this.tableY + 15, pw2, ph2, 6);
      pl.lineStyle(1, 0xf0c878, 0.28); pl.strokeRoundedRect(v.x - pw2 / 2, this.tableY + 15, pw2, ph2, 6);
    });
    this.g = this.add.graphics().setDepth(8);
    this.updateTags();
  }
  private updateTags() {
    this.glasses.forEach((v, i) => {
      const gl = this.level.glasses[i], ok = gl.want !== null && this.state[i] === gl.want;
      v.tag.setText(noteLabel(degree(gl, this.state[i])));
      v.tag.setColor(ok ? A.GEMS[i % A.GEMS.length] : '#f6ead8');
      v.want.setAlpha(ok ? 1 : 0.85);
    });
  }

  // ── pouring ───────────────────────────────────────────────────────────
  private hitGlass(x: number, y: number) {
    for (let i = 0; i < this.glasses.length; i++) { const v = this.glasses[i]; if (Math.abs(x - v.x) < Math.max(26, v.w * 0.6) && y > v.y - v.h - 16 && y < this.tableY + 56) return i; }
    if (this.level.spring && Math.abs(x - this.springPos.x + this.springPos.w * 0.4) < this.springPos.w * 0.7 && y > this.tableY - this.springPos.h - 16 && y < this.tableY + 10) return -1;
    if (this.level.basin && Math.abs(x - this.basinPos.x) < this.basinPos.w * 0.6 && y > this.basinPos.y - 30 && y < this.tableY + 20) return -2;
    return null;
  }
  private down(p: Phaser.Input.Pointer) {
    if (this.mode !== 'play' || this.paused || this.phase !== 'play' || this.anim) return;
    const w = this.cameras.main.getWorldPoint(p.x, p.y), hit = this.hitGlass(w.x, w.y);
    if (!this.acted && hit !== null) { this.acted = true; harp.hooks.onFirstAction?.(); }
    this.tapOn(hit);
  }
  private tapOn(hit: number | null) {
    if (hit === null) { this.sel = null; return; }
    if (this.sel === null) {
      if (hit === -2) { this.say('Tap a glass first, then the basin, to empty it.'); return; }
      this.sel = hit; this.hintMove = null;
      if (hit >= 0) { this.ringGlass(hit, 0.035); sound.pick(); } else sound.pick();
      harp.hooks.onHaptic?.('light');
      return;
    }
    if (hit === this.sel) { this.sel = null; return; }
    if (hit === -1) { this.sel = -1; sound.pick(); return; }
    const m: Move = { from: this.sel, to: hit };
    const next = pour(this.level, this.state, m);
    if (!next) { this.say(m.from === -1 ? 'That glass is already full.' : m.to === -2 ? 'That glass is already empty.' : this.state[m.from] === 0 ? 'That glass is empty.' : 'That glass is already full.'); this.sel = hit >= 0 ? hit : null; return; }
    this.sel = null;
    this.startPour(m, next);
  }
  private startPour(m: Move, next: number[]) {
    if (this.mode === 'play') this.history.push(this.state.slice());
    this.pours++;
    const from = this.state.slice();
    this.state = next;
    this.anim = { m, t: 0, dur: this.reduced() ? 0.35 : m.from === -1 ? 1.0 : 1.7, from, to: next, done: () => this.afterPour(m) };
    sound.glug();
  }
  private afterPour(m: Move) {
    this.anim = null;
    this.glasses.forEach((v, i) => { v.back.setDepth(3 + i * 0.1); v.water.setDepth(3.03 + i * 0.1); v.front.setDepth(3.06 + i * 0.1); });
    this.updateTags();
    if (m.from >= 0) this.ringGlass(m.from, 0.04);
    if (m.to >= 0) this.later(140, () => this.ringGlass(m.to, 0.05));
    harp.hooks.onHaptic?.('light');
    if (solved(this.level, this.state)) this.win();
  }
  private ringGlass(i: number, vol: number) { const gl = this.level.glasses[i]; sound.ring(degree(gl, this.state[i]), vol); this.glasses[i].glowT = this.clock; }
  undo() {
    if (this.mode !== 'play' || this.anim || this.phase !== 'play' || !this.history.length) return;
    this.state = this.history.pop()!; this.pours = Math.max(0, this.pours - 1); this.sel = null;
    this.glasses.forEach((v, i) => (v.amount = this.state[i]));
    this.updateTags(); sound.undo();
  }
  hint() {
    if (this.mode !== 'play' || this.anim || this.phase !== 'play') return;
    const path = solve(this.level, this.state);
    if (!path || !path.length) return;
    this.hints++; this.hintMove = path[0]; this.hintT = this.clock; this.sel = null;
    const name = (k: number) => (k === -1 ? 'the spring' : k === -2 ? 'the basin' : `the ${['first', 'second', 'third', 'fourth', 'fifth'][k]} glass`);
    this.say(`Pour from ${name(path[0].from)} into ${name(path[0].to)}. ${path.length === 1 ? 'That tunes them all.' : `${path.length} pours to go.`}`);
    sound.hint();
  }
  private win() {
    this.phase = 'done';
    const st = Math.min(starsFor(this.pours, this.level.par), this.hints ? 2 : 3);
    // the glasses play their tune
    const tune = this.level.tune, gap = 0.42;
    tune.forEach((i, k) => this.later(200 + k * gap * 1000, () => { this.glasses[i].glowT = this.clock; }));
    sound.play(tune.map((i) => degree(this.level.glasses[i], this.state[i])), gap);
    const wished = this.level.glasses.map((g, i) => [g, i] as const).filter(([g]) => g.want !== null).map(([g, i]) => degree(g, this.state[i]));
    sound.chord(wished, 0.2 + tune.length * gap + 0.1);
    harp.hooks.onHaptic?.('success');
    const end = (0.2 + tune.length * gap + 1.2) * 1000;
    if (this.mode === 'play') this.later(end, () => harp.hooks.onFinish?.({ level: this.level, result: { pours: this.pours, par: this.level.par, stars: st, hinted: this.hints > 0 } }));
    else this.later(end + 1500, () => { const i = (SHOWCASE.indexOf(this.level.id) + 1) % SHOWCASE.length; this.show('menu', LEVELS.find((x) => x.id === SHOWCASE[i])!); });
  }
  private reduced() { return harp.reducedMotion; }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.clock += dt;
    if (this.mode === 'menu') this.runDemo(dt);
    const a = this.anim;
    this.glasses.forEach((v) => { v.tilt = 0; v.dx = 0; v.dy = 0; });
    let stream: [number, number, number, number] | null = null, arc = false;
    if (a && !this.paused) {
      a.t += dt;
      const e = Math.min(1, a.t / a.dur), { from, to } = a.m;
      // phases: move into place, pour, come back
      const inT = Math.min(1, e / 0.3), outT = Math.max(0, (e - 0.74) / 0.26), flow = Math.max(0, Math.min(1, (e - 0.3) / 0.44));
      const ease = (x: number) => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); }, u = outT > 0 ? 1 - outT : inT;
      if (from >= 0) {
        const src = this.glasses[from];
        let tx: number, ty: number, dir: number;
        // where the lip should end up: just over the far glass's rim (or the basin), then the pivot that puts it there
        // it comes from its own side, unless that would carry its foot off the screen
        const tx0 = to >= 0 ? this.glasses[to].x : this.basinPos.x;
        const fit = (d: number) => {
          const lx = to >= 0 ? tx0 - d * this.glasses[to].w * 0.18 : tx0 - d * 4, ly = to >= 0 ? this.glasses[to].y - this.glasses[to].h - 8 : this.basinPos.y - 14;
          const th = d * TILT, c = Math.cos(th), sn = Math.sin(th), rx = d * (src.w / 2) * 0.82, ry = -src.h;
          const px = lx - (rx * c - ry * sn), py = ly - (rx * sn + ry * c);
          const foot = this.glasses[from].h * 0.45 + 10, ends = [px - foot * sn, px - d * (src.w / 2) * c + src.h * sn];
          const over = Math.max(0, ...ends.map((e) => Math.max(8 - e, e - (this.viewW - 8))));
          return { d, px, py, th, over };
        };
        const own = fit(tx0 > src.x ? 1 : -1), other = fit(tx0 > src.x ? -1 : 1), pick = own.over > 0 && other.over < own.over ? other : own;
        dir = pick.d; tx = pick.px; ty = pick.py;
        src.back.setDepth(6); src.water.setDepth(6.03); src.front.setDepth(6.06);
        // lift clear of the glasses on the way, carry it over, then settle and tip
        const lo = Math.min(src.x, tx) - 4, hi = Math.max(src.x, tx) + 4, stemL = src.h * 0.45 + 10;
        const tops = this.glasses.filter((v, k) => k !== from && v.x + v.w / 2 > lo && v.x - v.w / 2 < hi).map((v) => v.y - v.h);
        const liftY = Math.max(20 + src.h, Math.min(src.y - 10, ty, ...tops.map((t) => t - stemL - 6)));
        const kr = ease(u / 0.35), kx = ease((u - 0.2) / 0.5), kt = ease((u - 0.55) / 0.45);
        src.dx = (tx - src.x) * kx; src.dy = (liftY - src.y) * kr + (ty - liftY) * kt; src.tilt = dir * TILT * kt;
        src.amount = a.from[from] + (a.to[from] - a.from[from]) * flow;
        if (flow > 0 && flow < 1) {
          // the lip: the bowl's rim on the pouring side, in the world
          const rim = this.local(src, dir * (src.w / 2) * 0.82, -src.h);
          const land = to >= 0 ? { x: this.glasses[to].x, y: this.glasses[to].y - (this.glasses[to].h * (a.from[to] + (a.to[to] - a.from[to]) * flow)) / this.level.glasses[to].cap } : { x: this.basinPos.x, y: this.basinPos.y };
          stream = [rim.x, rim.y, land.x, land.y];
        }
      }
      if (to >= 0) { this.glasses[to].amount = a.from[to] + (a.to[to] - a.from[to]) * flow; }
      if (from === -1 && to >= 0) { const dst = this.glasses[to]; if (flow > 0 && flow < 1) { arc = true; stream = [this.springPos.x, this.springPos.y, dst.x, dst.y - (dst.h * dst.amount) / this.level.glasses[to].cap]; } }
      sound.setStream(flow > 0 && flow < 1, to >= 0 ? this.glasses[to].amount / this.level.glasses[to].cap : 0.3);
      if (e >= 1) { sound.setStream(false); a.done(); }
    } else this.glasses.forEach((v, i) => (v.amount = this.state[i]));
    // a selected glass lifts a little
    if (this.sel !== null && this.sel >= 0) this.glasses[this.sel].dy = -8 + Math.sin(this.clock * 4) * 1.5;
    this.draw(stream, arc);
  }
  /** A point given in a glass's own frame (bowl bottom at 0, y up negative), in the world. */
  private local(v: GlassView, x: number, y: number) { const c = Math.cos(v.tilt), s = Math.sin(v.tilt); return { x: v.x + v.dx + x * c - y * s, y: v.y + v.dy + x * s + y * c }; }
  private draw(stream: [number, number, number, number] | null, arc = false) {
    const g = this.g, l = this.level, m = A.MOODS[l.chapter];
    g.clear();
    this.glasses.forEach((v, i) => {
      v.back.setPosition(v.x + v.dx, v.y + v.dy).setRotation(v.tilt);
      v.front.setPosition(v.x + v.dx, v.y + v.dy).setRotation(v.tilt);
      // water: level with the world, whatever the tilt, keeping the area it has standing upright
      const poly = this.polys[i], cap = l.glasses[i].cap, frac = Math.max(0, Math.min(1, v.amount / cap));
      v.water.clear();
      if (frac > 0.001) {
        const upright = A.below(poly, -frac * (v.h - 3)), want = A.area(upright);
        const world = poly.map(([x, y]) => { const p = this.local(v, x, y); return [p.x, p.y] as [number, number]; });
        let lo = Math.min(...world.map((p) => p[1])), hi = Math.max(...world.map((p) => p[1]));
        for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (A.area(A.below(world, mid)) > want) lo = mid; else hi = mid; }
        const wp = A.below(world, (lo + hi) / 2);
        if (wp.length > 2) {
          v.water.fillStyle(m.water, m.waterA); v.water.beginPath(); v.water.moveTo(wp[0][0], wp[0][1]); for (const [x, y] of wp.slice(1)) v.water.lineTo(x, y); v.water.closePath(); v.water.fillPath();
          // the surface: a bright line
          const surf = wp.filter(([, y]) => Math.abs(y - (lo + hi) / 2) < 0.5);
          if (surf.length >= 2) { const xs = surf.map((p) => p[0]); v.water.lineStyle(1.2, 0xffffff, 0.6); v.water.lineBetween(Math.min(...xs) + 1, (lo + hi) / 2, Math.max(...xs) - 1, (lo + hi) / 2); }
        }
      }
      // the glass rings: a soft halo
      const ge = this.clock - v.glowT;
      if (ge < 1.2 && Math.abs(v.tilt) < 0.05) { const al = (1 - ge / 1.2) * 0.5; g.lineStyle(2, Phaser.Display.Color.HexStringToColor(A.GEMS[i % A.GEMS.length]).color, al); g.strokeEllipse(v.x + v.dx, v.y + v.dy - v.h - 2, v.w * (1 + ge * 0.6), 8 * (1 + ge * 0.6)); }
      if (this.sel === i) { g.lineStyle(1.5, 0xfff0c8, 0.6); g.strokeRoundedRect(v.x - v.w / 2 - 6, v.y + v.dy - v.h - 10, v.w + 12, v.h + 20, 8); }
    });
    if (this.sel === -1) { g.lineStyle(1.5, 0xfff0c8, 0.6); g.strokeRoundedRect(this.springPos.x - this.springPos.w, this.tableY - this.springPos.h, this.springPos.w * 1.15, this.springPos.h, 8); }
    // the stream of water
    if (stream) {
      const [x1, y1, x2, y2] = stream;
      let pts: Phaser.Math.Vector2[];
      if (arc) {
        // from the spout, an arc of water over to the glass's mouth, then straight down
        const dst = this.glasses[this.anim!.m.to], rimY = dst.y - dst.h - 4, top = Math.min(y1, rimY) - 26;
        pts = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2((x1 + x2) / 2, top), new Phaser.Math.Vector2(x2, rimY)).getPoints(18);
        pts.push(new Phaser.Math.Vector2(x2, y2));
      } else pts = [new Phaser.Math.Vector2(x1, y1), new Phaser.Math.Vector2(x1 + (x2 - x1) * 0.15, y1 + (y2 - y1) * 0.4), new Phaser.Math.Vector2(x2, y2)];
      g.lineStyle(3, m.water, 0.55); g.strokePoints(pts);
      g.lineStyle(1, 0xffffff, 0.6); g.strokePoints(pts);
      for (let k = 0; k < 4; k++) { const a = this.clock * 9 + k * 1.6; g.fillStyle(0xffffff, 0.5); g.fillCircle(x2 + Math.cos(a) * 5, y2 - Math.abs(Math.sin(a)) * 4, 1); }
    }
    // a hint: an arc from one glass to another, pulsing
    const he = this.clock - this.hintT;
    if (this.hintMove && he < 3.5 && this.phase === 'play') {
      const hm = this.hintMove, a = Math.min(1, he * 3) * Math.min(1, (3.5 - he) * 2) * (0.6 + 0.4 * Math.sin(he * 7));
      const p1 = hm.from === -1 ? { x: this.springPos.x, y: this.springPos.y - 10 } : { x: this.glasses[hm.from].x, y: this.glasses[hm.from].y - this.glasses[hm.from].h - 12 };
      const p2 = hm.to === -2 ? { x: this.basinPos.x, y: this.basinPos.y - 14 } : { x: this.glasses[hm.to].x, y: this.glasses[hm.to].y - this.glasses[hm.to].h - 12 };
      const mx = (p1.x + p2.x) / 2, my = Math.min(p1.y, p2.y) - 40;
      g.lineStyle(2.5, 0xffe39a, a); const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(p1.x, p1.y), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(p2.x, p2.y)); curve.draw(g, 24);
      g.fillStyle(0xffe39a, a); g.fillTriangle(p2.x, p2.y + 4, p2.x - 6, p2.y - 6, p2.x + 6, p2.y - 6);
    }
    this.drawStave();
  }
  /** The tune on a little stave: each note in its glass's colour, filled once that glass is tuned. */
  private drawStave() {
    const s = this.stave; s.clear();
    if (this.mode !== 'play') return;
    const l = this.level, W = this.viewW, gap = 8, y0 = this.staveY, x0 = W * 0.13, x1 = W * 0.87, mid = y0 + 2 * gap;
    for (let k = 0; k < 5; k++) { s.lineStyle(1, 0xf6ead8, 0.3); s.lineBetween(x0, y0 + k * gap, x1, y0 + k * gap); }
    s.lineStyle(1.5, 0xf6ead8, 0.35); s.lineBetween(x0, y0, x0, y0 + 4 * gap); s.lineBetween(x1, y0, x1, y0 + 4 * gap); s.lineBetween(x1 - 4, y0, x1 - 4, y0 + 4 * gap);
    const tune = l.tune, ds = tune.map((i) => degree(l.glasses[i], l.glasses[i].want!)), centre = (Math.min(...ds) + Math.max(...ds)) / 2;
    const step = (x1 - x0 - 44) / Math.max(1, tune.length - 1);
    tune.forEach((i, k) => {
      const y = Math.max(y0 - gap * 1.5, Math.min(y0 + gap * 5.5, mid - (ds[k] - centre) * (gap / 2))), x = x0 + 20 + k * step;
      // ledger lines above or below the stave
      for (let ly = y0 - gap; ly >= y - 0.5; ly -= gap) { s.lineStyle(1, 0xf6ead8, 0.3); s.lineBetween(x - 9, ly, x + 9, ly); }
      for (let ly = y0 + 5 * gap; ly <= y + 0.5; ly += gap) { s.lineStyle(1, 0xf6ead8, 0.3); s.lineBetween(x - 9, ly, x + 9, ly); }
      const col = Phaser.Display.Color.HexStringToColor(A.GEMS[i % A.GEMS.length]).color, ok = this.state[i] === l.glasses[i].want;
      const ring = this.clock - this.glasses[i].glowT < 0.5 && this.phase === 'done';
      if (ring) { s.fillStyle(col, 0.25); s.fillCircle(x, y, 12); }
      if (ok) { s.fillStyle(col, 1); s.fillEllipse(x, y, 12, 9); } else { s.lineStyle(1.6, col, 0.9); s.strokeEllipse(x, y, 12, 9); }
      const up = y > mid; s.lineStyle(1.3, col, ok ? 0.95 : 0.55);
      if (up) s.lineBetween(x + 5.5, y - 1, x + 5.5, y - 26); else s.lineBetween(x - 5.5, y + 1, x - 5.5, y + 26);
    });
  }

  // ── attract mode ──────────────────────────────────────────────────────
  private runDemo(dt: number) {
    const d = this.demo; if (!d || this.anim || this.phase !== 'play') return;
    d.wait -= dt; if (d.wait > 0) return;
    if (d.k < d.path.length) { const m = d.path[d.k++], next = pour(this.level, this.state, m); if (next) this.startPour(m, next); d.wait = 0.5; }
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#120c10',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 1 },
    scene: [HarpScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
