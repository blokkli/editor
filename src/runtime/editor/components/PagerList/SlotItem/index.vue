<script lang="ts">
import {
  defineComponent,
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  provide,
  useBlokkli,
} from '#imports'
import { itemEntityType } from '#blokkli-build/config'
import { useBlockRegistration } from '#blokkli/editor/composables'
import { withRootProps } from '#blokkli/editor/helpers/slotRoots'
import {
  SLOT_ITEM_ATTRIBUTE,
  SLOT_ITEM_SHOWN_ATTRIBUTE,
} from '#blokkli/helpers/directiveEntity'
import {
  INJECT_ENTITY_CONTEXT,
  INJECT_FIELD_USES_PROXY,
  INJECT_IS_EDITING,
  INJECT_IS_OUTSIDE_STATE,
  INJECT_PAGER_SLOT,
} from '#blokkli/helpers/injections'

/**
 * A block of a field in proxy mode, rendered by the field's slot
 * (`proxy-mode="slot"`): what `<BlokkliItem>` renders there while editing.
 *
 * The shown block is the real block. Its first element, the one of the slot or
 * of the type's component, is registered as its element and gets what the
 * editor's lists give a block's element. Every other block renders as on the
 * site: its page stands in for it.
 *
 * `<BlokkliItem>` keys it by uuid and by whether the block is shown, so that a
 * mounted block switches: what it provides and its registration are set up
 * once.
 */
export default defineComponent({
  name: 'BlokkliPagerSlotItem',
  props: {
    uuid: { type: String, required: true },
    bundle: { type: String, required: true },
    isShown: { type: Boolean, default: false },
    /** Whether it renders the project's markup, not the type's component. */
    hasSlot: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const { dom } = useBlokkli()
    const pagerSlot = inject(INJECT_PAGER_SLOT)!
    const key = getCurrentInstance()!.uid

    // One element per block: the first <BlokkliItem> of the shown block is it.
    const isBlock = props.isShown && pagerSlot.claim(props.uuid, key)

    if (props.isShown && !isBlock && import.meta.dev) {
      console.warn(
        `[blökkli] The block ${props.uuid} is rendered more than once in the ` +
          'slot of a field in proxy mode. Only the first is the block; the ' +
          'others render as on the site.',
      )
    }

    onBeforeUnmount(() => {
      if (isBlock) {
        pagerSlot.release(props.uuid, key)
      }
    })

    provide(INJECT_ENTITY_CONTEXT, {
      uuid: props.uuid,
      type: itemEntityType,
      bundle: props.bundle,
    })

    if (!isBlock) {
      // As on the site: nothing in it is registered or edited.
      provide(INJECT_IS_OUTSIDE_STATE, true)
      provide(INJECT_IS_EDITING, false)
      provide(INJECT_FIELD_USES_PROXY, true)
    } else if (props.hasSlot) {
      // The type's component registers itself (defineBlokkli).
      useBlockRegistration(dom, props.uuid)
    }

    return () => {
      // The directives in the project's markup find the block by these: their
      // context is the one of the block that holds the field.
      const marker: Record<string, string> = {
        [SLOT_ITEM_ATTRIBUTE]: props.uuid,
      }
      if (isBlock) {
        marker[SLOT_ITEM_SHOWN_ATTRIBUTE] = ''
      }

      // Called here, not through <slot>: see withRootProps().
      const nodes = withRootProps(
        slots.default?.() ?? [],
        isBlock
          ? {
              ...marker,
              class: 'bk-field-list-item',
              'data-bk-uuid': props.uuid,
              'data-bk-is-muted': pagerSlot.isMuted(props.uuid),
            }
          : marker,
        marker,
      )

      // The type's component as the only root, so that a v-show or a class on
      // <BlokkliItem> reaches its element, as everywhere else.
      return !props.hasSlot && nodes.length === 1 ? nodes[0] : nodes
    }
  },
})
</script>
