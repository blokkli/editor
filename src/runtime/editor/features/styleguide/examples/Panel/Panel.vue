<template>
  <div class="w-full">
    <PanelSection title="Map features">
      <TransitionList>
        <Feature
          v-for="feature in features"
          :key="feature.id"
          :feature="feature"
          :icon="featureIcons[feature.type]"
          :editing-id
          @edit="editingId = feature.id"
          @cancel="editingId = null"
          @delete="remove(feature.id)"
          @save="(label) => updateLabel(feature.id, label)"
        />
      </TransitionList>
      <template #actions>
        <PanelAction
          v-for="kind in featureKinds"
          :key="kind"
          :title="kindLabels[kind]"
          :icon="featureIcons[kind]"
          @click="add(kind)"
        />
      </template>
    </PanelSection>

    <PanelSection title="Configuration">
      <PanelDetails
        v-model="snappingOpen"
        title="Snapping"
        description="Align new geometry to existing features."
      >
        <div>
          <label class="flex items-center gap-8">
            <input v-model="snapToVertices" type="checkbox" />
            Snap to vertices
          </label>
          <label class="flex items-center gap-8">
            <input v-model="snapToEdges" type="checkbox" />
            Snap to edges
          </label>
        </div>
      </PanelDetails>
      <PanelDetails v-model="styleOpen" title="Layer style">
        <div>
          <label class="flex items-center gap-8">
            <input v-model="showLabels" type="checkbox" />
            Show labels
          </label>
          <label class="flex items-center gap-8">
            <input v-model="showOutline" type="checkbox" />
            Show outline
          </label>
        </div>
      </PanelDetails>
    </PanelSection>
  </div>
</template>

<script setup lang="ts">
import { ref } from '#imports'
import type { BlokkliIcon } from '#blokkli-build/icons'
import PanelAction from '#blokkli/editor/components/Panel/Action/index.vue'
import PanelDetails from '#blokkli/editor/components/Panel/Details/index.vue'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import TransitionList from '#blokkli/editor/components/Transition/List/index.vue'
import Feature from './Feature.vue'

type FeatureKind = 'point' | 'line' | 'rectangle' | 'polygon'

interface FeatureItem {
  id: number
  type: FeatureKind
  label: string
}

const featureKinds: FeatureKind[] = ['point', 'line', 'rectangle', 'polygon']

const featureIcons: Record<FeatureKind, BlokkliIcon> = {
  point: 'bk_mdi_location_on',
  line: 'bk_mdi_line_axis',
  rectangle: 'bk_mdi_crop_square',
  polygon: 'bk_mdi_hexagon',
}

const kindLabels: Record<FeatureKind, string> = {
  point: 'Add point',
  line: 'Add line',
  rectangle: 'Add rectangle',
  polygon: 'Add polygon',
}

const adjectives = [
  'Northern',
  'Southern',
  'Eastern',
  'Western',
  'Hidden',
  'Quiet',
  'Sunny',
  'Misty',
  'Old',
  'New',
  'Lower',
  'Upper',
]
const nouns = [
  'Harbor',
  'Trail',
  'Ridge',
  'Lake',
  'Forest',
  'Meadow',
  'Crossing',
  'Lookout',
  'Plaza',
  'Garden',
  'Hill',
  'Valley',
]

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!
}

function randomLabel(): string {
  return `${pick(adjectives)} ${pick(nouns)}`
}

let nextId = 0
const features = ref<FeatureItem[]>([
  { id: nextId++, type: 'point', label: randomLabel() },
  { id: nextId++, type: 'polygon', label: randomLabel() },
])
const editingId = ref<number | null>(null)

const snappingOpen = ref(false)
const snapToVertices = ref(true)
const snapToEdges = ref(false)

const styleOpen = ref(false)
const showLabels = ref(true)
const showOutline = ref(false)

function add(type: FeatureKind) {
  features.value.push({ id: nextId++, type, label: randomLabel() })
}

function remove(id: number) {
  features.value = features.value.filter((f) => f.id !== id)
  if (editingId.value === id) editingId.value = null
}

function updateLabel(id: number, label: string) {
  const feature = features.value.find((f) => f.id === id)
  if (feature) feature.label = label
  editingId.value = null
}
</script>
