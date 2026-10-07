// The allowed values of field_category, e.g. for the overview's filters.
export const EVENT_CATEGORIES = [
  'culture',
  'sport',
  'family',
  'market',
  'politics',
] as const

/**
 * The label of an event's category (field_category): the schema only has the
 * key. One literal call per value, so that the keys can be extracted.
 */
export function useEventCategory() {
  const { $texts } = useEasyTexts()

  return (category?: string | null): string => {
    switch (category) {
      case 'culture':
        return $texts('event.category_culture', 'Culture')
      case 'sport':
        return $texts('event.category_sport', 'Sport')
      case 'family':
        return $texts('event.category_family', 'Family')
      case 'market':
        return $texts('event.category_market', 'Market')
      case 'politics':
        return $texts('event.category_politics', 'Politics')
    }
    return $texts('event.event', 'Event')
  }
}
