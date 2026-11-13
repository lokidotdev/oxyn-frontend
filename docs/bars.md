# Bars: one ring for every AI state

*What each bar animation means, how it moves, and the timing behind it.*

The bars row is a fence of thin bars standing round a circle. Every animation is a way of telling the user what the AI is doing right now: reading a file, writing one, searching, waiting on a tool, finishing. Use the single components (`BarRead`, `BarWrite`, …) when a spot only ever shows one state, or `BarRing` when the state changes, since switching its `animation` prop glides the same bars from one motion into the next instead of cutting.

```tsx
<BarRing animation={state} direction="out" />
// "search" → "read" → "write" glides through search, read, edit
```

---

## Which animation for which state

| Animation | Component | AI state | What the user sees |
| --- | --- | --- | --- |
| `think` | `BarThink` | Thinking, running a command or tool | A bright head drags a fading tail round the ring. |
| `parallel` | `BarParallel` | Parallel tool calls, agents working together | 1–4 evenly spaced waves travel round together (`heads`). |
| `read` | `BarRead` | Reading a file, generic working | A small, steady wave lights bars more than it moves them, like a cursor going down lines. |
| `write` | `BarWrite` | Editing or writing a file | Bars are typed in bursts of four, each leaving a short mark; once the ring is written the marks are wiped. |
| `search` | `BarSearch` | Searching, grep, web search | The wave runs 8 bars ahead, backs up 3 and runs on, like hunting for a match. |
| `stream` | `BarStream` | Generating, tokens arriving | Short pulses chase round with uneven gaps: a burst of three, a pair, a long pause. |
| `transfer` | `BarTransfer` | Uploading (`out`) or downloading (`in`) | Bars fill to `progress`, the leading bar pulsing. With no `progress`, it fills and drains on a loop. |
| `ping` | `BarPing` | API call, MCP request, waiting on the network | A pulse goes out to 6 o'clock, waits, and comes back to 12: the request and its response. |
| `plan` | `BarPlan` | Running a multi-step plan or to-do list | The ring is cut into `steps` segments. Done steps hold, the `current` one sweeps, the rest wait. |

---

## Shared props

Every bar component takes these. `BarRing` takes all of them plus `animation`.

| Prop | Default | Meaning |
| --- | --- | --- |
| `bars` | 36 | Bars round the ring (12–72). |
| `barHeight` | 12 | Resting length of each bar, px. |
| `barWidth` | 2 | Thickness, px; capped so neighbors never overlap. |
| `radius` | 1 | Corner radius, px. |
| `extend` | 10 | How far the push carries a bar, px. |
| `direction` | `"out"` | `"out"` pushes away from the center, `"in"` toward it. Changing it glides the ring across. |
| `duration` | per animation | Seconds one bar's push takes. |
| `stagger` | per animation | Seconds between one bar and the next. |
| `size`, `color`, `minOpacity`, `paused`, `label` | | As on every oxyn loader. |

Props only some animations read:

| Prop | Used by | Meaning |
| --- | --- | --- |
| `heads` | `parallel` | Waves at once, 1–4 (default 2). |
| `progress` | `transfer` | 0–1. Leave it out to loop. Changes glide, so you can feed it raw upload events. |
| `steps` | `plan` | Steps in the plan, 2–8 (default 4). |
| `current` | `plan` | The step running now, from 0 (default 1). Set it to `steps` when all are done. Changes glide, so the finished step fills in. |

---

## How each one is timed

The curves are the oxyn tokens in `lib/ease.ts`: `easeOut` is `cubic-bezier(0.23, 1, 0.32, 1)` and `easeInOut` is `cubic-bezier(0.77, 0, 0.175, 1)`. They're picked the same way every time:

- **Something arriving or leaving** (a bar popping out, a mark being wiped) uses `easeOut`, so it moves the moment its turn comes.
- **Something moving on screen** (the search head backing up) uses `easeInOut`.
- **Constant travel** (every wave's head going round) is linear, and each bar's push is a raised-cosine bump, so a wave starts and ends at rest with no jolt.
- Bars stay inside the **3–4 moving at once** rule from [pattern-led-motion.md](./pattern-led-motion.md): roughly `duration ÷ stagger`.

| Animation | Push curve | `duration` | `stagger` | One loop |
| --- | --- | --- | --- | --- |
| `think` | `easeOut` snap over 20%, then the mirrored fall | 500ms | 50ms | 1.8s lap |
| `parallel` | bump | 240ms | 60ms | 2.2s lap |
| `read` | bump, about a third of the push | 320ms | 90ms | 3.2s lap |
| `write` | `easeOut` pop settling to a 35% mark; `easeOut` wipe | 200ms | 50ms | about 5s |
| `search` | bump; head moves on `easeInOut` | 240ms | 60ms | 0.75s per run-and-back |
| `stream` | bump | 80ms | 30ms | 1.1s lap |
| `transfer` | `easeOut` per bar; leading-bar pulse is a bump every 4 × `duration` | 160ms | 40ms | follows `progress` |
| `ping` | bump | 200ms | 40ms | 2.4s round trip |
| `plan` | bump through the current step; done steps hold at 40% | 240ms | 60ms | 0.8s per sweep (4 steps) |

These are the defaults in the single components. `BarRing` uses the same values per animation in the playground; in code it defaults to read's 320ms / 90ms, so pass `duration` and `stagger` when you switch to an animation that wants different ones.

---

## Behaviour you get for free

- **Reduced motion:** the ring holds still.
- **Pausing** coasts every clock to a stop and eases back up.
- **Changing props** (`bars`, `extend`, `direction`, `progress`, `current`, …) glides rather than jumps.

---

## Adding another bar animation

1. Add its name to `BarAnimation`, `BAR_ANIMATIONS` and `BAR_SPEND` in `src/registry/lib/bars.ts` (spend: `grow` stretches the leading end, `rise` moves the whole bar).
2. Give it a `case` in `barScene` that sets `lift` (0–1) for bar `i` from its place on the ring. Add a clock to `barCycles` and `phase` if it loops on its own timing.
3. Add `src/registry/bar-<name>/bar-<name>.tsx` passing `{ <name>: 1 }` to `barScene`, a definition in `features/states/bars/definition.ts`, and an entry in `states` and the `barRing` group.
4. Add `mix_<name>` to `BarRing`'s `scene()` and a row to the tables above.
