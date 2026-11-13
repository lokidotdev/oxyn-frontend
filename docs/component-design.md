# Building a component

*The rules every oxyn loader follows, from the file layout to how it moves.*

A component here is two things: a **registry file** (the code users copy or install) and a **catalog definition** (what the site shows about it: name, params, row). Both are found from one slug, so most of the rules below are about keeping those two in step.

For *how the dots should move* on a patterned component, read [Let the pattern lead the motion](./pattern-led-motion.md) as well. This doc covers everything else.

---

## 1. Files and naming

| What | Where |
| --- | --- |
| Component | `src/registry/<slug>/<slug>.tsx` |
| Shared drawing code | `src/registry/lib/*.ts(x)` |
| Catalog definition | `src/features/states/<name>/definition.ts` |
| Catalog list | `src/features/states/index.ts` (`states`) |
| Groups (one component per row) | `src/features/states/groups.ts` (`groups`) |

- The **slug** is kebab-case and unique: `dot-think`, `square-think`.
- The file **must export a component named after the slug in PascalCase** (`dot-think` → `DotThink`), plus `export default DotThink`. `defineState` throws if it can't find it.
- Export the props interface as `<Name>Props`, and any string-union types the props use (`DotThinkPattern`).
- Name single loaders `<shape>-<motion>` (`circle-process`) or `dot-<motion>` for globes. Name groups `dot-<shape>` (`dot-globe`).

---

## 2. The file has to ship on its own

Users get one `.tsx` file that needs only React. `scripts/registry/inline.ts` builds it by pasting in every lib declaration the component reaches. That only works if you follow these rules:

- **Start with `"use client";`.**
- **Relative imports go only to `src/registry/lib`.** Never import another component, `#/` aliases or site code.
- **Package imports must be named imports** (`import { useRef } from "react"`). No default, namespace or renamed imports.
- **Every top-level name in lib must be unique across all lib files.** Two lib files can't both declare `REALIGN` or `type Key`. Prefix constants with what they belong to (`CASCADE_REALIGN`, `TIDE_SUNK_OPACITY`).
- **Lib code lands below the component.** The component's module-level code may *call* lib functions (`const shape = sheetShape("square")`) but must not *read* lib `const`s at load time. Read them inside functions instead (`function scene() { return sheetScene(pulseMotion); }`, or `scene={spinMotion.scene}` in JSX).
- Lib modules may import only other lib modules and packages.
- Don't add runtime dependencies. Canvas 2D and React are the whole toolkit.

`pnpm registry:build` evaluates every shipped file and fails if one doesn't stand on its own.

---

## 3. Props

Every loader takes the same base shape:

```tsx
export interface FooProps extends Omit<HTMLAttributes<HTMLDivElement>, "color"> {
  // …component-specific props…
  /** Canvas size in px (the loader is square). */
  size?: number;
  /** Dot color, any CSS color. */
  color?: string;
  /** Coast to a stop on the current frame. Turning it back off eases the animation back up to speed. */
  paused?: boolean;
  /** Accessible name; the wrapper is role="status". */
  label?: string;
}
```

- **Every prop is optional** and has a JSDoc comment. Write it for the person reading autocomplete: what it does, its unit, and its range where that matters.
- **Defaults live in the destructuring**, not in a separate object: `size = 160, color = "#e4e4e7", paused = false, label = "Thinking"`.
- Spread `...rest` onto the wrapper so `className`, `style` and other div props work.
- Use these names when the meaning matches, so props mean the same thing in every loader:

  | Prop | Meaning |
  | --- | --- |
  | `duration` | Seconds for the main motion of one loop |
  | `gap` | Seconds to rest between loops |
  | `stagger` | Seconds between one unit starting and the next |
  | `direction` / `from` | Which way it travels / which end it starts from |
  | `density` | How many dots (rows, or dots per row) |
  | `dotSize` | Dot diameter in px |
  | `minOpacity` / `backOpacity` | Opacity of resting / far-side dots |

- Use string unions for choices (`"left" | "right"`), never booleans like `reverse`.
- Use units users think in: seconds, px, degrees, fractions of the radius.

---

