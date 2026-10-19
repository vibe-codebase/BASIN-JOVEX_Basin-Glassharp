import type { Level as Spec } from './sim';
import DATA from './levels.json';

export type Level = Spec & { id: string; name: string; chapter: number; hint?: string; par: number; tune: number[] };
export const CHAPTERS = [
  { name: 'Candlelight', short: 'Candle', blurb: 'A few glasses and a jug of water. Pour from one to another until each rings its note.' },
  { name: 'Quartets', short: 'Quartets', blurb: 'Four glasses, four voices. Water is all you have, and none can be wasted.' },
  { name: 'The Spring', short: 'Spring', blurb: 'A spring to fill a glass to the brim, and a basin to empty it. Measure carefully.' },
];
const NAMES: [string, string, string?][] = [
  ['a1', 'First Note', 'Tap a glass, then tap another to pour into it. Water runs until the first is empty or the second is full.'],
  ['a2', 'Tuning Fork', 'A glass rings lower the more water it holds. Fill each glass to its coloured line.'],
  ['a3', 'Two Voices'], ['a4', 'Crystal'], ['a5', 'Lullaby'], ['a6', 'Nocturne'], ['a7', 'Overtones'], ['a8', 'Evensong'],
  ['b1', 'Quartet', 'Only the glasses with a line need tuning. The others are there to measure with.'],
  ['b2', 'Round'], ['b3', 'Canon'], ['b4', 'Madrigal'], ['b5', 'Air'], ['b6', 'Chaconne'], ['b7', 'Partita'], ['b8', 'Fugue'],
  ['c1', 'Spring Water', 'Tap the spring, then a glass, to fill it to the brim. Tap a glass, then the basin, to empty it.'],
  ['c2', 'Rain'], ['c3', 'Brook'], ['c4', 'Fountain'], ['c5', 'Cascade'], ['c6', 'Tide'], ['c7', 'Well'], ['c8', 'Glass Harmonica'],
];
const D = DATA as unknown as Record<string, Spec & { par: number; tune: number[] }>;
/** Within each chapter the pieces come in order of par; names and first hints follow their place. */
const ORDER = [0, 1, 2].flatMap((c) => NAMES.slice(c * 8, c * 8 + 8).map(([id]) => id).sort((a, b) => D[a].par - D[b].par || a.localeCompare(b)));
export const LEVELS: Level[] = NAMES.map(([slot, name, hint], i) => { const id = ORDER[i]; void slot; return { ...D[id], id, name, hint, chapter: Math.floor(i / 8) }; });
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
