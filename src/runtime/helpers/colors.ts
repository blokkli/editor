import type { ColorOption } from '../types/colors'

/**
 * Pure runtime helpers for color identity and id validation. No Vue/Nuxt
 * deps — safe to import from any layer (runtime components, editor
 * providers, agent tools, tests).
 *
 * Id space:
 *   - Flat color:   `<base>`            (no dot)
 *   - Ramped color: `<base>.<shade>`    (shade-qualified)
 *
 * The bare `<base>` form for a ramped color is NOT a valid color id anywhere
 * in the system. Everything that emits ids — the editor's `ColorDropdown`,
 * the chart helpers (`getColorIdAtIndex`), the agent's `chartColorEnum` —
 * uses the canonical shade-qualified form.
 *
 * Hex resolution at runtime goes through
 * `useBlokkliRuntimeConfig().resolveColorHex(id)`, which reads the merged
 * view directly from `app.config.blokkli.colorOptions`. No merge function
 * lives here — Nuxt's app.config layer already handles override merging.
 */

export const FALLBACK_HEX = '#888888'

export function parseColorId(id: string): {
  baseId: string
  shadeId: string | undefined
} {
  const dotIndex = id.indexOf('.')
  if (dotIndex === -1) {
    return { baseId: id, shadeId: undefined }
  }
  return {
    baseId: id.slice(0, dotIndex),
    shadeId: id.slice(dotIndex + 1),
  }
}

/**
 * Canonical id for a color option:
 *   - Flat color:   the bare id.
 *   - Ramped color: `<base>.<mainShade>`. Falls back to the first declared
 *                   shade if none is marked `isMain`.
 */
export function canonicalColorId(option: ColorOption): string {
  if (!option.shades?.length) return option.id
  const main = option.shades.find((s) => s.isMain) ?? option.shades[0]!
  return `${option.id}.${main.id}`
}

export function findColorOption(
  id: string,
  options: ColorOption[],
): ColorOption | undefined {
  return options.find((c) => c.id === parseColorId(id).baseId)
}

/**
 * Strict id validity: bare for flat colors, `<base>.<shade>` for ramped
 * colors with the shade actually declared. Bare ids for ramped colors and
 * shade-qualified ids for flat colors both return false.
 */
export function isColorIdValid(id: string, options: ColorOption[]): boolean {
  const { baseId, shadeId } = parseColorId(id)
  const option = options.find((c) => c.id === baseId)
  if (!option) return false
  if (option.shades?.length) {
    return shadeId !== undefined && option.shades.some((s) => s.id === shadeId)
  }
  return shadeId === undefined
}
