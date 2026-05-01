import { computed, type ComputedRef } from '#imports'
import type { ColorOption } from '../types/config'
import { colorOptions as moduleColorOptions } from '#blokkli-build/editor-config'

export type ConfigProvider = {
  colorOptions: ComputedRef<ColorOption[]>
  getColorOption: (id: string) => ColorOption | undefined
  getColorHex: (id: string) => string
}

export default function (): ConfigProvider {
  const colorOptions = computed<ColorOption[]>(() =>
    Object.entries(moduleColorOptions).map(([id, entry]) => ({
      id,
      hex: entry.hex,
      label: entry.label,
    })),
  )

  function getColorOption(id: string): ColorOption | undefined {
    return colorOptions.value.find((c) => c.id === id)
  }

  function getColorHex(id: string): string {
    return getColorOption(id)?.hex || '#888888'
  }

  return { colorOptions, getColorOption, getColorHex }
}
