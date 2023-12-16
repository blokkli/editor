import { defineNuxtPlugin } from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('blokkli-editable', {
    created(el: HTMLElement, binding) {
      if (process.client) {
        if (!window.location.search.includes('blokkliEditing')) {
          return
        }
        el.dataset.blokkliEditableField = binding.arg

        el.addEventListener('dblclick', (e) => {
          e.stopPropagation()
          e.preventDefault()
          el.dataset.originalText = el.textContent || ''
          // el.contentEditable = 'plaintext-only'
          el.contentEditable = 'true'
          el.focus()
        })
        el.addEventListener('focus', () => {
          el.dataset.originalText = el.textContent || ''
        })
        el.addEventListener('blur', () => {
          el.contentEditable = 'false'
          if (el.dataset.originalText === el.textContent) {
            return
          }
          const event = new CustomEvent('blokklieditable', {
            detail: {
              field: binding.arg,
              text: el.textContent,
            },
          })

          el.dispatchEvent(event)
        })
      }
    },
  })
})
