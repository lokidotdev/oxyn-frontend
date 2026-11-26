# Waves: a voice meter for every AI state

*What each wave animation means, how it moves, and the timing behind it.*

The waves row is a line of upright bars whose heights change, like a voice or audio meter. Use the single components (`WaveThink`, `WaveRead`, …) when a spot only ever shows one state, or `WaveBars` when the state changes: switching its `animation` prop glides the same bars from one motion into the next instead of cutting.

```tsx
<WaveBars animation={state} align="center" />
```

---

## Which animation for which state

| Animation | Component | AI state | What the user sees |
| --- | --- | --- | --- |
| `think` | `WaveThink` | Thinking, speaking | Every bar sways on its own blend of three slow waves, tallest in the middle. |
| `idle` | `WaveIdle` | Idle, listening | The bars breathe together, a little from the middle out, barely rising. |
| `process` | `WaveProcess` | Processing | A steady wave marches left to right through every bar. |
| `load` | `WaveLoad` | Loading | Each bar bounces in turn, left to right, then the row rests. |
| `read` | `WaveRead` | Reading a file | A small wave scans left to right, lighting bars more than growing them. |
| `write` | `WaveWrite` | Writing a file | Bars are typed in bursts of three, each leaving a short mark; then the marks are wiped. |
| `upload` | `WaveUpload` | Uploading | Bars rise from a floor up to `progress`, the leading bar pulsing. With no `progress` it loops. |
| `edit` | `WaveEdit` | Editing a file | A cursor jumps between spots; the bar there pops and its neighbors ripple. |
| `plan` | `WavePlan` | Working through a plan | The row is cut into `steps` runs. Done steps hold, the `current` one sweeps, the rest wait. |
| `reason` | `WaveReason` | Reasoning | Two waves set off from either end and cross in the middle. |
| `search` | `WaveSearch` | Searching | A narrow head hunts across the row, running ahead and backing up, then hunts back. |
| `ping` | `WavePing` | API call, MCP request | A pulse leaves the middle for both ends, waits, and comes back. |

---

## Shared props

| Prop | Default | Meaning |
| --- | --- | --- |
| `bars` | 9 | Bars in the row (3–32). |
| `barWidth` | 6 | Width, px. Width and gap shrink together if the row would overflow. |
| `gap` | 6 | Space between bars, px. |
| `radius` | 3 | Corner radius, px; half the width makes pills. |
| `minHeight` | 15 | Height of a resting bar, px. |
| `maxHeight` | 60 | Height at the peak, px (capped to the canvas). |
| `align` | `"center"` | `center` grows up and down from the middle; `bottom` stands every bar on one floor. Changing it glides. |
| `duration`, `stagger` | per animation | See the timing table. `WaveBars` uses each animation's own when you leave them out. |
| `size`, `color`, `minOpacity`, `paused`, `label` | | As on every oxyn loader. |

Props only some animations read: `progress` (upload, 0–1, leave out to loop), `steps` (plan, 2–8, default 3) and `current` (plan, from 0, default 1).

---

## Timing

| Animation | Motion | `duration` | `stagger` |
| --- | --- | --- | --- |
| `think` | three sines at 1×, 2×, 3× the loop | 2.4s (one loop) | 0.3s |
| `idle` | one raised-cosine breath | 2.6s (one breath) | 0.08s |
| `process` | travelling cosine | 1.2s | 0.14s |
| `load` | bump | 420ms | 100ms |
| `read` | bump, about a third of the height | 360ms | 120ms |
| `write` | `easeOut` pop settling to a 35% mark; `easeOut` wipe | 200ms | 70ms |
| `upload` | `easeOut` per bar; leading-bar pulse every 4 × `duration` | 200ms | 70ms |
| `edit` | `easeOut` pop and mirrored fall; neighbors at 45% per step | 500ms | 60ms |
| `plan` | bump through the current step; done steps hold at 40% | 300ms | 90ms |
| `reason` | two bumps, combined without overshoot | 400ms | 100ms |
| `search` | bump on a head moving on `easeInOut` | 300ms | 90ms |
| `ping` | bump | 300ms | 70ms |

The values live in `WAVE_TIMING` in `src/registry/lib/waves.ts`; the single loaders, the group and `groups.ts` all use the same numbers.

---

## Adding another wave animation

1. Add its name to `WaveAnimation`, `WAVE_ANIMATIONS`, `WAVE_TIMING` and `WAVE_SPEND` in `src/registry/lib/waves.ts`.
2. Give it a `case` in `waveScene` that sets `lift` (0–1) for bar `i`. Add a clock to `waveCycles` if it loops on its own timing.
3. Add `src/registry/wave-<name>/wave-<name>.tsx` passing `{ <name>: 1 }` to `waveScene`, a definition in `features/states/waves/definition.ts`, and entries in `states`, the `waveBars` group and `use-cases.ts`.
4. Add `mix_<name>` to `WaveBars`'s `scene()` and a row to the tables above.
