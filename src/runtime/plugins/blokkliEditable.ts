import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('blokkli-editable', {
    created(el: HTMLElement, binding) {
      if (process.client) {
        if (!window.location.search.includes('blokkliEditing')) {
          return
        }
        const fieldName = binding.value?.name || binding.arg
        if (!fieldName) {
          return
        }
        el.dataset.blokkliEditableField = fieldName

        if (binding.value && typeof binding.value === 'object') {
          el.dataset.blokkliEditableFieldConfig = JSON.stringify(binding.value)
        }
      }
    },
  })

  nuxtApp.vueApp.directive('blokkli-droppable', {
    created(el: HTMLElement, binding) {
      if (process.client) {
        if (!window.location.search.includes('blokkliEditing')) {
          return
        }
        const fieldName = binding.value?.name || binding.arg
        if (!fieldName) {
          return
        }
        el.dataset.blokkliDroppableField = fieldName

        if (binding.value && typeof binding.value === 'object') {
          el.dataset.blokkliDroppableFieldConfig = JSON.stringify(binding.value)
        }
      }
    },
  })
})
