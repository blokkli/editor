import { computed, useRoute, type ComputedRef } from '#imports'

export default function (key: string): ComputedRef<string> {
  const route = useRoute()

  return computed(() => {
    const value = route.params[key]
    if (!value) {
      return ''
    }
    if (Array.isArray(value)) {
      return value[0] || ''
    }
    return value
  })
}
