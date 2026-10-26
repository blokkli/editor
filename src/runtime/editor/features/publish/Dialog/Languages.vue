<template>
  <table class="bk-table" data-test="publish-languages">
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.id"
        :data-test="`publish-language-${row.id}`"
        :data-test-result="row.result"
      >
        <td class="w-full pl-3">
          <label class="bk-checkbox">
            <input
              type="checkbox"
              :checked="row.isChecked"
              :disabled="row.isLocked"
              data-test="publish-languages-checkbox"
              @change="toggle(row.id)"
            />
            <span />
            <strong>{{ row.label }}</strong>
            <Pill
              v-if="row.isCurrent"
              :text="$t('publishCurrentLanguage', 'Current language')"
              class="ml-10 self-center"
            />
          </label>
        </td>
        <td class="text-right whitespace-nowrap pl-18 text-sm">
          {{ row.resultLabel }}
        </td>
        <td class="text-right whitespace-nowrap pl-18 text-sm">
          <div class="w-[60px] flex items-center justify-end gap-10">
            <StatusIndicator :status="row.isPublished ? 'success' : 'error'" />
            <template v-if="row.result !== 'unchanged'">
              <Icon
                name="bk_mdi_arrow_right_alt"
                class="size-15 [&_svg]:size-full [&_svg]:fill-mono-500"
              />
              <StatusIndicator
                :status="row.result === 'scheduled' ? 'warning' : 'success'"
              />
            </template>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { computed, useBlokkli } from '#imports'
import { Icon, Pill, StatusIndicator } from '#blokkli/editor/components'
import type { PublishLanguage } from './types'

const props = defineProps<{
  languages: PublishLanguage[]
  mode: 'immediate' | 'scheduled' | 'save'
  /**
   * Whether the unpublished languages can't be ticked, e.g. while the page is
   * scheduled.
   */
  disabled: boolean
}>()

/**
 * The unpublished languages that are ticked.
 */
const selected = defineModel<string[]>({ default: () => [] })

const { $t } = useBlokkli()

const rows = computed(() =>
  props.languages.map((language) => {
    const isChecked =
      language.isPublished ||
      (props.mode !== 'save' && selected.value.includes(language.id))

    const result = (() => {
      if (language.isPublished || !isChecked) {
        return 'unchanged' as const
      }
      return props.mode === 'scheduled'
        ? ('scheduled' as const)
        : ('published' as const)
    })()

    const resultLabel = language.isPublished
      ? $t('publishRemainsPublished', 'Remains published')
      : result === 'unchanged'
        ? $t('publishRemainsUnpublished', 'Remains unpublished')
        : $t('publishWillBePublished', 'Will be published')

    return {
      ...language,
      isChecked,
      // Publishing never unpublishes.
      isLocked: language.isPublished || props.disabled || props.mode === 'save',
      result,
      resultLabel,
    }
  }),
)

function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter((v) => v !== id)
    : [...selected.value, id]
}
</script>
