import type { ParamDef } from '#/shared/lib/params'
import { sphereParams } from './sphere-params'

/** Params shared by every flat (2D) dot-sheet state, keyed for picking into a schema in display order. */
export const sheetParams = {
  dotShape: {
    kind: 'select',
    key: 'dotShape',
    label: 'Dot shape',
    description: 'Shape of each dot.',
    default: 'round',
    options: [
      { value: 'round', label: 'Round' },
      { value: 'square', label: 'Square' },
    ],
  },
  dotSize: {
    ...sphereParams.dotSize,
    description: 'Resting dot size in px.',
    default: 2.5,
    max: 5,
  },
  scale: {
    kind: 'slider',
    key: 'scale',
    label: 'Scale',
    description: 'How many times larger a dot grows at the peak of the animation.',
    default: 1.5,
    min: 1,
    max: 3,
    step: 0.1,
    unit: '×',
  },
  density: {
    kind: 'slider',
    key: 'density',
    label: 'Density',
    description: 'Dots across the width of the sheet.',
    default: 11,
    min: 5,
    max: 25,
    step: 1,
  },
  size: sphereParams.size,
  gap: sphereParams.gap,
  color: sphereParams.color,
  minOpacity: {
    kind: 'slider',
    key: 'minOpacity',
    label: 'Min opacity',
    description: 'Opacity of resting dots. Dots at full size are always fully opaque.',
    default: 0.25,
    min: 0,
    max: 1,
    step: 0.05,
  },
  paused: sphereParams.paused,
} satisfies Record<string, ParamDef>
