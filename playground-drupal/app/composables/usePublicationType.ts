import { useEasyTexts } from '#imports'

/**
 * The label of a publication's type (field_publication_type): the schema only
 * has the key. One literal call per value, so that the keys can be extracted.
 */
export function usePublicationType() {
  const { $texts } = useEasyTexts()

  return (type?: string | null): string => {
    switch (type) {
      case 'building_application':
        return $texts(
          'publication.type_building_application',
          'Building application',
        )
      case 'traffic':
        return $texts('publication.type_traffic', 'Traffic')
      case 'regulation':
        return $texts('publication.type_regulation', 'Regulation')
    }
    return $texts('publication.label', 'Official publication')
  }
}
