import { defineCodeTemplate } from '../../../../build/templates/defineTemplate'
import { isBlock } from '../../../../build/Collector/Blocks'
import type { BlockDefinitionInputBase } from '../../../../global/types/definitions'

/** `call_to_action` → `CallToAction`. */
function bundleToTag(bundle: string): string {
  return bundle
    .split(/[_-]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * The paragraph types a composition can place: those with a component for
 * compositions (`renderFor: { parentBundle: '<a composition type>' }`). A
 * composition type is one with an option of the `composition` data type. A
 * type holds a text if its component edits one (`v-blokkli-editable:<field>`):
 * what's between its tags in the markup is that field's value.
 */
export default defineCodeTemplate(
  'composition-children',
  (ctx) => {
    const files = [...ctx.blocks.files.values()].filter(
      (file): file is typeof file & { definition: BlockDefinitionInputBase } =>
        !!file.definition && isBlock(file.definition),
    )
    const definitions = files.map((file) => file.definition)

    const compositionBundles = definitions
      .filter(
        (d) =>
          !d.renderFor &&
          Object.values(d.options ?? {}).some(
            (option) =>
              option.type === 'json' &&
              'dataType' in option &&
              option.dataType === 'composition',
          ),
      )
      .map((d) => d.bundle)

    const children: Record<string, { tag: string; textField?: string }> = {}
    for (const { definition: d, fileContents } of files) {
      const renderFor = d.renderFor
        ? Array.isArray(d.renderFor)
          ? d.renderFor
          : [d.renderFor]
        : []
      const isChild = renderFor.some(
        (r) =>
          'parentBundle' in r && compositionBundles.includes(r.parentBundle),
      )
      if (isChild) {
        const textField = /v-blokkli-editable:([\w.]+)/.exec(fileContents)?.[1]
        children[d.bundle] = {
          tag: bundleToTag(d.bundle),
          ...(textField ? { textField } : {}),
        }
      }
    }

    return `export const compositionBundles = ${JSON.stringify(compositionBundles)}

export const compositionChildren = ${JSON.stringify(children, null, 2)}
`
  },
  () => `/** The paragraph types with a composition option. */
export const compositionBundles: string[]

/**
 * The paragraph types a composition can place, by bundle: the tag for each,
 * and the field of its text if it holds one.
 */
export const compositionChildren: Record<
  string,
  { tag: string; textField?: string }
>
`,
  {
    dependencies: ['block-content', 'block-path'],
    write: true,
    context: 'both',
  },
)
