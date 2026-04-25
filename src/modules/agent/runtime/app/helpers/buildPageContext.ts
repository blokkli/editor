import type { BlokkliApp } from '#blokkli/editor/types/app'
import type { BlockBundle, PageContext } from '#blokkli/agent/shared/types'
import { itemEntityType } from '#blokkli-build/config'

/**
 * Build the PageContext sent to the agent server on init. Pure builder over
 * the BlokkliApp providers — no closures, no refs.
 */
export async function buildPageContext(
  app: BlokkliApp,
  contentSearchTabs?: PageContext['contentSearchTabs'],
): Promise<PageContext> {
  const { types, definitions, context, state, ui, $t, analyze } = app

  const bundles: BlockBundle[] = []

  for (const bundle of types.generallyAvailableBundles) {
    const contentFields = [
      ...types.editableFieldConfig
        .forEntityTypeAndBundle(itemEntityType, bundle.id)
        .filter((f) => f.type !== 'table')
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: (f.type === 'frame' || f.type === 'markup'
            ? 'markup'
            : 'plain') as 'plain' | 'markup',
        })),
      ...types.droppableFieldConfig
        .forEntityTypeAndBundle(itemEntityType, bundle.id)
        .map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type as 'reference' | 'link',
          allowed: f.allowed,
        })),
    ]

    const paragraphFields = types.fieldConfig
      .forEntityTypeAndBundle(itemEntityType, bundle.id)
      .map((f) => ({
        name: f.name,
        label: f.label,
        allowedBundles: f.allowedBundles,
        cardinality: f.cardinality,
      }))

    bundles.push({
      id: bundle.id,
      label: bundle.label,
      description: bundle.description,
      contentFields,
      paragraphFields,
    })
  }

  const fragments = definitions.fragmentDefinitions.value.map((f) => ({
    name: f.name,
    label: f.label,
    description: f.description,
  }))

  const entityContentFields = [
    ...types.editableFieldConfig
      .forEntityTypeAndBundle(
        context.value.entityType,
        context.value.entityBundle,
      )
      .filter((f) => f.type !== 'table')
      .map((f) => ({
        name: f.name,
        label: f.label,
        type: (f.type === 'frame' || f.type === 'markup'
          ? 'markup'
          : 'plain') as 'plain' | 'markup',
      })),
    ...types.droppableFieldConfig
      .forEntityTypeAndBundle(
        context.value.entityType,
        context.value.entityBundle,
      )
      .map((f) => ({
        name: f.name,
        label: f.label,
        type: f.type as 'reference' | 'link',
        allowed: f.allowed,
      })),
  ]

  await analyze.ensureInitialized()
  const analyzersList = analyze.analyzers.value
    .filter((a) => !a.requireRawPage)
    .map((a) => ({
      id: a.id,
      type: a.type,
      label:
        typeof a.label === 'function'
          ? a.label(context.value.language, $t)
          : a.label,
      description:
        typeof a.description === 'function'
          ? a.description(context.value.language, $t)
          : a.description,
    }))

  return {
    title: state.entity.value.label || '',
    entityType: context.value.entityType,
    entityUuid: context.value.entityUuid,
    entityBundle: context.value.entityBundle,
    bundleLabel: state.entity.value.bundleLabel || '',
    itemEntityType,
    bundles,
    interfaceLanguage: ui.interfaceLanguage.value,
    entityLanguage: context.value.language,
    isPublished: state.entity.value.status ?? null,
    editMode: state.editMode.value,
    fragments,
    entityContentFields,
    ...(contentSearchTabs?.length ? { contentSearchTabs } : {}),
    ...(analyzersList.length ? { analyzers: analyzersList } : {}),
  }
}
