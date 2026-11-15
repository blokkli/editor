<template>
  <div
    v-if="compiled"
    ref="root"
    class="bk-composition"
    :class="tokens.rootClass"
    v-bind="{ [compiled.scope]: '' }"
  >
    <CompositionNodes
      :nodes="compiled.tree"
      :scope="compiled.scope"
      :children="childList"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  onBeforeUnmount,
  provide,
  useBlokkli,
  useHead,
  useId,
  useTemplateRef,
  watch,
} from '#imports'
import type { CompositionDocument } from '../../types'
import type { FieldListItem } from '#blokkli/types'
import type { FieldListItemTyped } from '#blokkli-build/generated-types'
import { parseDocument } from '../../helpers'
import { tokens } from '#blokkli-build/composition-definitions'
import {
  INJECT_EDIT_CONTEXT,
  INJECT_ENTITY_CONTEXT,
  INJECT_FIELD_LIST_BLOCKS,
  INJECT_FIELD_LIST_TYPE,
  INJECT_FIELD_PARENT_TYPE,
  INJECT_IS_EDITING,
  INJECT_IS_NESTED,
  INJECT_IS_PREVIEW,
  INJECT_MUTATED_FIELDS_MAP,
  INJECT_NESTING_LEVEL,
} from '#blokkli/helpers/injections'
import { useCompiledComposition } from '../../composables/useCompiledComposition'
import CompositionNodes from '../CompositionNodes'

const props = defineProps<{
  document: CompositionDocument | string | null | undefined
  /** The paragraphs the composition places: its field's list. */
  children?: Array<FieldListItem | null | undefined> | null
  /** The field that holds them. */
  fieldName?: string
}>()

const id = useId()
const root = useTemplateRef('root')
const source = computed(() => parseDocument(props.document).source)
const compiled = useCompiledComposition(source, 'bk-composition:' + id)

const entity = inject(INJECT_ENTITY_CONTEXT, null)
const isEditing = inject(INJECT_IS_EDITING, false)
const isPreview = inject(INJECT_IS_PREVIEW, null)
const mutatedFields = inject(INJECT_MUTATED_FIELDS_MAP, null)
const editContext = inject(INJECT_EDIT_CONTEXT, null)
const nestingLevel = inject(INJECT_NESTING_LEVEL, 0)
const fieldKey =
  entity && props.fieldName ? entity.uuid + ':' + props.fieldName : ''

// While editing and in the preview, the field's blocks as the edit state has
// them; else the visible ones.
const childList = computed<FieldListItem[]>(() => {
  if (
    (isEditing || isPreview?.value) &&
    mutatedFields &&
    editContext &&
    fieldKey
  ) {
    return (mutatedFields[fieldKey]?.list ?? []).map((item) => ({
      ...item,
      options: {
        ...item.options,
        ...(editContext.mutatedOptions[item.uuid] ?? {}),
      },
    }))
  }
  return (props.children ?? []).filter(
    (item): item is FieldListItem => !!item && item.isVisible !== false,
  )
})

// What a field gives its blocks: they're nested in the composition.
provide(INJECT_IS_NESTED, true)
provide(INJECT_NESTING_LEVEL, nestingLevel + 1)
provide(
  INJECT_FIELD_LIST_TYPE,
  computed(() => 'default' as const),
)
provide(
  INJECT_FIELD_LIST_BLOCKS,
  childList as unknown as typeof childList & {
    value: FieldListItemTyped[]
  },
)
provide(INJECT_FIELD_PARENT_TYPE, entity?.bundle ?? '')

// While editing, the field is registered without a list: the composition
// places its blocks, so the editor offers no place before, after or between
// them.
if (isEditing && entity && props.fieldName) {
  const { dom } = useBlokkli()
  const fieldName = props.fieldName
  const data = {
    fieldListType: 'default' as const,
    allowedFragments: [],
    isNested: true,
    nestingLevel: nestingLevel + 1,
    dropAlignment: null,
    zIndex: 0,
    isPager: false,
    hostPlacesBlocks: true,
  }
  let registered = false
  watch(
    root,
    (el) => {
      if (!(el instanceof HTMLElement)) return
      if (registered) {
        dom.updateFieldElement(entity, fieldName, el, data)
      } else {
        dom.registerField(entity, fieldName, el, data)
        registered = true
      }
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    if (registered) dom.unregisterField(entity, fieldName)
  })
}

// The CSS comes from the server, checked and scoped.
useHead({
  style: computed(() =>
    compiled.value?.css
      ? [{ key: 'bk-composition-' + id, textContent: compiled.value.css }]
      : [],
  ),
})
</script>
