# Designing the oxyn site

*Spacing, type, surfaces and motion for every page of the site. Where a rule comes from Apple's design guidance, it says so.*

This covers the **site**: the catalog, the component pages and the playground. For the loaders themselves, read [Building a component](./component-design.md) and [Let the pattern lead the motion](./pattern-led-motion.md).

The goal is that **nothing is random**. Every gap, radius and type size below is a choice you can point to. If a new screen needs a value that isn't here, add it to this doc first, then use it.

---

## 1. Principles

1. **The loader is the hero.** The site is a quiet frame around moving dots, dark or light. Chrome stays in muted grays, and only the stage holds content that moves. Don't add color, gradients or decoration that competes with it.
2. **Simplicity, not minimalism** (Apple). Show the common path first: preview, then parameters, then install. Advanced detail (props, source) sits one scroll or one tab deeper.
3. **Things that look the same behave the same** (Apple, *Familiarity*). Every card is built the same way, every toolbar button is the same height, and every label uses the same type.
4. **Grouping and mapping** (Apple). Put a control next to what it changes. The parameter panel sits beside the preview, its top edge level with the preview's, so it reads as that preview's controls.
5. **Response first** (Apple). Feedback starts on press, tracks the pointer 1:1 while dragging, and never waits for an animation to finish.

---

## 2. Color tokens

Defined in `src/styles.css` as OKLCH: dark values under `@theme`, light values under `:root[data-theme="light"]`. Use the tokens and never raw colors in components. The only literals allowed are the ones in this section (syntax colors and the loader dot color). If you need a new color, add it here and to `styles.css` first.

The site has two themes. `data-theme` on `<html>` is set before paint from the stored choice (`localStorage` key `oxyn-theme`), else the system preference, and the header toggle flips it (`src/shared/lib/theme.ts`). Both themes share hue 286; light mirrors dark's lightness so every layer and contrast relationship carries over.

| Token | Dark | Light | Use |
| --- | --- | --- | --- |
| `bg` | `oklch(0.129 0.003 286)` | `oklch(0.967 0.002 286)` | Page background, insets inside a card (`bg/40`), input wells |
| `surface` | `oklch(0.165 0.004 286)` | `oklch(0.985 0.001 286)` | Cards and panels, the stage |
| `raised` | `oklch(0.197 0.006 286)` | `oklch(0.998 0 0)` | Buttons, the active tab pill, slider tracks |
| `line` | `oklch(0.241 0.008 286)` | `oklch(0.912 0.004 286)` | Default 1px borders and dividers |
| `line-strong` | `oklch(0.296 0.011 286)` | `oklch(0.862 0.006 286)` | Hover borders, badges, the active pill's inner ring |
| `fg` | `oklch(0.947 0.003 286)` | `oklch(0.21 0.006 286)` | Primary text, values, active controls |
| `muted` | `oklch(0.639 0.012 286)` | `oklch(0.5 0.012 286)` | Secondary text, control labels, inactive tabs |
| `faint` | `oklch(0.452 0.011 286)` | `oklch(0.68 0.01 286)` | Section eyebrows, file names, index numbers |
| `glow` | `oklch(1 0 0 / 0.04)` | `oklch(0 0 0 / 0.035)` | Catalog card hover wash |
| `glitch-a` | `oklch(0.65 0.238 17.898)` | `oklch(0.58 0.238 17.898)` | Hero glitch word, red split |
| `glitch-b` | `oklch(0.844 0.146 209.285)` | `oklch(0.62 0.12 209.285)` | Hero glitch word, cyan split |

Text selection is `fg` at 15% (`color-mix`). Code highlighting uses the `--sh-*` variables on `.code`, with a darker set (L ≤ 0.55, same hues) for light.

**Loader dot color.** Loaders paint on canvas and their `color` param takes hex only, so the dot color is the one hex value: `#e4e4e7` in dark, `#27272a` in light (`DOT_COLOR` in `theme.ts`). The site swaps it in for the default through `useDotColor`, so a user-picked color is kept and the standalone component default stays `#e4e4e7`.

Layer from dark to light: **`bg` → `surface` → `raised`**. A surface sits one step above the layer it's on. Never put `raised` directly on `bg` for large areas. It's for small interactive things.

Hover changes the **border** (`line` → `line-strong`) or the **text** (`muted` → `fg`), never the fill.

---

## 3. Spacing

One 4px scale, the Tailwind defaults. Use only these steps:

