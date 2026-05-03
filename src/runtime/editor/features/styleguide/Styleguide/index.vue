<template>
  <div
    class="bk bk-styleguide select-text"
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
    <main class="bk-styleguide-main">
      <div v-if="activeEntry" class="bk-styleguide-content">
        <header class="bk-styleguide-content-header">
          <h1>{{ activeEntry.label }}</h1>
          <p v-if="activeEntry.description">{{ activeEntry.description }}</p>
        </header>
        <div
          v-if="activeEntry.kind === 'component'"
          class="bk-styleguide-variants"
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
          class="bk-styleguide-variants"
        >
          <SnippetRenderer
            v-for="(variant, index) in activeEntry.variants"
            :key="`${activeEntry.id}-${index}`"
            :entry="activeEntry"
            :variant
          />
        </div>
      </div>
      <div v-else class="bk-styleguide-placeholder">
        <Icon name="bk_mdi_widgets" />
        <p>
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

<style lang="postcss">
.bk.bk-styleguide {
  @apply fixed inset-0 z-init-overlay flex bg-mono-50 text-mono-900;
  @apply pointer-events-auto;
  font-family: theme('fontFamily.sans');
}

.bk .bk-styleguide-sidebar {
  @apply w-300 shrink-0 flex flex-col bg-white border-r border-r-mono-200;

  .bk-styleguide-sidebar-header {
    @apply flex items-center justify-between px-20 py-15 border-b border-b-mono-200;

    h2 {
      @apply text-base font-bold m-0;
    }
  }

  .bk-styleguide-sidebar-close {
    @apply size-30 flex items-center justify-center rounded;
    @apply text-mono-700 hover:bg-mono-100 hover:text-mono-950;

    svg {
      @apply size-20 fill-current;
    }
  }

  .bk-styleguide-sidebar-search {
    @apply flex items-center gap-8 px-20 py-10 border-b border-b-mono-200;

    svg {
      @apply size-15 fill-mono-500 shrink-0;
    }

    input {
      @apply w-full bg-transparent border-none outline-none text-sm text-mono-900;
      @apply placeholder:text-mono-500;
    }
  }

  .bk-styleguide-sidebar-list {
    @apply flex-1 overflow-y-auto py-10;
  }

  .bk-styleguide-group {
    @apply mb-15 last:mb-0;

    h4 {
      @apply px-20 mb-5 text-xs font-semibold uppercase tracking-wide text-mono-500;
    }

    ul {
      @apply flex flex-col;
    }

    button {
      @apply w-full flex items-center justify-between text-left px-20 py-8 text-sm;
      @apply text-mono-700 hover:bg-mono-100 hover:text-mono-950;

      span {
        @apply text-xs text-mono-500 tabular-nums;
      }

      &.bk-is-active {
        @apply bg-accent-50 text-accent-900;

        span {
          @apply text-accent-700;
        }
      }
    }
  }

  .bk-styleguide-empty {
    @apply px-20 py-15 text-sm text-mono-500;
  }
}

.bk .bk-styleguide-main {
  @apply flex-1 overflow-y-auto;
}

.bk .bk-styleguide-content {
  @apply max-w-[960px] mx-auto px-30 py-40;
}

.bk .bk-styleguide-content-header {
  @apply mb-30 pb-20 border-b border-b-mono-200;

  h1 {
    @apply text-2xl font-bold m-0;
  }

  p {
    @apply mt-8 text-sm text-mono-700 max-w-[640px];
  }
}

.bk .bk-styleguide-variants {
  @apply flex flex-col gap-30;
}

.bk .bk-styleguide-variant {
  @apply bg-white border border-mono-200 rounded;
}

.bk .bk-styleguide-variant-header {
  @apply px-20 py-15 border-b border-b-mono-200;

  h3 {
    @apply text-base font-semibold m-0;
  }

  p {
    @apply mt-3 text-sm text-mono-600;
  }
}

.bk .bk-styleguide-variant-stage {
  @apply p-30;
}

.bk .bk-styleguide-variant-source {
  @apply border-t border-t-mono-200 bg-mono-50;

  > summary {
    @apply px-20 py-10 cursor-pointer text-xs font-semibold uppercase tracking-wide text-mono-600;
    @apply hover:bg-mono-100;
  }

  pre {
    @apply px-20 pb-15 m-0 text-xs font-mono text-mono-800 whitespace-pre-wrap;
  }
}

.bk .bk-styleguide-placeholder {
  @apply h-full flex flex-col items-center justify-center gap-15 text-mono-500;

  svg {
    @apply size-50 fill-current;
  }

  p {
    @apply text-sm;
  }
}
</style>
