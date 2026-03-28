<template>
  <div class="bk-help-shortcuts">
    <table>
      <tbody>
        <!-- eslint-disable-next-line vue/no-v-for-template-key -->
        <template v-for="group in groups" :key="group.group">
          <tr class="bk-is-heading">
            <th colspan="2">{{ group.group }}</th>
          </tr>
          <tr v-for="(shortcut, i) in group.shortcuts" :key="group.group + i">
            <td>
              <ShortcutIndicator
                view-only
                :meta="shortcut.meta"
                :shift="shortcut.shift"
                :key-code="shortcut.code"
                :label="shortcut.label"
              />
            </td>
            <td>{{ shortcut.label }}</td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { ShortcutIndicator } from '#blokkli/editor/components'
import type { KeyboardShortcut } from '#blokkli/editor/types/ui'

type ShortcutGroup = {
  group: string
  shortcuts: KeyboardShortcut[]
}

const { keyboard, $t } = useBlokkli()

const getGroupLabel = (key: string) => {
  if (key === 'general') {
    return $t('shortcutGroupGeneral', 'General')
  } else if (key === 'blocks') {
    return $t('shortcutGroupBlocks', 'Blocks')
  } else if (key === 'ui') {
    return $t('shortcutGroupUi', 'UI')
  }

  return key
}

const groups = computed(() => {
  return Object.values(
    keyboard.shortcuts.value.reduce<Record<string, ShortcutGroup>>((acc, v) => {
      const group = getGroupLabel(v.shortcut.group || 'general')
      if (!acc[group]) {
        acc[group] = {
          group,
          shortcuts: [],
        }
      }

      acc[group].shortcuts.push(v.shortcut)
      return acc
    }, {}),
  ).map((group) => {
    group.shortcuts.sort((a, b) => a.code.localeCompare(b.code))
    return group
  })
})
</script>

<style lang="postcss">
.bk .bk-help-shortcuts {
  table {
    @apply w-full text-sm;

    @container (min-width: 500px) {
      @apply text-lg;
    }

    .bk-shortcut {
      > kbd {
        @apply !bg-mono-100 !text-mono-800 !border !border-mono-300;
      }
      @container (min-width: 500px) {
        @apply text-base;
        > kbd {
          @apply text-base;
        }
      }
    }

    tr {
      @apply border-b border-b-mono-300;

      &.bk-is-heading {
        @apply border-b-2 border-b-mono-300;
      }
    }

    th {
      @apply text-left font-semibold pt-30 uppercase text-xs pb-10 text-mono-900;
    }

    td {
      @apply py-10;
      &:first-child {
        width: 0;
        @apply pr-10;
      }
    }
  }
}
</style>