| Step | px | Use |
| --- | --- | --- |
| `0.5` | 2 | Segmented control padding |
| `1` | 4 | Toolbar row padding inside a card |
| `1.5` | 6 | Icon-to-label gap, tight inline groups |
| `2` | 8 | **Card shell padding**, gap between toolbar buttons |
| `2.5` | 10 | Gap between a control's label and the control; table cell `py` |
| `3` | 12 | Toolbar bottom gap (`pb-3`), heading-to-badge gap, lede-to-content |
| `4` | 16 | **Inner padding** of wells, card footers, table cells `px`; page gutter on mobile |
| `6` | 24 | Gap between columns; gap between controls in the panel; page gutter on `sm+`; back link to title |
| `10` | 40 | **Gap between page blocks**: header → workspace, section → section, home rows |
| `16` / `24` | 64 / 96 | Hero padding (mobile / desktop); page bottom padding is `24` |

Rules:

- **Related things are closer than unrelated things** (proximity). Label → control (10) < control → control (24) < section → section (40).
- **Use `gap` and `space-y` on the parent**, not margins on children. Margins only for a one-off offset such as `mt-6` under the back link.
- **Nested radii shrink by the padding.** An outer `rounded-2xl` (16) with `p-2` (8) holds an inner `rounded-xl` (12), close to 16 − 8 and visually concentric. Don't put a `rounded-2xl` inside a `rounded-2xl`.
- Don't use odd steps (`3.5`, `7`, `9`, `11`) for layout spacing. They're allowed only for component sizes (`size-3.5` toggle knob, `size-7` card arrow).

---

## 4. Layout

- **Page container:** `mx-auto max-w-7xl px-4 sm:px-6`, the same as the header, so the logo, the back link and every card share one left edge.
- **Sticky header:** `h-14` (56px), translucent `bg-bg/80 backdrop-blur-md` with a bottom `line` border. Sticky things below it use `top-20` (80px = 56 + 24 gap).

### Component page

```
back link                                   (mt-8 from header)
title + badges + description   ← full width (mt-6)
┌──────────── preview card ───────────┐ ┌─ parameters ─┐   (mt-10)
│                                      │ │  sticky      │
└──────────────────────────────────────┘ │              │
Installation / Usage / Props  (space-y-10) │              │
                                          └──────────────┘
```

- Grid: `lg:grid-cols-[minmax(0,1fr)_300px]`, `gap-x-6 gap-y-10`.
- **The page header spans both columns.** The parameter panel's top edge lines up with the preview card's top edge. Never start a side panel level with the title. It then matches nothing.
- The panel spans both rows (`lg:row-span-2`) and is `sticky top-20` with `max-h-[calc(100dvh-6rem)]`. Its body scrolls inside the card, and the card's toolbar stays put.
- On mobile the DOM order is header → preview → parameters → docs, so the controls stay right under what they change.

### Home page

- Hero `py-16 sm:py-24`, centered, `max-w-2xl` heading, `max-w-xl` lede.
- Filter bar `mb-8`, rows `gap-10`. Tiles are sized so the next one peeks past the edge.

---

## 5. Surfaces: the card anatomy

Every panel on the component page is built the same way. **Match this when you add a panel.**

```
rounded-2xl border border-line bg-surface p-2      ← shell
├─ toolbar   flex items-center justify-between gap-2 p-1 pb-3
│    left:  Tabs or a title (font-mono text-xs, h-[34px], px-2)
│    right: toolbar buttons (h-8)
└─ well      rounded-xl border border-line …        ← content
```

| Panel | Toolbar left | Toolbar right | Well |
| --- | --- | --- | --- |
| Preview | View tabs | Copy, Fullscreen | `.stage` (dot grid) or code |
| Parameters | "Parameters" title | Reset | `bg-bg/40 p-4 space-y-6`, scrolls |

- The toolbar is **34px** tall, the height of a `Tabs` control. A plain title in its place gets `h-[34px]` so the two panels' wells start at the same y.
- **Toolbar buttons:** `h-8 rounded-lg border border-line bg-raised px-2.5 font-mono text-xs text-fg`, hover `border-line-strong`. Icon-only buttons are `size-8`. Disabled buttons drop to `opacity-40` and ignore pointer events. Don't hide them, so the layout doesn't shift.
- **Catalog cards** use the shell without the `p-2`: the stage bleeds to the edges, and a `border-t` footer is `px-4 py-3`.
- **Code blocks and tables** are `rounded-xl border border-line`, the inner radius, because they sit inside a section rather than a card.

---

## 6. Typography

Two families: **Diode** (`font-sans`) for titles and headings only, **Tessera** (`font-mono`) for everything you read in detail: descriptions, ledes, control labels, prop descriptions, values, tabs, buttons, code, file names, eyebrows. Diode's pixel shapes suit display sizes but get hard to read in running text.

