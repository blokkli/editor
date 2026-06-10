import { computed, useAppConfig, type ComputedRef } from '#imports'
import type { ColorOption, ColorShade } from '../types/config'
import { colorOptions as moduleColorOptions } from '#blokkli-build/editor-config'

export type ConfigProvider = {
  colorOptions: ComputedRef<ColorOption[]>
  getColorOption: (id: string) => ColorOption | undefined
  getColorHex: (id: string) => string
  getShadeHex: (id: string) => string | undefined
  isColorEnabled: (id: string) => boolean
}

const FALLBACK_HEX = '#888888'

function parseId(id: string): { baseId: string; shadeId: string | undefined } {
  const dotIndex = id.indexOf('.')
  if (dotIndex === -1) {
    return { baseId: id, shadeId: undefined }
  }
  return {
    baseId: id.slice(0, dotIndex),
    shadeId: id.slice(dotIndex + 1),
  }
}

export default function (): ConfigProvider {
  const appConfig = useAppConfig()

  const colorOptions = computed<ColorOption[]>(() => {
    const overrides = (appConfig.blokkli?.colorOptions ?? {}) as Record<
      string,
      string | null | undefined
    >

    const result: ColorOption[] = []

    for (const [id, entry] of Object.entries(moduleColorOptions)) {
      const override = overrides[id]
      if (override === null) {
        continue
      }

      if ('shades' in entry) {
        const overrideHex = typeof override === 'string' ? override : undefined
        const baseHex = overrideHex ?? entry.shades[entry.mainShade]!
        const shades: ColorShade[] = Object.entries(entry.shades).map(
          ([shadeId, shadeHex]) => ({
            id: shadeId,
            hex: shadeId === entry.mainShade ? baseHex : shadeHex,
            isMain: shadeId === entry.mainShade,
          }),
        )
        result.push({
          id,
          hex: baseHex,
          label: entry.label,
          shades,
        })
      } else {
        const baseHex = typeof override === 'string' ? override : entry.hex
        result.push({ id, hex: baseHex, label: entry.label })
      }
    }

    return result
  })

  function getColorOption(id: string): ColorOption | undefined {
    const { baseId } = parseId(id)
    return colorOptions.value.find((c) => c.id === baseId)
  }

  function getColorHex(id: string): string {
    const { baseId, shadeId } = parseId(id)
    const option = colorOptions.value.find((c) => c.id === baseId)
    if (!option) {
      return FALLBACK_HEX
    }
    if (shadeId === undefined) {
      return option.hex
    }
    const shade = option.shades?.find((s) => s.id === shadeId)
    return shade?.hex ?? option.hex
  }

  function getShadeHex(id: string): string | undefined {
    const { baseId, shadeId } = parseId(id)
    if (shadeId === undefined) {
      return undefined
    }
    const option = colorOptions.value.find((c) => c.id === baseId)
    return option?.shades?.find((s) => s.id === shadeId)?.hex
  }

  function isColorEnabled(id: string): boolean {
    const { baseId, shadeId } = parseId(id)
    const option = colorOptions.value.find((c) => c.id === baseId)
    if (!option) {
      return false
    }
    if (shadeId === undefined) {
      return true
    }
    return option.shades?.some((s) => s.id === shadeId) === true
  }

  return {
    colorOptions,
    getColorOption,
    getColorHex,
    getShadeHex,
    isColorEnabled,
  }
}
