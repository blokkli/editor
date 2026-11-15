import {
  computed,
  defineAsyncComponent,
  defineComponent,
  h,
  inject,
  provide,
} from '#imports'
import type { Component, PropType, VNodeChild } from 'vue'
import type {
  CompositionImagePlacement,
  CompositionPrimitive,
  CompositionRenderNode,
} from '../../types'
import type { FieldListItem } from '#blokkli/types'
import { primitives, tokens } from '#blokkli-build/composition-definitions'
import { primitiveComponents } from '#blokkli-build/composition-components'
import { getNodeClasses, resolveBaseValue } from '../../helpers'
import { CHILD_KEY_OPTION } from '../../helpers/markup'
import {
  INJECT_FIELD_PARENT_TYPE,
  INJECT_IS_EDITING,
} from '#blokkli/helpers/injections'
import BlokkliItem from '../../../../../runtime/components/BlokkliItem.vue'
import { INJECT_COMPOSITION_CHILD } from '../../composables/useCompositionChild'

// The editor's variant, which registers the block: only loaded while editing.
const EditingBlokkliItem = defineAsyncComponent(
  () =>
    import('../../../../../runtime/components/BlokkliItem.vue?blokkliEditing=true'),
)

/**
 * A child of the composition: where its placement and its element come from,
 * for the paragraph type's component for compositions.
 */
const CompositionChild = defineComponent({
  name: 'CompositionChild',
  props: {
    childKey: { type: String, required: true },
    placement: {
      type: Object as PropType<CompositionImagePlacement | null>,
      default: null,
    },
    as: { type: String as PropType<string | null>, default: null },
  },
  setup(props, { slots }) {
    provide(
      INJECT_COMPOSITION_CHILD,
      computed(() => ({
        key: props.childKey,
        placement: props.placement,
        as: props.as,
      })),
    )
    return () => slots.default?.()
  },
})

/**
 * The props the render component declares. Values for any other prop would
 * fall through as attributes: `variant="primary"` in the markup, and
 * `onDark` taken for an event listener.
 */
function getDeclaredProps(component: Component): Set<string> {
  const props = (component as { props?: unknown }).props
  if (Array.isArray(props)) return new Set(props as string[])
  if (props && typeof props === 'object') return new Set(Object.keys(props))
  return new Set()
}

/**
 * The values of a primitive's props that aren't classes: texts, urls,
 * booleans, and the enums' base value. Only those the component declares.
 */
function getValues(
  props: Record<string, unknown>,
  primitive: CompositionPrimitive,
  component: Component,
): Record<string, unknown> {
  const declared = getDeclaredProps(component)
  const result: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(primitive.props)) {
    if (!declared.has(key)) continue
    const value = props[key] ?? prop.default
    if (prop.type === 'text' || prop.type === 'url') {
      result[key] = typeof value === 'string' ? value : ''
    } else if (prop.type === 'boolean') {
      result[key] = value === true
    } else if (prop.type === 'enum') {
      result[key] = resolveBaseValue(value)
    }
  }
  return result
}

/**
 * Renders the server's tree. It holds only what the server accepted; every
 * element gets the scope attribute, so that the composition's CSS reaches it.
 */
export default defineComponent({
  name: 'CompositionNodes',
  props: {
    nodes: {
      type: Array as PropType<CompositionRenderNode[]>,
      required: true,
    },
    scope: { type: String, required: true },
    /** The paragraphs of the composition's field. */
    children: {
      type: Array as PropType<FieldListItem[]>,
      default: () => [],
    },
  },
  setup(props) {
    const isEditing = inject(INJECT_IS_EDITING, false)
    const parentType = inject(INJECT_FIELD_PARENT_TYPE, '')

    /**
     * A child: its paragraph, without a box. The class, the scope and the key
     * pass through `BlokkliItem` to the root of the paragraph's component,
     * which is the element the markup placed. Without its paragraph, nothing.
     */
    function renderChild(
      node: Extract<CompositionRenderNode, { kind: 'child' }>,
      common: Record<string, unknown>,
    ): VNodeChild {
      const index = props.children.findIndex(
        (child) => child.options?.[CHILD_KEY_OPTION] === node.id,
      )
      const item = props.children[index]
      if (!item || item.bundle !== node.bundle) return null
      const attrs = { ...common, 'data-bkc-child': node.id }
      return h(
        CompositionChild,
        {
          childKey: node.id,
          placement: node.placement ?? null,
          as: node.as ?? null,
        },
        () =>
          isEditing
            ? h(EditingBlokkliItem, {
                ...attrs,
                key: item.uuid,
                uuid: item.uuid,
                bundle: item.bundle,
                options: item.options,
                props: item.props,
                isEditing: true,
                index,
                parentType,
                class: [node.class, 'bk-field-list-item'],
                'data-bk-uuid': item.uuid,
              })
            : h(BlokkliItem, {
                ...attrs,
                key: item.uuid,
                uuid: item.uuid,
                bundle: item.bundle,
                options: item.options,
                props: item.props,
                index,
                parentType,
                class: node.class,
              }),
      )
    }

    function render(nodes: CompositionRenderNode[]): VNodeChild[] {
      return nodes.map((node) => {
        if (node.kind === 'text') {
          return node.text
        }
        const common: Record<string, unknown> = { [props.scope]: '' }
        if (node.kind === 'child') {
          return renderChild(node, common)
        }
        if (node.kind === 'element') {
          const children = render(node.children)
          return h(
            node.tag,
            { ...node.attrs, class: node.class, ...common },
            children.length ? children : undefined,
          )
        }
        const primitive = primitives[node.type]
        const component = primitiveComponents[node.type]
        if (!primitive || !component) {
          return null
        }
        const classes = [
          ...getNodeClasses(node.props, primitive, tokens),
          node.class,
        ]
          .filter(Boolean)
          .join(' ')
        const slots = Object.fromEntries(
          Object.entries(node.slots).map(([name, children]) => [
            name,
            () => render(children),
          ]),
        )
        return h(
          component,
          {
            ...getValues(node.props, primitive, component),
            class: classes,
            ...common,
          },
          slots,
        )
      })
    }

    return () => render(props.nodes)
  },
})
