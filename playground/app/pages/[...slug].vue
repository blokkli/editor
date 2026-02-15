<template>
  <div v-if="page">
    <BlokkliProvider
      v-slot="{ entity, isEditing }"
      :key="language"
      entity-type="content"
      entity-bundle="page"
      edit-label="Edit Content Page"
      :entity-uuid="page.uuid"
      :can-edit
      :language="language"
      :entity="pageValues"
      :permissions="canEdit ? ['review', 'edit', 'view'] : []"
      provider-type="contentPage"
    >
      <Hero
        :is-editing="isEditing"
        :title="entity.title"
        :lead="entity.lead"
        :image="entity.heroImage"
      >
        <template #lead>
          <p
            v-if="entity.lead"
            v-blokkli-editable:lead
            class="mt-20 text-lg lg:text-xl text-mono-700"
          >
            {{ entity.lead }}
          </p>
        </template>
        <BlokkliField
          name="buttons"
          :list="fieldButtons"
          list-class="mt-20 lg:mt-40 flex gap-10 flex-wrap"
          field-list-type="inline"
          drop-alignment="horizontal"
        />
        <template #animation>
          <BlokkliField
            name="icons"
            :list="fieldIcons"
            class="relative hero-animation"
          />
        </template>
      </Hero>
      <div>
        <BlokkliField
          name="content"
          :list="fieldContent"
          :allowed-fragments="['cta', 'shader_debug', 'top_level_link']"
          v-slot="{ items }"
        >
          <DevOnly>
            <div>
              <div>{{ options }}</div>
              <TableOfContents :items />
            </div>
          </DevOnly>
        </BlokkliField>
      </div>
    </BlokkliProvider>
  </div>
</template>

<script lang="ts" setup>
import { useRoute, computed } from '#imports'
import { mapMockField } from '#mock/state'
import { entityStorageManager } from '#mock/entityStorage'
import { ContentPage } from '#mock/state/Entity/Content'
import Hero from '~/components/Hero/index.vue'

const route = useRoute()

const language = computed(() => {
  if (route.path.startsWith('/de')) {
    return 'de'
  } else if (route.path.startsWith('/fr')) {
    return 'fr'
  } else if (route.path.startsWith('/it')) {
    return 'it'
  }
  return 'en'
})

const uuid = computed(() => {
  if (route.path.includes('page/2')) {
    return '2'
  } else if (route.path.includes('page/3')) {
    return '3'
  }

  return '1'
})

const canEdit = computed(() => !!route.query.blokkliEditing)

const page = entityStorageManager.getContent(uuid.value)

if (!page) {
  throw new Error('Failed to load page with UUID: 1')
}

if (!(page instanceof ContentPage)) {
  throw new TypeError('Failed to load page with UUID: 1')
}

page.getTranslation(language.value)

const fieldButtons = computed(() => mapMockField(page.buttons()))
const fieldContent = computed(() => mapMockField(page.content()))
const fieldIcons = computed(() => mapMockField(page.icons()))
const pageValues = computed(() => page.getData())

const { options } = defineBlokkliProvider(pageValues.value, {
  entityType: 'content',
  bundle: 'page',
  options: {
    heroStyle: {
      type: 'radios',
      label: 'Hero Style',
      default: 'default',
      options: {
        default: 'Default',
        fancy: 'Fancy',
      },
    },
  },
  propsFieldMapping: {
    lead: { type: 'editable', name: 'lead' },
  },
})
</script>
