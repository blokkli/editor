<template>
  <PanelSection
    v-if="targetLanguages.length"
    :title="$t('translations', 'Translations')"
    padded
  >
    <template v-if="!isTranslation" #tabs>
      <PanelTabs v-model="activeLanguage" :tabs="languageTabs" />
    </template>

    <div>
      <template v-if="active">
        <FormItem v-if="chartData.title">
          <div class="bk-form-label">
            {{ $t('title', 'Title') }}
          </div>
          <TranslationRow :source="chartData.title">
            <FormText
              :id="`chart-translation-${activeLanguage}-title`"
              :label="active.name"
              :model-value="active.translation.title ?? ''"
              hide-label
              lazy
              @update:model-value="updateField('title', $event ?? '')"
            />
          </TranslationRow>
        </FormItem>

        <FormItem v-if="chartData.valueAxisTitle">
          <div class="bk-form-label">
            {{ $t('chartsValueAxisTitle', 'Value axis title') }}
          </div>
          <TranslationRow :source="chartData.valueAxisTitle">
            <FormText
              :id="`chart-translation-${activeLanguage}-value-axis-title`"
              :label="active.name"
              :model-value="active.translation.valueAxisTitle ?? ''"
              hide-label
              lazy
              @update:model-value="updateField('valueAxisTitle', $event ?? '')"
            />
          </TranslationRow>
        </FormItem>

        <FormItem v-if="chartData.categoryAxisTitle">
          <div class="bk-form-label">
            {{ $t('chartsCategoryAxisTitle', 'Category axis title') }}
          </div>
          <TranslationRow :source="chartData.categoryAxisTitle">
            <FormText
              :id="`chart-translation-${activeLanguage}-category-axis-title`"
              :label="active.name"
              :model-value="active.translation.categoryAxisTitle ?? ''"
              hide-label
              lazy
              @update:model-value="
                updateField('categoryAxisTitle', $event ?? '')
              "
            />
          </TranslationRow>
        </FormItem>

        <FormItem
          v-if="
            !chartData.dataSource &&
            chartData.categories.length &&
            !hasNumericCategories &&
            !hasDateFormattedCategories
          "
        >
          <div class="bk-form-label">
            {{ $t('categories', 'Categories') }}
          </div>
          <InfoBox
            v-if="chartData.categories.length > MAX_TRANSLATABLE_ITEMS"
            small
            :text="
              $t(
                'chartsTranslationsTooMany',
                'Too many items to translate inline (@count, max @max).',
              )
                .replace('@count', String(chartData.categories.length))
                .replace('@max', String(MAX_TRANSLATABLE_ITEMS))
            "
          />
          <div v-else class="flex flex-col gap-10">
            <TranslationRow
              v-for="(category, i) in chartData.categories"
              :key="`category-${i}`"
              :source="category"
            >
              <FormText
                :id="`chart-translation-${activeLanguage}-category-${i}`"
                :label="active.name"
                :model-value="active.translation.categories?.[i] ?? ''"
                hide-label
                lazy
                @update:model-value="
                  updateArrayField('categories', i, $event ?? '')
                "
              />
            </TranslationRow>
          </div>
        </FormItem>

        <FormItem v-if="!chartData.dataSource && chartData.series.length">
          <div class="bk-form-label">
            {{ $t('chartsTranslationsSeries', 'Series') }}
          </div>
          <InfoBox
            v-if="chartData.series.length > MAX_TRANSLATABLE_ITEMS"
            small
            :text="
              $t(
                'chartsTranslationsTooMany',
                'Too many items to translate inline (@count, max @max).',
              )
                .replace('@count', String(chartData.series.length))
                .replace('@max', String(MAX_TRANSLATABLE_ITEMS))
            "
          />
          <div v-else class="flex flex-col gap-10">
            <TranslationRow
              v-for="(series, i) in chartData.series"
              :key="`series-${i}`"
              :source="series.name"
            >
              <FormText
                :id="`chart-translation-${activeLanguage}-series-${i}`"
                :label="active.name"
                :model-value="active.translation.seriesNames?.[i] ?? ''"
                hide-label
                lazy
                @update:model-value="
                  updateArrayField('seriesNames', i, $event ?? '')
                "
              />
            </TranslationRow>
          </div>
        </FormItem>

        <FormItem v-if="chartData.footnotes.length">
          <div class="bk-form-label">
            {{ $t('footnotes', 'Footnotes') }}
          </div>
          <div class="flex flex-col gap-10">
            <TranslationRow
              v-for="(note, i) in chartData.footnotes"
              :key="`footnote-${i}`"
              :source="note"
            >
              <FormTextarea
                :id="`chart-translation-${activeLanguage}-footnote-${i}`"
                :label="active.name"
                :rows="2"
                :model-value="active.translation.footnotes?.[i] ?? ''"
                hide-label
                lazy
                @update:model-value="
                  updateArrayField('footnotes', i, $event ?? '')
                "
              />
            </TranslationRow>
          </div>
        </FormItem>

        <FormItem v-if="chartData.numberFormat?.prefix">
          <div class="bk-form-label">
            {{ $t('prefix', 'Prefix') }}
          </div>
          <TranslationRow :source="chartData.numberFormat.prefix">
            <FormText
              :id="`chart-translation-${activeLanguage}-prefix`"
              :label="active.name"
              :model-value="active.translation.prefix ?? ''"
              hide-label
              lazy
              @update:model-value="updateField('prefix', $event ?? '')"
            />
          </TranslationRow>
        </FormItem>

        <FormItem v-if="chartData.numberFormat?.suffix">
          <div class="bk-form-label">
            {{ $t('suffix', 'Suffix') }}
          </div>
          <TranslationRow :source="chartData.numberFormat.suffix">
            <FormText
              :id="`chart-translation-${activeLanguage}-suffix`"
              :label="active.name"
              :model-value="active.translation.suffix ?? ''"
              hide-label
              lazy
              @update:model-value="updateField('suffix', $event ?? '')"
            />
          </TranslationRow>
        </FormItem>
      </template>
    </div>
  </PanelSection>