| Role | Classes |
| --- | --- |
| Hero | `text-4xl sm:text-5xl font-semibold tracking-tight text-balance` |
| Page title | `text-3xl font-semibold tracking-tight` |
| Lede / description | `font-mono text-[15px] leading-relaxed text-muted`, `max-w-2xl` |
| Section eyebrow | `font-mono text-xs uppercase tracking-wider text-faint` |
| Section lede | `font-mono text-sm text-muted` |
| Card title | `text-sm font-medium` |
| Control label | `font-mono text-[13px] text-muted` |
| Table description | `font-mono text-[13px] text-muted` |
| Control value | `font-mono text-xs text-fg tabular-nums` |
| Buttons, tabs | `font-mono text-xs` |
| Meta (file name, index) | `font-mono text-[11px] text-faint` |
| Badge | `font-mono text-[10.5px] text-muted` |

Rules (Apple, *Details of UI Typography*):

- **Tracking depends on size.** Large type is tightened (`tracking-tight`). Small uppercase is opened up (`tracking-wider`). Body text stays at `0`. Never one letter-spacing for everything.
- **Leading depends on size too.** Tight on titles (the default), `leading-relaxed` on paragraphs.
- **Build hierarchy with weight and color before size.** The same `text-xs` reads as primary in `text-fg` and secondary in `text-muted`.
- **Numbers that change use `tabular-nums`** so values don't jitter while a slider moves.
- Cap line length: `max-w-2xl` for paragraphs.

---

## 7. Radii and borders

| Radius | px | Use |
| --- | --- | --- |
| `rounded-2xl` | 16 | Card shells |
| `rounded-xl` | 12 | Wells, code blocks, tables, the stage |
| `rounded-lg` | 8 | Buttons, segmented controls, inputs |
| `rounded-md` | 6 | Items inside a segmented control, the slider track |
| `rounded-full` | — | Badges, toggles, dots |

Every border is **1px**. Depth comes from the `bg → surface → raised` steps, not from shadows. The one shadow is the active tab pill's inset ring.

---

## 8. Controls

| Control | Spec |
| --- | --- |
| Segmented (`Tabs`) | `rounded-lg border bg-bg p-0.5`. Items `px-3 py-1.5`. The active pill slides between items (shared layout spring). Inside a form, `fill` stretches the items. |
| Slider (`InlineSlider`) | 20px track `bg-raised`, 10 tick dots, a 4×12 thumb that stretches on grab. Label and value sit on one row above. |
| Toggle | `h-5 w-9`. On means `fg` fill with a `bg` knob. Label on the left, switch on the right, one row. |
| Color | `rounded-lg border bg-bg px-2.5 py-1.5`, a 20px swatch, the hex in mono uppercase. |

- A **field** is a label row above the control, with a 10px gap (`space-y-2.5`). Fields stack 24px apart (`space-y-6`).
- Every control is reachable by keyboard and shows `focus-visible:ring-1 ring-fg/40`.
- Sliders: track the pointer 1:1 from the grab point, commit on each frame, and settle with a spring on release (Apple §2, §5). Clicking the track glides the thumb there.

---

## 9. Motion

Site chrome moves very little, so the loaders get the attention.

- **Springs for anything the user touches** (Apple §4). Use `SPRING_GLIDE` (`src/shared/lib/ease.ts`) for settling, which is close to critically damped. Bounce only after a gesture had momentum: the slider thumb's grab/release squash is the one place.
- **Interruptible.** Animate from the current value and never block input during a transition (Apple §3). The tab pill and slider already work this way.
- **Color and border changes** use `transition-colors` at the default duration. Nothing else on hover moves or scales.
- **Enter and exit along the same path** (Apple §7). If something slides in from the right, it leaves to the right.
- **Reduced motion:** springs become instant (`duration: 0`) and loaders hold still. Opacity and color changes stay.

---

## 10. Accessibility

- Text contrast: `fg` and `muted` on `surface` both pass AA for their sizes, in both themes. **`faint` is only for decoration and meta** (file names, indexes, eyebrows), never for something a user has to read to act.
- Segmented controls are `tablist`/`tab` when they switch panels and `radiogroup`/`radio` when they set a value.
- Icon-only buttons get an `aria-label`.
- Click targets are at least 32px tall in toolbars (`h-8`).
- Respect `prefers-reduced-motion` everywhere (see §9).

---

## 11. Before you ship a UI change

- [ ] Every spacing, radius, type and color value is in this doc.
- [ ] Checked in both dark and light themes.
- [ ] New panels use the card anatomy (§5), and side panels start level with the card they control.
- [ ] Edges line up: page gutter, card edges, and toolbar heights across neighboring panels.
- [ ] Hover changes only the border or the text color.
- [ ] Checked at 390px and 1440px wide. On mobile, controls sit right under what they change.
- [ ] Keyboard: tab through everything, with a focus ring on each stop.
- [ ] Reduced motion on: nothing slides or springs.
