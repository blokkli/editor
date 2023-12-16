import type { BlokkliEditableDirectiveArgs } from '#blokkli/types'
import { defineNuxtPlugin } from '#imports'
import type { Directive } from 'vue'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('blokkli-editable', <
    Directive<HTMLElement, BlokkliEditableDirectiveArgs>
  >{
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
})
