import { type Ref, ref } from 'vue'
import type { BlockIndicator } from '../../types'

export type IndicatorsProvider = {
  /**
   * List of all active block indicators.
   *
   * Indicators are visual badges/icons that appear on blocks
   * (e.g., anchor icons, schedule indicators, etc.).
   */
  indicators: Ref<BlockIndicator[]>

  /**
   * UUID of the currently hovered block.
   *
   * Used to show/hide hover-specific indicators.
   */
  hovered: Ref<string>

  /**
   * Add a block indicator.
   *
   * Registers a new indicator to be displayed on a block.
   *
   * @param indicator - The indicator configuration
   */
  addIndicator: (indicator: BlockIndicator) => void

  /**
   * Remove a block indicator.
   *
   * Removes an indicator based on its ID and the block UUID.
   * Both must match to remove the indicator.
   *
   * @param id - The indicator ID
   * @param uuid - The block UUID
   */
  removeIndicator: (id: string, uuid: string) => void

  /**
   * Set the currently hovered block.
   *
   * Updates the hovered state used to show hover-specific indicators.
   *
   * @param uuid - The block UUID, or null/undefined to clear
   */
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
