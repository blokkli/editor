import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('blokkli-editable', {
    created(el: HTMLElement, binding) {
      if (import.meta.client) {
        if (!window.location.search.includes('blokkliEditing')) {
          return
        }
        const fieldName = binding.value?.name || binding.arg
        if (!fieldName) {
          return
        }
        el.dataset.blokkliEditableField = fieldName
      }
    },
  })

  nuxtApp.vueApp.directive('blokkli-droppable', {
    created(el: HTMLElement, binding) {
      if (import.meta.client) {
        if (!window.location.search.includes('blokkliEditing')) {
          return
        }
        const fieldName = binding.value?.name || binding.arg
        if (!fieldName) {
          return
        }
        el.dataset.blokkliDroppableField = fieldName
      }
    },
  })
})