## 4. Drawing: use `LoaderCanvas`

Don't write your own `requestAnimationFrame` loop. `LoaderCanvas` (`src/registry/lib/loader-canvas.tsx`) already provides gliding props, pausing that coasts, shape cross-fades, reduced motion, high-DPI rendering and a loop that sleeps when idle. Give it four things:

```tsx
<LoaderCanvas settings={settings} targets={targetsOf} shape={shape} scene={scene} label={label} {...rest} />
```

- **`settings`**: every resolved prop, as one object.
- **`targets(settings)`**: every *number* the drawing reads. Each one glides to its new value when a prop changes.
- **`shape`** (optional): `{ key, build }` for geometry. When `key` changes (pattern, density), the old shape fades out while the new one fades in.
- **`scene()`**: called once on mount. It returns `advance(dt, frame)`, which moves its own clock, and `draw(ctx, frame)`, which paints a cleared canvas.

Rules for scenes:

- **Nothing jumps.** Turn every choice into a number so it can glide: `direction: "left" → 1, "right" → -1`, `from: "bottom" → 1, "top" → 0`. Write the math so values *between* those ends still look right (e.g. `d + (steps - 2 * step) * fromBottom`).
- **Keep a phase, not a timestamp.** Advance it as `phase = (phase + (dt * v.rate) / cycle) % 1`. Scaling by `v.rate` makes `paused` coast to a stop, and a phase stays continuous when `duration` changes mid-loop.
- **Guard every input**: `Math.max(0.05, v.duration)`, `Math.max(0, v.gap)`. Gliding values pass through odd places.
- **Read color through the targets.** Spread `colorTargets(color)` (or the `sheetTargets` / `globeTargets` that include it), fill with `rgb(v)`, and multiply opacity by `v.alpha`.
- **Leave room at the edges.** Inset by the biggest a dot can get, so nothing clips at the peak of the motion.
- **Don't allocate in `draw`.** Reuse arrays built in `shape.build` (see `placed` and `order` in `globe.ts`).
- Don't handle reduced motion yourself; `LoaderCanvas` already holds still and applies changes at once.

### Reuse the shared building blocks

- **Flat sheets of dots**: `sheetShape(layout)`, `sheetTargets`, and a `SheetMotion` (`{ targets, cycle, swell }`) in `lib/sheet-motions.ts`, drawn with `sheetScene(motion)`.
- **Dot spheres**: `globeShape`, `globeTargets`, `drawGlobe`, and a motion (`{ targets, scene }`) in `lib/globe-motions.ts`.

**Put a new motion in the motions file, not in the component.** Then the single loader and its row's group component run the same code. A single loader stays small:

```tsx
function targetsOf(s: Settings) {
  return { ...sheetTargets(s), ...pulseMotion.targets(s) };
}

function scene() {
  return sheetScene(pulseMotion);
}
```

---

## 5. Motion and look

- Follow [Let the pattern lead the motion](./pattern-led-motion.md): drive the animation from the pattern's own order, keep about 3–4 units moving at once, move each dot along one axis, and hide seams at the back.
- Default color `#e4e4e7`, default `size` 160, card `size` 150.
- Every loop should start and end at rest with no snap: use cosine or sine bumps and eased turns, not linear ramps that cut off.
- The defaults should look good with no props at all. They're what most people will ship.

---

## 6. The catalog definition

```ts
export const dotThink = defineState({
  slug: 'dot-think',
  name: 'Dot Think',
  summary: 'One line for the shadcn registry.',
  description: 'A sentence or two for the component page.',
  shape: 'globe',        // which home row it sits in
  dimension: '2.5D',     // '2D' or '2.5D'; drives the home filter
  cardProps: { size: 150 },
  params: [ /* one ParamDef per prop, in display order */ ],
})
```

- **One param per prop**, except `label` and `className`/`style`, which the props table adds itself.
- **The param's `default` must equal the default in the component.** Its `description` should match the JSDoc. These are written twice, so check both when you change one.
- Reuse the shared param sets (`sphereParams`, `sheetParams`) and override only what differs (`{ ...p.gap, default: 0.5 }`).
- Order params: layout (pattern, dot shape, dot size, density, size), then timing (duration, stagger, gap, direction), then look (tilt, opacity, color), then `paused` last.
- Slider ranges should cover what looks good, not everything that's valid.
- Add the definition to `states` in `src/features/states/index.ts`. The registry, the home grid and the component route all read from that list.

