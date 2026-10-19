import { describe, expect, it } from 'vitest';
import { degree, moves, noteLabel, noteHz, pour, reach, solve, solved, starsFor } from './sim';
import { CHAPTERS, LEVELS, levelIndex } from './levels';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

describe('pieces', () => {
  it('has 24 pieces in three chapters of eight, with unique ids and names', () => {
    expect(LEVELS).toHaveLength(24);
    expect(CHAPTERS).toHaveLength(3);
    for (let c = 0; c < 3; c++) expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(24);
    expect(levelIndex(LEVELS[8].id)).toBe(8);
  });
  it('the spring and basin only come in the last chapter', () => {
    expect(LEVELS.filter((l) => l.chapter < 2).every((l) => !l.spring && !l.basin)).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 2).every((l) => l.spring && l.basin)).toBe(true);
  });
  it('par rises through each chapter', () => {
    for (let c = 0; c < 3; c++) { const p = LEVELS.filter((l) => l.chapter === c).map((l) => l.par); for (let i = 1; i < 8; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]); }
  });
});

describe('every piece', () => {
  for (const l of LEVELS) {
    it(`${l.id} ${l.name}: par is the true shortest, the wishes are real notes, and the tune uses them`, () => {
      const path = solve(l);
      expect(path).not.toBeNull();
      expect(path!.length).toBe(l.par);
      expect(solved(l, l.start)).toBe(false);
      let s = l.start; for (const m of path!) { const t = pour(l, s, m); expect(t).not.toBeNull(); s = t!; }
      expect(solved(l, s)).toBe(true);
      const wished = l.glasses.filter((g) => g.want !== null);
      expect(wished.length).toBeGreaterThan(0);
      for (const g of wished) { expect(g.want!).toBeGreaterThan(0); expect(g.want!).toBeLessThan(g.cap); }
      const notes = l.glasses.map((g) => (g.want === null ? null : degree(g, g.want))).filter((d) => d !== null);
      expect(new Set(notes).size).toBe(notes.length);
      expect(l.tune.every((i) => l.glasses[i].want !== null)).toBe(true);
      expect(new Set(l.tune).size).toBe(wished.length);
      // water is conserved without the spring and basin
      if (!l.spring && !l.basin) expect(s.reduce((a, b) => a + b, 0)).toBe(l.start.reduce((a, b) => a + b, 0));
      // glasses fit on the table: at most five
      expect(l.glasses.length).toBeLessThanOrEqual(5);
    });
  }
});

describe('pouring', () => {
  const l = { glasses: [{ cap: 8, top: 12, want: 4 }, { cap: 5, top: 14, want: null }, { cap: 3, top: 15, want: null }], start: [8, 0, 0] };
  it('runs until the first is empty or the second is full', () => {
    expect(pour(l, [8, 0, 0], { from: 0, to: 1 })).toEqual([3, 5, 0]);
    expect(pour(l, [3, 5, 0], { from: 1, to: 2 })).toEqual([3, 2, 3]);
    expect(pour(l, [3, 2, 3], { from: 2, to: 0 })).toEqual([6, 2, 0]);
  });
  it('refuses a pour that moves nothing', () => {
    expect(pour(l, [8, 0, 0], { from: 1, to: 0 })).toBeNull();
    expect(pour(l, [3, 5, 0], { from: 0, to: 1 })).toBeNull();
  });
  it('the classic eight, five and three: four measures in seven pours', () => {
    expect(solve(l)!.length).toBe(7);
    expect(reach(l).size).toBe(16);
  });
  it('a spring fills to the brim, a basin empties', () => {
    const sp = { ...l, spring: true, basin: true };
    expect(pour(sp, [0, 0, 0], { from: -1, to: 1 })).toEqual([0, 5, 0]);
    expect(pour(sp, [8, 0, 0], { from: 0, to: -2 })).toEqual([0, 0, 0]);
    expect(moves(sp).length).toBe(6 + 3 + 3);
  });
  it('a glass rings lower with more water, on a pentatonic scale', () => {
    expect(degree(l.glasses[0], 0)).toBeGreaterThan(degree(l.glasses[0], 4));
    expect(noteHz(0)).toBeCloseTo(196, 3);
    expect(noteHz(5)).toBeCloseTo(392, 3);
    expect([0, 1, 2, 3, 4, 5, 8].map(noteLabel)).toEqual(['G3', 'A3', 'B3', 'D4', 'E4', 'G4', 'D5']);
  });
});

describe('stars and save', () => {
  it('stars follow par', () => { expect(starsFor(4, 4)).toBe(3); expect(starsFor(6, 4)).toBe(2); expect(starsFor(7, 4)).toBe(1); });
  it('records the fewest pours and unlocks the next piece', () => {
    let s = freshSave();
    expect(isUnlocked(s, 1)).toBe(false);
    s = recordResult(s, LEVELS[0].id, 2, 5); s = recordResult(s, LEVELS[0].id, 3, 3); s = recordResult(s, LEVELS[0].id, 1, 9);
    expect(s.stars[LEVELS[0].id]).toBe(3); expect(s.best[LEVELS[0].id]).toBe(3); expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(3);
  });
  it('parses corrupt saves safely', () => { expect(parseSave('nope')).toEqual(freshSave()); expect(parseSave(JSON.stringify({ v: 1, stars: { zz: 3, a1: 9 } })).stars).toEqual({ a1: 3 }); });
});
