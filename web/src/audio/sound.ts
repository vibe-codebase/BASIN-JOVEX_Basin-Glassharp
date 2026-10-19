/**
 * Glass Harp sound, synthesised with Web Audio. The glasses are the instrument: each rings with a pure tone and a
 * slow, beating shimmer, at the note its water gives it. Water pours with a gurgle that climbs as the glass fills;
 * the spring runs, the basin swallows. Under it all, a quiet room: a clock, and a cello drone that changes with
 * the chapter. When every glass is tuned, they play their tune.
 */
import { noteHz } from '../game/sim';

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private stream: { g: GainNode; bp: BiquadFilterNode } | null = null;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3.2);
      const wet = ctx.createGain(); wet.gain.value = 0.4;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      // the water stream: noise through a band that rises as the glass fills
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 3;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g).connect(this.sfx); src.start();
      this.stream = { g, bp };
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.55 * (this.ducked ? 0.5 : 1), t, 0.3);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  /** The room: a clock's soft tick, and a bowed drone that moves between two notes. */
  private schedule() {
    const ctx = this.ctx!;
    const step = 1.0, roots = [-10, -12, -8][this.chapter % 3];
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next, pos = this.beatN % 16;
      this.hiss(t, 0.02, 0.006, 3000, 6, this.music);
      if (pos === 0) this.bow(t, noteHz(roots), 15);
      if (pos === 8) this.bow(t, noteHz(roots + 2), 7.5);
      this.next += step; this.beatN++;
    }
  }
  private bow(t: number, f: number, dur: number) {
    const ctx = this.ctx!, o = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'sawtooth'; o2.frequency.value = f * 1.003; lp.type = 'lowpass'; lp.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.01, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(this.music); o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1, bus?: GainNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus ?? this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  /** A glass rings: a pure tone, a faint octave, and a slow beat as the glass shimmers. */
  ring(degree: number, vol = 0.06, dur = 2.6, at = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + at, f = noteHz(degree + 3);
    [[1, 1], [1.004, 0.5], [2.0, 0.18], [3.01, 0.05]].forEach(([m, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (m > 1.5 ? m : 1));
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  /** Water running, 0..1 for how full the glass it runs into is. */
  setStream(on: boolean, fill = 0) { if (this.ctx && this.stream) { const t = this.ctx.currentTime; this.stream.g.gain.setTargetAtTime(on ? 0.05 : 0, t, on ? 0.03 : 0.08); this.stream.bp.frequency.setTargetAtTime(500 + fill * 1600, t, 0.05); } }
  glug() { if (this.ctx) { const t = this.ctx.currentTime; for (let k = 0; k < 3; k++) this.hiss(t + k * 0.09, 0.08, 0.03, 400 + k * 120, 4); } }
  pick() { if (this.ctx) this.hiss(this.ctx.currentTime, 0.04, 0.02, 2400, 3); }
  tap() { if (this.ctx) this.ring(14, 0.012, 0.6); }
  undo() { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, 0.25, 0.02, 900, 1); } }
  hint() { if (this.ctx) { this.ring(12, 0.03, 1); this.ring(14, 0.025, 1, 0.12); } }
  /** The tune: each glass in turn, then a chord of them all. */
  play(degrees: number[], gap = 0.42) { degrees.forEach((d, i) => this.ring(d, 0.07, 2.8, 0.2 + i * gap)); }
  chord(degrees: number[], at: number) { degrees.forEach((d) => this.ring(d, 0.04, 3.5, at)); }
  star(i: number) { if (this.ctx) this.ring([10, 12, 15][i] ?? 15, 0.05, 1.8); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    return b;
  }
}
export const sound = new Sound();
