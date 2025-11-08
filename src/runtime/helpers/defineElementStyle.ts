import {
  onBeforeUnmount,
  watch,
  computed,
  unref,
  type ComputedRef,
} from '#imports'

export function defineElementStyle(
  property: string,
  providedValue: ComputedRef<string | number> | (() => string | number),
  providedElement?: HTMLElement,
) {
  const element = providedElement ?? document.documentElement

  const value = computed(() => {
    if (typeof providedValue === 'function') {
      return providedValue()
    }
    return unref(providedValue)
  })

  const originalValue = element.style.getPropertyValue(property)

  watch(
    value,
    function (newValue) {
      const styleValue =
        typeof newValue === 'number' ? newValue + 'px' : newValue
      element.style.setProperty(property, styleValue)
    },
    {
      immediate: true,
    },
  )

  onBeforeUnmount(() => {
    if (originalValue) {
      element.style.setProperty(property, originalValue)
    } else {
      element.style.removeProperty(property)
    }
  })
}
