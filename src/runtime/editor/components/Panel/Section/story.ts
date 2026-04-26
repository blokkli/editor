import { h } from '#imports'
import { defineEditorComponent } from '#blokkli/editor/composables'
import Action from '#blokkli/editor/components/Panel/Action/index.vue'
import Section from './index.vue'

function bodyParagraph(text: string) {
  return h('p', { class: 'text-sm text-mono-700' }, text)
}

export default defineEditorComponent({
  id: 'panel-section',
  label: 'Panel section',
  category: 'Panels',
  component: Section,
  description:
    'Boxed section with an uppercase title and a content area. Use to group related controls inside a panel.',
  variants: [
    {
      label: 'Default',
      props: {
        title: 'General',
      },
      slots: {
        default: () =>
          h('div', { class: 'p-15' }, [
            bodyParagraph(
              'Place form fields, toggles or other controls inside the section body.',
            ),
          ]),
      },
    },
    {
      label: 'Multi-paragraph body',
      props: {
        title: 'Description',
      },
      slots: {
        default: () =>
          h('div', { class: 'p-15 flex flex-col gap-10' }, [
            bodyParagraph(
              'Sections do not constrain their content — render anything you need inside.',
            ),
            bodyParagraph(
              'A second paragraph showing how the panel handles taller bodies.',
            ),
          ]),
      },
    },
    {
      label: 'With actions',
      description:
        'Use the `actions` slot to render a row of `PanelAction` components at the bottom.',
      props: {
        title: 'Block',
      },
      slots: {
        default: () =>
          h('div', { class: 'p-15' }, [
            bodyParagraph('Body content with a row of actions below.'),
          ]),
        actions: () => [
          h(Action, { title: 'Edit', icon: 'bk_mdi_edit' }),
          h(Action, { title: 'Duplicate', icon: 'bk_mdi_content_copy' }),
          h(Action, { title: 'Delete', icon: 'bk_mdi_delete' }),
        ],
      },
    },
    {
      label: 'Disabled',
      description:
        'Dims the entire section (including any actions) and blocks pointer events.',
      props: {
        title: 'Locked',
        disabled: true,
      },
      slots: {
        default: () =>
          h('div', { class: 'p-15' }, [
            bodyParagraph('Cannot interact with anything in this section.'),
          ]),
        actions: () => [
          h(Action, { title: 'Edit', icon: 'bk_mdi_edit' }),
          h(Action, { title: 'Delete', icon: 'bk_mdi_delete' }),
        ],
      },
    },
  ],
})
