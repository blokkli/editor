import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'special-features',
  title: 'Special Features',
  weight: 500,
  modes: ['editing'],
  getPrompt: () => {
    return `### Block Library
These are reusable blocks that are shared across multiple pages. They can not be edited, but they can be "detached", at which point they become editable.

### Templates
These are pre-defined groups of blocks that can be added to the page. Unlike "library blocks" they are copied to the page and can be edited immediately.`
  },
})