</template>

<script setup lang="ts">
import { computed, ref, useBlokkli, watch } from '#imports'
import {
  FormItem,
  FormText,
  FormTextarea,
  InfoBox,
} from '#blokkli/editor/components'
import PanelSection from '#blokkli/editor/components/Panel/Section/index.vue'
import PanelTabs from '#blokkli/editor/components/Panel/Tabs/index.vue'
import TranslationRow from './TranslationRow/index.vue'
import type { BlokkliChartData, ChartTranslation } from '../../../../types'

const props = defineProps<{
  chartData: BlokkliChartData
  hasNumericCategories: boolean
  hasDateFormattedCategories: boolean
}>()

const MAX_TRANSLATABLE_ITEMS = 50

const translations = defineModel<Record<string, ChartTranslation>>(
  'translations',
  { default: () => ({}) },
)

const { $t, state, context } = useBlokkli()

const isTranslation = computed(() => state.editMode.value === 'translating')

const targetLanguages = computed(() => {
  const t = state.translation.value
  if (!t.isTranslatable) return []
  const source = t.sourceLanguage
  const candidates = (t.translations ?? [])
    .filter((x) => x.exists && x.id !== source)
    .map((x) => {
      const lang = (t.availableLanguages ?? []).find((l) => l.id === x.id)
      return { id: x.id, name: lang?.name ?? x.id }
    })
  if (isTranslation.value) {
    const current = context.value.language
    return candidates.filter((l) => l.id === current)
  }
  return candidates
})

const languageTabs = computed(() =>
  targetLanguages.value.map((l) => ({ id: l.id, label: l.name })),
)

const activeLanguage = ref<string>(targetLanguages.value[0]?.id ?? '')

watch(
  targetLanguages,
  (langs) => {
    if (!langs.find((l) => l.id === activeLanguage.value)) {
      activeLanguage.value = langs[0]?.id ?? ''
    }
  },
  { immediate: true },
)

function ensureTranslation(lang: string): ChartTranslation {
  let t = translations.value[lang]
  if (!t) {
    t = {
      title: '',
      categories: Array.from<string>({
        length: props.chartData.categories.length,
      }).fill(''),
      seriesNames: Array.from<string>({
        length: props.chartData.series.length,
      }).fill(''),
      footnotes: Array.from<string>({
        length: props.chartData.footnotes.length,
      }).fill(''),
      prefix: '',
      suffix: '',
    }
    translations.value[lang] = t
  } else {
    if (t.title === undefined) t.title = ''
    if (!t.categories) {
      t.categories = Array.from<string>({
        length: props.chartData.categories.length,
      }).fill('')
    }
    if (!t.seriesNames) {
      t.seriesNames = Array.from<string>({
        length: props.chartData.series.length,
      }).fill('')
    }
    if (!t.footnotes) {
      t.footnotes = Array.from<string>({
        length: props.chartData.footnotes.length,
      }).fill('')
    }
  }
  return t
}

const active = computed(() => {
  if (!activeLanguage.value) return null
  const lang = targetLanguages.value.find((l) => l.id === activeLanguage.value)
  if (!lang) return null
  const translation = ensureTranslation(lang.id)
  return { id: lang.id, name: lang.name, translation }
})

type ScalarKey =
  | 'title'
  | 'valueAxisTitle'
  | 'categoryAxisTitle'
  | 'prefix'
  | 'suffix'
type ArrayKey = 'categories' | 'seriesNames' | 'footnotes'

function updateField(key: ScalarKey, value: string) {
  if (!active.value) return
  active.value.translation[key] = value
}

function updateArrayField(key: ArrayKey, index: number, value: string) {
  if (!active.value) return
  const arr = active.value.translation[key]
  if (!arr) return
  arr[index] = value
}
</script>
