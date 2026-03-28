<template>
  <button
    :id="'bk-menu-list-button-' + id"
    class="bk-menu-list-button grid items-center pl-15 pr-20 py-15 gap-x-10 w-full text-left whitespace-nowrap text-mono-950 text-sm lg:hover:bg-mono-100 border-b border-b-mono-200"
    :disabled="disabled"
    :class="type ? 'bk-is-' + type : ''"
    @click.prevent.stop="onClick"
  >
    <div class="bk-menu-list-icon">
      <slot>
        <Icon v-if="icon" :name="icon" />
      </slot>
    </div>
    <strong>{{ title }}</strong>
    <span>{{ description }}</span>
  </button>
</template>

<script lang="ts" setup>
import type { BlokkliIcon } from '#blokkli-build/icons'
import { Icon } from '#blokkli/editor/components'

defineProps<{
  id: string
  title: string
  description: string
  disabled?: boolean
  icon?: BlokkliIcon
  type?: 'success' | 'danger' | 'yellow'
}>()

const emit = defineEmits(['click'])

function onClick() {
  emit('click')
}
</script>

<script lang="ts">
export default {
  name: 'MenuButton',
}
</script>

<style lang="postcss">
.bk .bk-menu-list-button {
  @media screen and (min-height: 900px) {
    @apply gap-x-15 text-base;
  }

  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  &[disabled] {
    @apply pointer-events-none;
    .bk-menu-list-icon {
      @apply bg-white border-mono-100 text-mono-300;
    }
    span,
    strong {
      @apply text-mono-400;
    }
  }
  strong {
    @apply font-semibold;
  }
  span {
    grid-column: 2;
    @apply text-mono-700 text-sm;
  }

  &:not([disabled]).bk-is-danger {
    .bk-menu-list-icon {
      @apply bg-red-light text-red-normal border-red-normal/40;
    }
    &:hover {
      .bk-menu-list-icon {
        @apply bg-red-normal/20 text-red-dark border-red-normal/50;
      }
    }
  }

  &:not([disabled]).bk-is-success {
    .bk-menu-list-icon {
      @apply bg-lime-light text-lime-normal border-lime-normal/40;
    }
    &:hover {
      .bk-menu-list-icon {
        @apply bg-lime-normal/20 text-lime-dark  border-lime-normal/40;
      }
    }
  }

  &:not([disabled]).bk-is-yellow {
    .bk-menu-list-icon {
      @apply bg-yellow-light text-yellow-dark/60 border-yellow-normal/40;
    }
    &:hover {
      .bk-menu-list-icon {
        @apply bg-yellow-normal/20 text-yellow-dark  border-yellow-dark/50;
      }
    }
  }

  &:hover {
    .bk-menu-list-icon {
      @apply bg-mono-200 text-mono-900 border-mono-500;
    }
  }
}

.bk-menu-list-icon {
  @apply flex items-center justify-center bg-mono-100 rounded text-mono-500 border border-mono-300;
  @apply w-40 h-40;
  grid-column: 1;
  grid-row: 1 / -1;

  @media screen and (min-height: 900px) {
    @apply size-50;
  }
  svg {
    @apply w-25 h-25 fill-current pointer-events-none;
  }
}
</style>
