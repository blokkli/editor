/**
 * Map our editor-facing legend-position option to ECharts's legend object.
 * Used by built-in render.vue files for chart types that expose
 * `legendPosition` as a user-configurable option.
 */
export function legendPositionToEcharts(
  pos: string,
): Record<string, string | number> {
  if (pos === 'top') return { left: 'center', top: 5, orient: 'horizontal' }
  if (pos === 'right') return { right: 0, top: 'middle', orient: 'vertical' }
  return { left: 'center', bottom: 0, orient: 'horizontal' }
}
