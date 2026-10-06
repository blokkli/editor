import VueClickAway from 'vue3-click-away'
import { defineNuxtPlugin } from '#imports'

/**
 * v-click-away: calls its handler on a click outside the element, e.g. to
 * close a popup.
 */
export default defineNuxtPlugin({
  name: 'sandbox:click-away',
  setup(nuxtApp) {
    nuxtApp.vueApp.use(VueClickAway)
  },
})
