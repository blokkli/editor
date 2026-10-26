import type { DefinitionString } from './blockOptions'

/**
 * A color option declared at build time. Its label is a string or one per
 * language.
 *
 * Two shapes:
 * - A flat color with a single hex value.
 * - A ramped color with a map of shades and an explicit `mainShade` that
 *   identifies which shade is the canonical/base swatch.
 *
 * For ramped colors, a chart can reference the base via the bare color id
 * (e.g. `red`) or any specific shade via the compound id `red.<shade>` (e.g.
 * `red.300`).
 */
export type ColorOption =
  | {
      label: DefinitionString
      hex: string
    }
  | {
      label: DefinitionString
      shades: Record<string, string>
      mainShade: string
    }
