<template>
  <PanelSection
    :title="
      $t('publishValidationErrorsTitle', 'Cannot publish: validation errors')
    "
    padded
    data-test="publish-validation-errors"
  >
    <InfoBox
      :text="
        $t(
          'publishValidationErrorsDescription',
          'Fix the following issues and try publishing again.',
        )
      "
      icon="bk_mdi_error-fill"
      color="red"
    />

    <ul
      v-if="resolvedViolations.length"
      class="bk-publish-violations bk-control mt-15"
    >
      <li
        v-for="(item, i) in resolvedViolations"
        :key="item.violation.message + i"
        data-test="publish-violation-item"
      >
        <button
          type="button"
          class="bk-validation-item"
          data-test="publish-violation-button"
          @click.prevent="onClick(item)"
        >
          <div v-if="item.block" class="bk-validation-item-header">
            <ItemIcon :bundle="item.block.bundle" />
            <div>{{ item.bundleLabel }}</div>
          </div>
          <div
            v-if="item.fieldLabel"
            class="text-xs text-mono-600 font-medium mb-3"
            data-test="publish-violation-field"
          >
            {{ item.fieldLabel }}
          </div>
          <div v-html="item.violation.message" />
        </button>
      </li>
    </ul>

    <ul
      v-if="errors.length"
      class="bk-publish-errors list-disc pl-20 mt-15 text-base"
    >
      <li
        v-for="(error, i) in errors"
        :key="'err' + i"
        class="text-red-dark"
        data-test="publish-error-item"
      >
        {{ error }}
      </li>
    </ul>
  </PanelSection>
</template>

<script lang="ts" setup>
import { computed, useBlokkli } from '#imports'
import { InfoBox, ItemIcon } from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import { itemEntityType } from '#blokkli-build/config'
import type { Validation } from '#blokkli/editor/types/state'
import type { RenderedFieldListItem } from '#blokkli/editor/types/field'

const props = defineProps<{
  violations: Validation[]
  errors: string[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { types, blocks, context, eventBus, $t } = useBlokkli()

interface ResolvedViolation {
  violation: Validation
  /** The block this violation targets, if entityUuid resolves to one. */
  block: RenderedFieldListItem | null
  /** The block bundle's label, when `block` is set. */
  bundleLabel: string | undefined
  /** A human-readable label for `propertyPath`'s first field segment. */
  fieldLabel: string | undefined
}

/**
 * Take the first non-numeric segment of a Drupal-style property path. Handles
 * leading delta segments — e.g. `0.field_title.0.value` → `field_title` — and
 * the common form `field_title.0.value` → `field_title`.
 */
function firstFieldSegment(propertyPath: string): string | undefined {
  for (const segment of propertyPath.split('.')) {
    if (segment && !/^\d+$/.test(segment)) {
      return segment
    }
  }
  return undefined
}

function resolveBundle(
  violation: Validation,
  block: RenderedFieldListItem | null,
): string | undefined {
  if (block) return block.bundle
  if (
    !violation.entityType ||
    violation.entityType === context.value.entityType
  ) {
    return context.value.entityBundle
  }
  return undefined
}

function resolveFieldLabel(
  violation: Validation,
  block: RenderedFieldListItem | null,
): string | undefined {
  if (!violation.propertyPath) return undefined
  const fieldName = firstFieldSegment(violation.propertyPath)
  if (!fieldName) return undefined

  const entityType = violation.entityType ?? context.value.entityType
  const bundle = resolveBundle(violation, block)
  if (!entityType || !bundle) return undefined

  return types.getFieldConfig(entityType, bundle, fieldName)?.label
}

const resolvedViolations = computed<ResolvedViolation[]>(() =>
  props.violations.map((violation) => {
    const block = violation.entityUuid
      ? (blocks.getBlock(violation.entityUuid) ?? null)
      : null
    const bundleLabel = block
      ? types.getBlockBundleDefinition(block.bundle)?.label
      : undefined
    return {
      violation,
      block,
      bundleLabel,
      fieldLabel: resolveFieldLabel(violation, block),
    }
  }),
)

function onClick(item: ResolvedViolation): void {
  // Only block-bound violations can be navigated to; for others we keep the
  // dialog open so the user can read the message in place.
  if (
    item.violation.entityType !== itemEntityType ||
    !item.violation.entityUuid
  ) {
    return
  }
  eventBus.emit('select', item.violation.entityUuid)
  eventBus.emit('scrollIntoView', { uuid: item.violation.entityUuid })
  emit('close')
}
</script>
