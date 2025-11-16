import { type Ref, ref } from 'vue'
import type { BlockIndicator } from '../../types'

export type IndicatorsProvider = {
  indicators: Ref<BlockIndicator[]>
  hovered: Ref<string>
  addIndicator: (indicator: BlockIndicator) => void
  removeIndicator: (id: string, uuid: string) => void
  setHovered: (uuid?: string | null) => void
}

export default function (): IndicatorsProvider {
  const indicators = ref<BlockIndicator[]>([])
  const hovered = ref('')

  function addIndicator(indicator: BlockIndicator) {
    indicators.value.push(indicator)
  }

  function removeIndicator(id: string, uuid: string) {
    indicators.value = indicators.value.filter(
      (v) => v.id !== id || v.uuid !== uuid,
    )
  }

  function setHovered(uuid?: string | null) {
    hovered.value = uuid ?? ''
  }

  return {
    indicators,
    hovered,
    addIndicator,
    removeIndicator,
    setHovered,
  }
}
