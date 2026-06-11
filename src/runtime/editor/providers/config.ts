import { computed, useAppConfig, type ComputedRef } from '#imports'
import type { ColorOption, ColorShade } from '#blokkli/types/colors'
import { colorOptions as moduleColorOptions } from '#blokkli-build/editor-config'
import {
  canonicalColorId,
  findColorOption,
  isColorIdValid,
} from '#blokkli/helpers/colors'
import { useBlokkliRuntimeConfig } from '../../composables/useBlokkliRuntimeConfig'

export type ConfigProvider = {
  colorOptions: ComputedRef<ColorOption[]>
  getColorOption: (id: string) => ColorOption | undefined
  getColorHex: (id: string) => string
  isColorEnabled: (id: string) => boolean
  canonicalColorId: (option: ColorOption) => string
}

export default function (): ConfigProvider {
  const appConfig = useAppConfig()
  const { resolveColorHex } = useBlokkliRuntimeConfig()

  /**
   * The editor's structured view of available colors — same flat hex source
   * as the runtime (`appConfig.blokkli.colorOptions`), enriched with build-
   * time metadata (labels, shade structure, main flag) for the dropdown
   * UI. Disable rules:
   *   - bare `<id>: null` → family skipped entirely.
   *   - `<id>.<shade>: null` → that shade dropped from the ramp. If all
   *     shades end up dropped, the family is skipped.
   */
  const colorOptions = computed<ColorOption[]>(() => {
    const overrides = (appConfig.blokkli?.colorOptions ?? {}) as Record<
      string,
      string | null | undefined
    >
    const result: ColorOption[] = []
    for (const [id, entry] of Object.entries(moduleColorOptions)) {
      if (overrides[id] === null) continue

      if ('shades' in entry) {
        const shades: ColorShade[] = []
        for (const [shadeId, declaredHex] of Object.entries(entry.shades)) {
          const value = overrides[`${id}.${shadeId}`]
          if (value === null) continue
          shades.push({
            id: shadeId,
            hex: typeof value === 'string' ? value : declaredHex,
            isMain: shadeId === entry.mainShade,
          })
        }
        if (shades.length === 0) continue
        const main = shades.find((s) => s.isMain) ?? shades[0]!
        result.push({ id, hex: main.hex, label: entry.label, shades })
      } else {
        const value = overrides[id]
        result.push({
          id,
          hex: typeof value === 'string' ? value : entry.hex,
          label: entry.label,
        })
      }
    }
    return result
  })

  return {
    colorOptions,
    getColorOption: (id) => findColorOption(id, colorOptions.value),
    getColorHex: resolveColorHex,
    isColorEnabled: (id) => isColorIdValid(id, colorOptions.value),
    canonicalColorId,
  }
}
