import type { Scene } from "./loader-canvas";

/** Glide key for how much of animation `A` is on screen: 1 while it is the active one, 0 when it is gone. */
export type MixKey<A extends string> = `mix_${A}`;

/** One mix target per animation: 1 for the active one, 0 for the rest. They glide, so a switch cross-fades. */
export function mixTargets<A extends string>(names: readonly A[], active: A) {
  const out = {} as Record<MixKey<A>, number>;
  for (const name of names) out[`mix_${name}`] = name === active ? 1 : 0;
  return out;
}

/** `defaults` with every prop that was actually passed laid over it; an `undefined` prop keeps the default. */
export function withDefaults<T extends object>(defaults: T, props: { [P in keyof T]?: T[P] }): T {
  const out = { ...defaults };
  for (const key in props) {
    const value = props[key];
    if (value !== undefined) out[key] = value as T[typeof key];
  }
  return out;
}

/**
 * Runs several scenes as one, each faded by its `mix_<name>` glide. Switching the active animation fades
 * the old scene out while the new one fades in. A scene that is fully faded out holds its clock still.
 */
export function mixScenes<S, K extends string, L, A extends string>(
  scenes: Record<A, () => Scene<S, K, L>>,
): Scene<S, K | MixKey<A> | "alpha", L> {
  const live = (Object.keys(scenes) as A[]).map((name) => ({ key: `mix_${name}` as MixKey<A>, scene: scenes[name]() }));
  return {
    advance(dt, frame) {
      for (const { key, scene } of live) if (frame.v[key] > 0) scene.advance?.(dt, frame);
    },
    draw(ctx, frame) {
      const { v } = frame;
      const alpha = v.alpha;
      for (const { key, scene } of live) {
        const weight = v[key];
        if (weight <= 0) continue;
        // Scenes paint at `v.alpha`, so scaling it fades the whole scene.
        v.alpha = alpha * weight;
        scene.draw(ctx, frame);
      }
      v.alpha = alpha;
    },
  };
}
