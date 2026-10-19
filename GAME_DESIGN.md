# Basin Glassharp: design notes

**Pillars.** Calm, tactile, musical. Every action makes a sound worth hearing, and every solved piece ends in a melody the player built.

**Core rule.** These are the classic water-jug puzzles (Bachet, Poisson, Tartaglia), turned into tuning. A glass's note is its empty pitch, counted down one pentatonic degree for each measure of water. The pentatonic scale is used so that any set of glasses sounds consonant together.

**Readability.**
- Every glass shows its current note on an engraved plaque, with its wished note (and octave) beneath.
- A dashed line in the glass's colour marks the wished measure, and etched ticks mark each measure.
- A selected glass lifts and is framed. An impossible pour explains itself ("That glass is already full.") and selects the glass that was tapped instead.

**The pour.**
- The glass lifts clear of every glass between it and its target, carries over, settles and tips.
- If coming from its own side would carry it off the screen, it comes in from the other side.
- The water is drawn as the part of the tilted bowl below a level line, found by bisection so its area matches the upright volume.

**Levels.**
- `tools/gen.ts` lays out glasses of random sizes, with the largest starting full (or none in the spring chapter).
- It runs a breadth-first search over every position and picks a target at the far end of the template's par range.
- Wishes go only on glasses holding a true tuning, with distinct notes. Par is the distance to the nearest position that satisfies every wish.
- Pieces are ordered by par within each chapter.

**Stars.** 3 if pours ≤ par, 2 if ≤ par + 2, otherwise 1. A hint caps the piece at 2.

**Accessibility.** Reduced motion shortens pours to 0.35 s. Colour is never the only cue: note names and the plaques carry the same information. Every control has a 46 px+ target and an aria label. It plays fully offline.
