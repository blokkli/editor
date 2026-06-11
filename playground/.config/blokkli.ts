import type { ColorOption } from './../../src/global/types/colorOptions'

export const colorOptions: Record<string, ColorOption> = {
  blue: { hex: '#3b82f6', label: 'Blue' },
  // Example ramped color with shades 100..700 — the editor's chart
  // ColorDropdown exposes these as a drill-in shade picker.
  red: {
    label: 'Red',
    shades: {
      '100': '#F1A79F',
      '200': '#EC8B80',
      '300': '#E66254',
      '400': '#E2402E',
      '500': '#CB2512',
      '600': '#AA1F0F',
      '700': '#89190C',
    },
    mainShade: '500',
  },
  green: { hex: '#10b981', label: 'Green' },
  amber: { hex: '#f59e0b', label: 'Amber' },
  purple: { hex: '#8b5cf6', label: 'Purple' },
  pink: { hex: '#ec4899', label: 'Pink' },
  teal: { hex: '#14b8a6', label: 'Teal' },
  orange: { hex: '#f97316', label: 'Orange' },
}
