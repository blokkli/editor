<template>
  <li v-for="field in fields" :key="field.name" class="bk-structure-field">
    <p class="bk-is-field">
      {{ field.label }}
    </p>
    <ul v-if="field.items?.length" class="bk-structure-field-items">
      <li
        v-for="item in field.items"
        :key="item.uuid"
        :class="{ 'bk-is-active': isSelected(item.uuid) }"
      >
        <button
          class="bk-blokkli-item-label"
          :data-blokkli-structure-uuid="item.uuid"
          @click="select(item.uuid)"
        >
          <div class="bk-blokkli-item-label-icon">
            <ItemIcon :bundle="item.bundle" />
          </div>
          <span>{{ item.title || item.type?.label || item.bundle }}</span>
        </button>
        <ul v-if="item.items?.length" class="bk-structure-field-nested-items">
          <li
            v-for="child in item.items"
            :key="child.uuid"
            class="bk-parent"
            :class="{
              'bk-is-active': isSelected(child.uuid),
              'bk-is-inside-active': isSelected(item.uuid),
            }"
          >
            <button
              class="bk-blokkli-item-label"
              :data-blokkli-structure-uuid="child.uuid"
              data-blokkli-structure-nested="true"
              @click="select(child.uuid)"
            >
              <div class="bk-blokkli-item-label-icon">
                <ItemIcon :bundle="child.bundle" />
              </div>
              <span>{{
                child.title || child.type?.label || child.bundle
              }}</span>
            </button>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</template>

<script lang="ts" setup>
import { useBlokkli, computed } from '#imports'
import { ItemIcon } from '#blokkli/components'
import type { StructureTreeField } from './../types'
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'

const { selection, eventBus, ui } = useBlokkli()

const uuids = computed(() => selection.blocks.value.map((v) => v.uuid))

const isSelected = (uuid: string) => uuids.value.includes(uuid)

const select = (uuid: string) => {
  if (ui.isMobile.value) {
    eventBus.emit('sidebar:close')
  }
  eventBus.emit('select', uuid)
  eventBus.emit('scrollIntoView', { uuid })
}

defineProps<{
  fields?: StructureTreeField[]
}>()

onBlokkliEvent('scrollIntoView', (e) => {
  const el = document.querySelector(`[data-blokkli-structure-uuid="${e.uuid}"]`)
  if (el instanceof HTMLElement) {
    el.scrollIntoView({
      block: 'nearest',
      behavior: 'instant',
    })
    el.focus()
  }
})
</script>