---

## 7. Groups: one component per row

**Every home row is one component.** A row's loaders are the same dots running different animations, so the row also ships as a single group component whose `animation` prop picks the motion (`DotGlobe`, `DotSquare`, `DotCircle`). Only a few params change with the animation; everything else (pattern, size, color, tilt…) is shared.

Each animation also stays a single loader (`DotWork`, `DotReason`…) for people who want just that one. Both are built from the same motion in `lib/`, so they can't drift apart.

> **Adding an animation is never just a new single loader.** In the same change, add it to its row's group, so the group's `animation` picker offers it. A new single loader that isn't in its row's group is unfinished. If you create a new row and it has two or more animations, give it a group (`dot-<shape>`).

### Adding an animation to a row

1. **Motion**: put it in `lib/globe-motions.ts` or `lib/sheet-motions.ts` (see section 4), never in the component.
2. **Single loader**: `src/registry/<slug>/<slug>.tsx` and its definition, added to `states` in `src/features/states/index.ts`.
3. **Group component** (`src/registry/dot-<shape>/dot-<shape>.tsx`):
   - add the name to the `…Animation` union and `ANIMATIONS`, and describe it in the comment above the union;
   - add any new props, starting their JSDoc with the animations that use them (`/** reason: … */`); if it reuses a shared prop (`duration`, `gap`) with its own meaning, name it in that prop's JSDoc too;
   - add new props to `DEFAULTS` and to the `withDefaults(DEFAULTS, { … })` call;
   - add its settings type to `Motion`, spread its `targets` into `targetsOf`, and add its scene to `scene()`.
4. **Group definition**: add `{ value, label, from: theSingleDefinition }` to the group's `animations` in `src/features/states/groups.ts`. The playground takes that animation's params from the single definition, so there's nothing else to declare.
5. Update the group's `description` in `groups.ts` if it lists the animations.

### Group rules

- **One default per prop across the whole group.** Switching animation must never change another prop's value, so a prop the user didn't pass takes the group's `DEFAULTS`, the same for every animation. Where the single loaders disagree on a default, the group picks one (`defaults` in `groups.ts`) and it must equal `DEFAULTS` in the component. The one exception: when the shared default would break an animation's motion (Dot Globe's lift would push ~10 rings at once at the shared timing), that animation gets its own default, set on its entry in `groups.ts` and in `ANIMATION_DEFAULTS` in the component. A value the user passes still applies to every animation.
- **Target keys must stay the same while mounted.** `targetsOf` spreads every animation's targets, not only the active one's, so switching never adds a key.
- **Switching must not jump.** Mix weights (`mixTargets`) glide from 0 to 1. Sheets blend each dot's swell (`sheetMixScene`); globes cross-fade the scenes (`mixScenes`).
- Fall back to the first animation if `animation` is something unknown.

### Installing

`pnpm registry:build` ships every single loader *and* every group as its own shadcn item, from the same catalog. Users who want one animation install the single loader (`dot-work`); users who want to switch install the group (`dot-globe`). Each shipped file inlines the lib code it uses, so the two never depend on each other.

---

## 8. Before you're done

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm registry:build` passes and lists the new component.
- [ ] `pnpm dev`: the card shows in the right row and the component page loads with no console errors.
- [ ] Every slider moved end to end, every select switched, and color changed: everything glides, nothing jumps, nothing clips.
- [ ] Turning `paused` on coasts to a stop, and turning it off eases back up to speed.
- [ ] With reduced motion on (OS setting or DevTools), the loader holds still.
- [ ] The shipped file (Code tab or `generated/registry/<slug>/<slug>.tsx`) reads cleanly on its own.
- [ ] The new animation is in its row's group: it shows in the group's Animation picker, its params appear when picked, and switching to and from it is smooth.
- [ ] Commit the regenerated `registry.json` and `public/r/*.json` along with the source.
