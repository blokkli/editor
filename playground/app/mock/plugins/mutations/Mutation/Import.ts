import { BlockProxy, type MutationContext } from '#mock/state/EditState'
import { entityStorageManager } from '#mock/entityStorage'
import { getParagraphBundles } from '#mock/state/Paragraph'
import { FieldBlocks } from '#mock/state/Field/Blocks'
import type { Entity } from '#mock/state/Entity'
import type { Paragraph } from '#mock/state/Paragraph/Paragraph'
import { Mutation } from '../Mutation'

export type SerializedParagraph = {
  bundle: string
  values: Record<string, any>
  options?: Record<string, string>
  children?: { fieldName: string; paragraphs: SerializedParagraph[] }[]
}

export type TransferableEnvelope = {
  version: 1
  paragraphs: SerializedParagraph[]
}

export type MockImportSummary = {
  paragraphsImported: number
  skippedBundles: { bundle: string; count: number }[]
  droppedFields: { bundle: string; fieldName: string }[]
  referencesResolvedByUuid: number
  referencesResolvedByLabel: {
    entityType: string
    label: string
    targetId: string
  }[]
  referencesUnresolved: {
    entityType: string
    uuid: string | null
    label: string | null
    reason: string
  }[]
}

export type MutationImportArgs = {
  transferable: string
  hostEntityType: string
  hostEntityUuid: string
  hostField: string
  afterUuid: string | null
}

type SummaryAccumulator = {
  paragraphsImported: number
  skippedBundles: Map<string, number>
  droppedFields: { bundle: string; fieldName: string }[]
}

export class MutationImport extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('import', configuration)
  }

  override execute(context: MutationContext, args: MutationImportArgs) {
    const summary: SummaryAccumulator = {
      paragraphsImported: 0,
      skippedBundles: new Map(),
      droppedFields: [],
    }

    let parsed: TransferableEnvelope
    try {
      parsed = JSON.parse(args.transferable) as TransferableEnvelope
    } catch {
      this.persistSummary(summary)
      return
    }

    if (parsed?.version !== 1 || !Array.isArray(parsed.paragraphs)) {
      this.persistSummary(summary)
      return
    }

    const knownBundles = new Set(getParagraphBundles().map((b) => b.bundle))
    const hostEntity = entityStorageManager.load(
      args.hostEntityType as any,
      args.hostEntityUuid,
    )
    const hostField = hostEntity
      ? this.getBlockField(hostEntity, args.hostField)
      : null
    if (!hostField) {
      this.persistSummary(summary)
      return
    }

    let preceedingUuid: string | null = args.afterUuid
    parsed.paragraphs.forEach((paragraph, rootIndex) => {
      const created = this.createParagraph(
        context,
        paragraph,
        args.hostEntityType,
        args.hostEntityUuid,
        hostField,
        knownBundles,
        summary,
        `${rootIndex}`,
      )
      if (created) {
        context.addProxy(created, preceedingUuid)
        preceedingUuid = created.block.uuid
      }
    })

    this.persistSummary(summary)
  }

  private createParagraph(
    context: MutationContext,
    paragraph: SerializedParagraph,
    hostEntityType: string,
    hostEntityUuid: string,
    parentField: FieldBlocks,
    knownBundles: Set<string>,
    summary: SummaryAccumulator,
    pathPrefix: string,
  ): BlockProxy | null {
    if (
      !knownBundles.has(paragraph.bundle) ||
      !parentField.allowedBundles.includes(paragraph.bundle)
    ) {
      this.recordSkipped(summary, paragraph)
      return null
    }

    const newUuid = this.getUuidForNewEntity(pathPrefix)
    const block = entityStorageManager.createBlock(paragraph.bundle, newUuid)

    const blockBundle = getParagraphBundles().find(
      (b) => b.bundle === paragraph.bundle,
    )
    const defaults = blockBundle?.getDefaultValues() ?? {}

    // Drop values for fields that no longer exist on the target bundle.
    const filteredValues: Record<string, any> = {}
    for (const [fieldId, value] of Object.entries(paragraph.values)) {
      if (block.fields[fieldId]) {
        filteredValues[fieldId] = value
      } else {
        summary.droppedFields.push({
          bundle: paragraph.bundle,
          fieldName: fieldId,
        })
      }
    }

    block.setValues({ ...defaults, ...filteredValues, isNew: [true] })

    if (paragraph.options) {
      const optionsField = block.options()
      Object.entries(paragraph.options).forEach(([key, value]) => {
        optionsField.setOptionValue(key, value)
      })
    }

    summary.paragraphsImported++

    if (paragraph.children) {
      paragraph.children.forEach((group, groupIndex) => {
        const childField = this.getBlockField(block, group.fieldName)
        if (!childField) {
          // Field doesn't exist on this bundle — count every paragraph as
          // skipped + record the dropped field once.
          summary.droppedFields.push({
            bundle: paragraph.bundle,
            fieldName: group.fieldName,
          })
          group.paragraphs.forEach((child) => {
            this.recordSkippedRecursive(summary, child)
          })
          return
        }

        group.paragraphs.forEach((child, childIndex) => {
          const childProxy = this.createParagraph(
            context,
            child,
            block.entityType,
            newUuid,
            childField,
            knownBundles,
            summary,
            `${pathPrefix}.${groupIndex}.${childIndex}`,
          )
          if (childProxy) {
            context.appendProxy(childProxy)
          }
        })
      })
    }

    return new BlockProxy(block, hostEntityType, hostEntityUuid, parentField.id)
  }

  private getBlockField(
    entity: Entity | Paragraph,
    fieldName: string,
  ): FieldBlocks | null {
    const field = entity.fields[fieldName]
    return field instanceof FieldBlocks ? field : null
  }

  private recordSkipped(
    summary: SummaryAccumulator,
    paragraph: SerializedParagraph,
  ) {
    summary.skippedBundles.set(
      paragraph.bundle,
      (summary.skippedBundles.get(paragraph.bundle) ?? 0) + 1,
    )
  }

  private recordSkippedRecursive(
    summary: SummaryAccumulator,
    paragraph: SerializedParagraph,
  ) {
    this.recordSkipped(summary, paragraph)
    paragraph.children?.forEach((group) =>
      group.paragraphs.forEach((child) =>
        this.recordSkippedRecursive(summary, child),
      ),
    )
  }

  private persistSummary(summary: SummaryAccumulator) {
    const payload: MockImportSummary = {
      paragraphsImported: summary.paragraphsImported,
      skippedBundles: Array.from(summary.skippedBundles.entries()).map(
        ([bundle, count]) => ({ bundle, count }),
      ),
      droppedFields: summary.droppedFields,
      referencesResolvedByUuid: 0,
      referencesResolvedByLabel: [],
      referencesUnresolved: [],
    }
    this.configuration.importSummary = payload
  }
}
