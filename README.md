# Basin Glassharp

By **BASIN JOVEX** · package `com.basinjovex.basinglassharp` · Expo owner `904-907`.

A calm puzzle game for Android about water and music: pour water between wine glasses until each one rings its note, then hear the tune you tuned.

**How it plays.**
- Each glass holds a whole number of measures. Tap a glass, then another, to pour: the water runs until the first is empty or the second is full.
- A glass rings lower the more water it holds. Some glasses have a coloured line: the measure that gives them their note.
- When every marked glass is in tune, the glasses play their tune and then a chord.
- Stars are wine glasses: three for tuning in par pours, two for a couple more. A hint shows the next pour but caps the piece at two.
- Undo, start again and hints are always there. The stave at the top shows the tune, and each note fills in as its glass comes into tune.

**Content.**
- 24 pieces in three chapters:
  - **Candlelight:** two or three glasses, the classic measuring puzzles.
  - **Quartets:** four glasses. Only some need tuning; the others are for measuring.
  - **The Spring:** a brass tap that fills a glass to the brim, and a copper basin that empties one.
- Every piece is generated and checked by a full search of its positions. Par is the true fewest pours, every wished note is a real tuning (neither empty nor brimming), and no two glasses want the same note.

**Look and sound.**
- Visuals:
  - A dark, candlelit room with damask walls and a walnut table.
  - Crystal goblets with etched measures. The water stays level as a glass is lifted, carried clear of the others and tipped.
  - Engraved note plaques, a little stave for the tune, and a room that changes mood each chapter.
- Sound: every glass rings a pure, shimmering tone at the pitch its water gives it, on a G pentatonic scale. Water pours with a stream that rises in pitch as the glass fills. Under it all are a clock and a slow bowed drone.

## Structure

| Path | What it is |
| --- | --- |
| `web/src/game/sim.ts` | Pouring, the spring and basin, the notes, breadth-first solver |
| `web/src/game/levels.json` | The 24 generated pieces |
| `web/tools/gen.ts` | The piece generator |
| `web/src/game/scene.ts` | The Phaser table: glasses, water, pours, stave |
| `web/brand/` | Icon, splash and feature graphic |
| `Delivery/` | Play Store icon, feature graphic and screenshots |
| `src/native/` | Expo WebView shell |

```bash
npm install && npm run web:install
npm run web:test     # 35 tests
npm run build:game && npm run validate:assets && npm run android
```

## Release builds

The Android release is configured for Google Play: target and compile SDK 36, R8 minification and resource shrinking, a non-debuggable release build, no Internet permission, and the game served offline from the app's own assets. Builds run on EAS; `eas.json` has two profiles:

```bash
npm install -g eas-cli && eas login
eas init                     # once: links this folder to your Expo project
npm run eas:apk              # preview profile: a signed APK for testing on devices
npm run eas:aab              # production profile: an AAB for Google Play (versionCode auto-increments)
```
