// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    // https://vitepress.dev/guide/extending-default-theme#layout-slots
    return h(DefaultTheme.Layout, null, {})
  },
} satisfies Theme
