<template>
  <div
    class="bk select-text fixed inset-0 z-init-overlay flex bg-mono-50 text-mono-900 pointer-events-auto font-sans"
    @wheel.capture.stop
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @touchstart.stop
    @touchmove.stop
  >
    <Sidebar
      :entries="editorEntries"
      :active-id="activeEntry?.id ?? null"
      @select="onSelect"
      @close="$emit('close')"
    />
    <main class="flex-1 overflow-y-auto">
      <div v-if="activeEntry" class="max-w-[960px] mx-auto px-30 py-40">
        <header class="mb-30 pb-20 border-b border-b-mono-200">
          <h1 class="text-2xl font-bold m-0">{{ activeEntry.label }}</h1>
          <p
            v-if="activeEntry.description"
            class="mt-8 text-sm text-mono-700 max-w-[640px]"
          >
            {{ activeEntry.description }}
          </p>
        </header>
        <div
          v-if="activeEntry.kind === 'component'"
          class="flex flex-col gap-30"
        >
          <Renderer
            v-for="(variant, index) in activeEntry.variants"
            :key="`${activeEntry.id}-${index}`"
            :entry="activeEntry"
            :variant
          />
        </div>
        <div
          v-else-if="activeEntry.kind === 'snippet'"
          class="flex flex-col gap-30"
        >
          <SnippetRenderer
            v-for="(variant, index) in activeEntry.variants"
            :key="`${activeEntry.id}-${index}`"
            :entry="activeEntry"
            :variant
          />
        </div>
      </div>
      <div
        v-else
        class="h-full flex flex-col items-center justify-center gap-15 text-mono-500"
      >
        <Icon name="bk_mdi_widgets" class="size-50" />
        <p class="text-sm">
          {{ $t('styleguidePickComponent', 'Pick a component to inspect.') }}
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  useBlokkli,
  useRoute,
  useRouter,
} from '#imports'
import { Icon } from '#blokkli/editor/components'
import { editorEntries } from '../registry'
import Sidebar from '../Sidebar/index.vue'
import Renderer from '../Renderer/index.vue'
import SnippetRenderer from '../SnippetRenderer/index.vue'

defineEmits<{
  close: []
}>()

const { $t, ui } = useBlokkli()
const route = useRoute()
const router = useRouter()

const activeId = computed({
  get() {
    const id = route.query.bkStyleguideItem
    if (typeof id === 'string' && editorEntries.find((v) => v.id === id)) {
      return id
    }

    return editorEntries[0]?.id || ''
  },
  set(id) {
    router.replace({
      query: {
        ...route.query,
        bkStyleguideItem: id,
      },
    })
  },
})

const activeEntry = computed(
  () => editorEntries.find((entry) => entry.id === activeId.value) ?? null,
)

function onSelect(id: string) {
  activeId.value = id
}

ui.openDialog({ id: 'styleguide', alignment: 'center' })

onBeforeUnmount(() => {
  ui.closeDialog('styleguide')
})
</script>

<script lang="ts">
export default {
  name: 'Styleguide',
}
</script>
