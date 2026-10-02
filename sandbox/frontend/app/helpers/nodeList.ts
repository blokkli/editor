export type NodeListSource = 'news' | 'events' | 'publications'

/**
 * The filter and sort of an automatic list of nodes (the teaser list and the
 * overview pages), per source:
 *
 * - news: the newest first
 * - events: the upcoming ones, the next first, optionally of one category
 * - publications: the current ones, the newest first, optionally of one type
 *
 * `today` is compared as a date (Y-m-d), as the date fields store it: an event
 * or a publication period that ends today still counts.
 */
export function nodeListVariables(
  source: NodeListSource,
  options: { language: string; today: string; category?: string },
) {
  const published = {
    field: 'status',
    value: ['1'],
    language: options.language,
  }
  switch (source) {
    case 'events':
      return {
        filter: {
          conditions: [
            { field: 'type', value: ['event'] },
            published,
            {
              field: 'field_date.end_value',
              value: [options.today],
              operator: 'GREATER_THAN_OR_EQUAL' as const,
            },
            ...(options.category
              ? [{ field: 'field_category', value: [options.category] }]
              : []),
          ],
        },
        sort: [{ field: 'field_date.value', direction: 'ASC' as const }],
      }
    case 'publications':
      return {
        filter: {
          conditions: [
            { field: 'type', value: ['publication'] },
            published,
            {
              field: 'field_period.end_value',
              value: [options.today],
              operator: 'GREATER_THAN_OR_EQUAL' as const,
            },
            ...(options.category
              ? [{ field: 'field_publication_type', value: [options.category] }]
              : []),
          ],
        },
        sort: [{ field: 'field_period.value', direction: 'DESC' as const }],
      }
  }
  return {
    filter: { conditions: [{ field: 'type', value: ['news'] }, published] },
    sort: [{ field: 'created', direction: 'DESC' as const }],
  }
}
