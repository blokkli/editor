import { ref, useAsyncData, watch } from '#imports'
import type { Ref } from 'vue'
import type { CompiledComposition } from '../types'

export const COMPILE_ROUTE = '/api/blokkli/composition/compile'

export function compileOnServer(source: string) {
  return $fetch<CompiledComposition>(COMPILE_ROUTE, {
    method: 'POST',
    body: { source },
  })
}

/**
 * The composition as the server compiled it. Server rendering puts it in the
 * payload. Until a changed source's answer arrives, the last one stays: the
 * browser never turns a source into CSS itself.
 */
export function useCompiledComposition(source: Ref<string>, key: string) {
  const { data } = useAsyncData(
    key,
    () =>
      source.value.trim()
        ? compileOnServer(source.value)
        : Promise.resolve(null),
    { watch: [source] },
  )

  const compiled = ref<CompiledComposition | null>(data.value ?? null)
  watch(data, (value) => {
    if (value || !source.value.trim()) {
      compiled.value = value ?? null
    }
  })
  return compiled
}
