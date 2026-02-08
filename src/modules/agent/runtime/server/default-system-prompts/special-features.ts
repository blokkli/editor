import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'special-features',
  title: 'Special Features',
  weight: 500,
  modes: ['editing'],
  getPrompt: () => {
    return `
### Templates
These are pre-defined groups of blocks that can be added to the page. Unlike "library blocks" they are copied to the page and can be edited immediately.`
  },
})
