<template>
  <div class="bk-help-shortcuts">
    <table>
      <tbody>
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
import { useBlokkli } from '#imports'
import { ShortcutIndicator } from '#blokkli/components'
import type { KeyboardShortcut } from '#blokkli/types'

type ShortcutGroup = {
  group: string
  shortcuts: KeyboardShortcut[]
}

const { keyboard } = useBlokkli()

const groups = computed(() => {
  return Object.values(
    keyboard.shortcuts.value.reduce<Record<string, ShortcutGroup>>((acc, v) => {
      const group = v.shortcut.group || 'general'
      if (!acc[group]) {
        acc[group] = {
          group,
          shortcuts: [],
        }
      }

      acc[group].shortcuts.push(v.shortcut)
      return acc
    }, {}),
  )
})
</script>
