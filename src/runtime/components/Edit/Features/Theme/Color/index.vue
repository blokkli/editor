<template>
  <tr class="bk-theme-editor-color">
    <td class="bk-theme-editor-color-shade">{{ shade }}</td>
    <td class="bk-theme-editor-color-hex">
      <input v-model="inputValue" type="text" maxlength="7" />
    </td>
    <td class="bk-theme-editor-color-buttons">
      <button
        v-if="inputValue !== initValue"
        @click.stop="inputValue = initValue"
      >
        <Icon name="revert" />
      </button>
    </td>
    <td class="bk-theme-editor-color-color">
      <input v-model.lazy="inputValue" type="color" :name="group + shade" />
    </td>
  </tr>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { Icon } from '#blokkli/components'
import { theme as configTheme } from '#blokkli/config'
import type {
  RGB,
  ThemeColorGroup,
  ThemeColorShade,
  ThemeContextColorGroup,
  ThemeContextColorShade,
} from '#blokkli/types'

const props = defineProps<{
  group: ThemeColorGroup | ThemeContextColorGroup
  shade: ThemeColorShade | ThemeContextColorShade
}>()

const { theme } = useBlokkli()

function rgbToHex(rgb: RGB): string {
  // Helper function to convert a single RGB component to a two-digit hexadecimal string
  const toHex = (component: number): string => {
    const hexValue = component.toString(16)
    return hexValue.length == 1 ? '0' + hexValue : hexValue
  }

  // Destructuring the RGB components from the input array
  const [r, g, b] = rgb

  // Converting each component to hex and concatenating them
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function hexToRgb(v: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(v)
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null
}

const initValue = computed(() =>
  rgbToHex(configTheme[props.group][props.shade]),
)

const inputValue = computed({
  get() {
    return rgbToHex(theme[props.group].value[props.shade])
  },

  set(hex: string) {
    const rgb = hexToRgb(hex)
    if (rgb) {
      theme.setColor(props.group, props.shade, rgb)
    }
  },
})
</script>
