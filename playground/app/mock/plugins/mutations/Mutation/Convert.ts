import type { MutationContext } from '#mock/state/EditState'
import { createParagraph, getParagraphBundles } from '#mock/state/Paragraph'
import type { Paragraph } from '#mock/state/Paragraph/Paragraph'
import type { FieldText } from '#mock/state/Field/Text'
import type { FieldTextarea } from '#mock/state/Field/Textarea'
import { Mutation } from '../Mutation'

export type MutationConvertArgs = {
  uuids: string[]
  targetBundle: string
}

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const stripTags = (html: string): string =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Bundle-specific field mappers, keyed by `<source>->'<target>`. They translate
 * the *content* between bundles whose fields don't share ids — the generic
 * same-id copy in `execute()` already carries over fields the two bundles have
 * in common (e.g. `teaser`→`button` keeps `title` + `url`, so it needs no
 * mapper). Mappers read the source's raw (unprocessed) values and write the
 * target's, leaving the target's defaults in place for anything unmapped.
 */
const fieldMappers: Record<
  string,
  (source: Paragraph, target: Paragraph) => void
> = {
  // A title's heading + lead become the text block's rich-text markup.
  'title->text': (source, target) => {
    const title = source.get<FieldText>('title').getUnprocessed()
    const lead = source.get<FieldText>('lead').getUnprocessed()
    const html = [
      title ? `<h2>${escapeHtml(title)}</h2>` : '',
      lead ? `<p>${escapeHtml(lead)}</p>` : '',
    ]
      .filter(Boolean)
      .join('')
    if (html) {
      target.get<FieldTextarea>('text').setText(html)
    }
  },
  // The text block's markup is flattened: the first sentence becomes the
  // title, the remainder the lead.
  'text->title': (source, target) => {
    const plain = stripTags(source.get<FieldTextarea>('text').getUnprocessed())
    if (!plain) {
      return
    }
    const [first, ...rest] = plain.split(/(?<=[.!?])\s+/)
    if (first) {
      target.get<FieldText>('title').setText(first)
    }
    const lead = rest.join(' ').trim()
    if (lead) {
      target.get<FieldText>('lead').setText(lead)
    }
  },
}

export class MutationConvert extends Mutation {
  constructor(configuration?: Record<string, any>) {
    super('convert', configuration)
  }

  override getAffectedUuid(args: MutationConvertArgs): string | undefined {
    return args.uuids[0]
  }

  override execute(context: MutationContext, args: MutationConvertArgs) {
    const bundleDefinition = getParagraphBundles().find(
      (v) => v.bundle === args.targetBundle,
    )
    if (!bundleDefinition) {
      return
    }

    for (const uuid of args.uuids) {
      const proxy = context.getProxy(uuid)
      if (!proxy) {
        continue
      }

      const source = proxy.block
      if (source.bundle === args.targetBundle) {
        continue
      }

      // Replace the proxy's block with a fresh instance of the target bundle,
      // keeping the same UUID and position. We only mutate the proxy (a detached
      // clone), never the stored entity, so replaying the mutation stays
      // deterministic and undo restores the original bundle.
      const converted = createParagraph(args.targetBundle, source.uuid)
      converted.setValues(bundleDefinition.getDefaultValues())

      // Carry over every field the two bundles share by id (common metadata
      // like `options`/`isNew`/publish dates, plus same-named content fields).
      const sourceValues = source.getValues()
      const shared: Record<string, any> = {}
      for (const key of Object.keys(converted.fields)) {
        if (key in sourceValues) {
          shared[key] = sourceValues[key]
        }
      }
      converted.setValues(shared)

      // Translate content between fields that don't share ids.
      fieldMappers[`${source.bundle}->${args.targetBundle}`]?.(
        source,
        converted,
      )

      converted.translationValues = JSON.parse(
        JSON.stringify(source.translationValues),
      )

      proxy.block = converted
    }
  }
}
