<template>
  <figure
    ref="figure"
    class="flex flex-col gap-4"
    :class="
      isRound
        ? '[--bk-chart-height:24rem] md:[--bk-chart-height:22rem]'
        : '[--bk-chart-height:21rem] md:[--bk-chart-height:27rem]'
    "
  >
    <figcaption v-if="title" class="text-h3 text-balance">
      {{ title }}
    </figcaption>
    <ChartRenderer :data :dynamic-data :language-override="language" :transform>
      <template
        #categoryFilter="{ label, categories, selectedIndex, setSelectedIndex }"
      >
        <label class="flex flex-col items-start gap-2">
          <span v-if="label" class="text-label text-muted uppercase">
            {{ label }}
          </span>
          <select
            :value="selectedIndex"
            class="border border-ink bg-white px-3 py-2"
            @change="
              setSelectedIndex(
                Number(($event.target as HTMLSelectElement).value),
              )
            "
          >
            <option
              v-for="(category, index) in categories"
              :key="index"
              :value="index"
            >
              {{ category }}
            </option>
          </select>
        </label>
      </template>
    </ChartRenderer>
  </figure>
</template>

<script lang="ts" setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useTemplateRef,
} from '#imports'
import { use } from 'echarts/core'
import { SVGRenderer } from 'echarts/renderers'
import { AriaComponent } from 'echarts/components'
import { INIT_OPTIONS_KEY } from 'vue-echarts'
import { ChartRenderer } from '#blokkli/charts/components'
import type {
  BlokkliChartData,
  ChartDataSourcePayload,
} from '#blokkli/charts/types'
import { useLanguage } from '~/composables/useLanguage'
import { createChartTransform } from './transform'

// A chart of the charts module, as a figure in the site's style: the title
// as its caption, the chart styled by createChartTransform(). Charts render as SVG:
// the text uses the site's web font (a canvas draws before it's loaded),
// stays sharp and prints well. The aria component labels the chart for
// screen readers (see the transform).
use([SVGRenderer, AriaComponent])

const props = defineProps<{
  data: BlokkliChartData
  dynamicData?: ChartDataSourcePayload | null
}>()

const language = useLanguage()

provide(INIT_OPTIONS_KEY, { renderer: 'svg' })

// The module's footnote markers: {1} becomes ¹, as in the chart.
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹'

const title = computed(() =>
  (
    props.data.translations?.[language.value]?.title ||
    props.data.title ||
    ''
  ).replace(/\{(\d)\}/g, (_, digit: string) => SUPERSCRIPTS[Number(digit)]!),
)

const isRound = computed(() => ['pie', 'donut'].includes(props.data.type))

// The transform adapts pies to the chart's width. Charts only render in the
// browser, so the first measurement comes before the first chart.
const figure = useTemplateRef('figure')
const isNarrow = ref(false)
let observer: ResizeObserver | null = null

onMounted(() => {
  observer = new ResizeObserver(([entry]) => {
    isNarrow.value = (entry?.contentRect.width ?? 0) < 520
  })
  if (figure.value) {
    observer.observe(figure.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

const transform = computed(() => createChartTransform(isNarrow.value))
</script>
