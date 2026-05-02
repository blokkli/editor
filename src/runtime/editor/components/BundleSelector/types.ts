import type { AddListItemProps } from '#blokkli/editor/components/AddListItem/index.vue'
import type { AddAction } from '#blokkli/editor/types/actions'

export type Item =
  | {
      type: 'block'
      bundle: string
      label: string
      description: string
      props: AddListItemProps
    }
  | {
      type: 'action'
      action: AddAction
      label: string
      description: string
      props: AddListItemProps
    }
  | {
      type: 'fragment'
      name: string
      label: string
      description: string
      props: AddListItemProps
    }
