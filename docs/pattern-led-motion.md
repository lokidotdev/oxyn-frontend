# Let the pattern lead the motion

*How oxyn decides which dots move, and when.*

A dot loader is two decisions stacked on top of each other: **where the dots sit** and **how they move**. Most loaders make those decisions separately. The dots get laid out in a pretty pattern, then a generic animation (top to bottom, left to right, center out) gets dragged across them. The result is busy. The motion cuts across the pattern instead of tracing it, and your eye reads it as noise.

oxyn follows one rule instead:

> **Whenever a component has a pattern, the animation is derived from that pattern.**

The pattern isn't just how the dots are arranged. It also sets the order they move in. When the motion follows the same lines as the layout, the whole thing looks *arranged*: you can see the structure, and then you watch it come alive along that structure.

---

## The idea: every dot gets a step

Each pattern gives every dot a **step**: a number that says where the dot sits in the pattern's own order. The animation never looks at screen position. It only looks at steps.

- A **staggered** animation (like Dot Lift) starts each dot `step × stagger` seconds after the first.
- A **travelling wave** (like Dot Tide) moves a band along the steps and affects the dots whose step is near the band's middle.

Dots that share a step move together as one unit. That's what keeps the motion tidy: a whole ring, a whole row or a whole stripe moves at once, never a scatter of single dots.

So designing the motion for a pattern comes down to one question: **what is the natural unit of this pattern, and what order do those units come in?**

---

## The globe patterns

### Rings: the ring is the unit

The rings pattern is built from latitude rings, each one evenly spaced around the sphere. So each ring moves as a single piece, and the step is simply the ring's number from the top pole.

```
step 0   ·            ← pole
step 1   · · · ·
step 2   · · · · · ·
step 3   · · · · · · ·
```

The wave moves from ring to ring, and every dot in a ring moves at the same moment.

### Grid: the row is the unit, with the columns kept aligned

The grid shares the rings' rows, but its dots also line up into vertical columns (meridians). Its step is the row number too. Because the columns stay aligned while a row moves, the motion keeps the grid's lattice: you see clean vertical lines bending in and out, not a smear.

### Spiral: the arm is the shape of the wave

The spiral (a Fibonacci sphere) has no rows at all. Its structure is its **arms**, the curved lines that wind from pole to pole. A plain top-to-bottom wave would slice straight across those arms and hide them.

So the spiral's step mixes two things: how far down the dot sits, and how far around the orb it sits.

```
step = height × rows  +  around × pitch
```

That turns the wave into a **diagonal stripe** that winds down the sphere, leaning the same way as the arms. You're watching the spiral being traced.

Two details make it work:

- **The dots still only move in and out.** The *stripe* travels around; the dots themselves never rotate or change height. The winding comes only from the order the dots move in.
- **The seam goes at the back.** A stripe that wraps around a sphere has to start and end somewhere. "around" is measured so that point lands on the far side of the orb, where the dots are smallest and faintest.

---

## Keep the wave narrow

Following the pattern only helps if you can actually see it. When too many rows move at once, the motion blurs into a general wobble and the pattern disappears.

oxyn keeps **only 3–4 rows in motion at a time**:

- **Staggered** (Dot Lift): the number of rows moving at once is about `duration ÷ stagger`. The defaults are `0.5s ÷ 0.14s ≈ 3.5`.
- **Travelling** (Dot Tide): the `width` prop sets the band in rows directly. The default is `3.5`, and the band fades out softly at both edges.

A narrow wave reads as one clear thing moving through the structure.

---

## Move along one axis

The motion should change one thing about each dot. In the globe components, dots move **only toward or away from the vertical axis**. A ring gets narrower or wider at the height it's at. It never slides up or down, and it never spins.

- **Dot Lift**: each ring pushes outward and settles back into place.
- **Dot Tide**: a band of rings pulls inward, toward the inside of the globe, and lets go. The pulled-in dots also shrink and dim, so the wave reads as passing *inside* the orb.

Because the dot's position is fixed except for that one in-and-out movement, all the visible structure comes from the pattern's order, which is the point.

---

## Checklist for new components

When you add a component that has a pattern:

1. **Name the unit.** What moves together: a ring, a row, an arm, a cell?
2. **Give every dot a step** in the pattern's own order, measured in rows, so `stagger` and `width` mean the same thing in every pattern.
3. **Drive the animation from steps only.** Never from x/y screen position.
4. **Keep the wave narrow:** about 3–4 units in motion at once.
5. **Move along one axis**, so the order carries the structure.
6. **Hide any seams** where the eye won't find them.

If you get those right, a new pattern comes with a matching animation for free.
