import { defineEditorSnippet } from '#blokkli/editor/composables'
import StoryColors from './StoryColors.vue'

export default defineEditorSnippet({
  id: 'comment-avatar',
  label: 'Comment avatar',
  category: 'Comments',
  description:
    'Round-corner avatar showing the user’s initials over a deterministic background colour. The colour is picked from a fixed-size palette by hashing `seed` (or `name` when `seed` is absent), so the same user always gets the same colour. Sizing is controlled externally via the `--bk-comment-avatar-size` CSS variable.',
  variants: [
    {
      label: 'Colour combinations',
      component: StoryColors,
    },
  ],
})
