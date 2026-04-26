import { defineEditorComponent } from '#blokkli/editor/composables'
import Search from './index.vue'
import type { FormSearchItem } from './types'

const fruits: FormSearchItem[] = [
  { key: 'apple', label: 'Apple', category: 'Pome' },
  { key: 'pear', label: 'Pear', category: 'Pome' },
  { key: 'quince', label: 'Quince', category: 'Pome' },
  { key: 'peach', label: 'Peach', category: 'Stone' },
  { key: 'plum', label: 'Plum', category: 'Stone' },
  { key: 'cherry', label: 'Cherry', category: 'Stone' },
  { key: 'apricot', label: 'Apricot', category: 'Stone' },
  { key: 'orange', label: 'Orange', category: 'Citrus' },
  { key: 'lemon', label: 'Lemon', category: 'Citrus' },
  { key: 'lime', label: 'Lime', category: 'Citrus' },
  { key: 'grapefruit', label: 'Grapefruit', category: 'Citrus' },
  { key: 'pomelo', label: 'Pomelo', category: 'Citrus' },
]

const fruitsWithDescription: FormSearchItem[] = fruits.map((f) => ({
  ...f,
  description: `A delicious ${(f.category ?? '').toLowerCase()} fruit.`,
}))

const poiResults: FormSearchItem[] = [
  { key: 'p1', label: 'Hauptbahnhof Zürich', description: 'Train station' },
  { key: 'p2', label: 'Bahnhofstrasse', description: 'Street' },
  { key: 'p3', label: 'Stadtpark Winterthur', description: 'Park' },
  { key: 'p4', label: 'Kunstmuseum', description: 'Museum' },
]

export default defineEditorComponent({
  id: 'form-search',
  label: 'Search',
  category: 'Form',
  component: Search,
  description:
    'Search input with a dropdown of suggestions. Defaults to in-browser fuzzy search via fzf with match highlighting; switch to `mode="async"` for server-driven suggestions. Manual checks: arrow keys wrap, Enter selects + clears query, Escape blurs, mouseenter updates focus, click commits without losing focus, focus-within icon turns accent.',
  variants: [
    {
      label: 'Default (fzf, grouped)',
      description:
        'Empty query → all items locale-sorted within their group. Type to fuzzy-match and highlight.',
      props: {
        id: 'fruit',
        label: 'Pick a fruit',
        placeholder: 'Search fruits…',
        items: fruits,
      },
    },
    {
      label: 'With description',
      description: 'Items carry a `description`; it renders as a sub-line.',
      props: {
        id: 'fruit-desc',
        label: 'Pick a fruit',
        placeholder: 'Search fruits…',
        items: fruitsWithDescription,
      },
    },
    {
      label: 'No grouping',
      props: {
        id: 'fruit-flat',
        label: 'Pick a fruit',
        placeholder: 'Search fruits…',
        items: fruits,
        disableGrouping: true,
      },
    },
    {
      label: 'Async / loading',
      description:
        'In `async` mode the component does no filtering. The spinner appears inside the input while `loading` is true.',
      props: {
        id: 'async',
        label: 'Search the server',
        placeholder: 'Type to search…',
        mode: 'async',
        loading: true,
        items: poiResults,
      },
    },
    {
      label: 'Async POI-style',
      description:
        'Same shape as the canonical async consumer (PoiSearch): grouping disabled, `category` mapped into `description` so the default row layout shows label + sub-line without a slot override.',
      props: {
        id: 'poi',
        label: 'Find a place',
        placeholder: 'Type a place…',
        mode: 'async',
        disableGrouping: true,
        items: poiResults,
      },
    },
    {
      label: 'Disabled',
      props: {
        id: 'disabled',
        label: 'Locked',
        placeholder: 'Cannot search',
        items: fruits,
        disabled: true,
      },
    },
    {
      label: 'Empty state',
      description:
        'Async mode with no results and a non-empty query renders the no-results message.',
      props: {
        id: 'empty',
        label: 'No matches',
        placeholder: 'Type something…',
        mode: 'async',
        items: [],
        query: 'xyz',
      },
    },
    {
      label: 'Custom icon',
      props: {
        id: 'icon',
        label: 'Find a person',
        placeholder: 'Search people…',
        icon: 'bk_mdi_person_search',
        items: fruits,
      },
    },
    {
      label: 'Selected (chip)',
      description:
        'When `selectedLabel` is set, the component renders the chosen value as a chip with a clear button instead of the search input. Clicking clear emits `clear` so the consumer can reset its state.',
      props: {
        id: 'selected',
        label: 'Linked page',
        icon: 'bk_mdi_link',
        items: [],
        selectedLabel: 'About us (/about)',
      },
    },
  ],
})
