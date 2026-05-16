<template>
  <VChart
    :option="option"
    autoresize
    style="height: 550px; width: 100%"
  />
</template>

<script setup lang="ts">
import { computed } from '#imports'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  HeatmapChart,
  GaugeChart,
  FunnelChart,
  GraphChart,
  TreeChart,
  TreemapChart,
  SunburstChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  MapChart,
  ParallelChart,
  LinesChart,
  SankeyChart,
  PictorialBarChart,
  ThemeRiverChart,
  CustomChart,
} from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  ToolboxComponent,
  PolarComponent,
  VisualMapComponent,
  GeoComponent,
  ParallelComponent,
  SingleAxisComponent,
  TimelineComponent,
  CalendarComponent,
  GraphicComponent,
  AxisPointerComponent,
  BrushComponent,
  DatasetComponent,
  TransformComponent,
  AriaComponent,
} from 'echarts/components'
import type { ChartTypeRenderProps } from '#blokkli/charts/types'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  RadarChart,
  HeatmapChart,
  GaugeChart,
  FunnelChart,
  GraphChart,
  TreeChart,
  TreemapChart,
  SunburstChart,
  BoxplotChart,
  CandlestickChart,
  EffectScatterChart,
  MapChart,
  ParallelChart,
  LinesChart,
  SankeyChart,
  PictorialBarChart,
  ThemeRiverChart,
  CustomChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  ToolboxComponent,
  PolarComponent,
  VisualMapComponent,
  GeoComponent,
  ParallelComponent,
  SingleAxisComponent,
  TimelineComponent,
  CalendarComponent,
  GraphicComponent,
  AxisPointerComponent,
  BrushComponent,
  DatasetComponent,
  TransformComponent,
  AriaComponent,
])

const props = defineProps<ChartTypeRenderProps>()

const option = computed(() => ({
  animation: !props.isEditing,
  ...(props.advancedConfig ?? {}),
}))
</script>

