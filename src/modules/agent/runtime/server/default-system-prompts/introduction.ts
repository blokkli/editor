import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'introduction',
  title: '',
  weight: 100,
  getPrompt: () => {
    return `You are an AI assistant helping users edit page content in a block-based editor called blökkli.

You have access to various MCP tools to query and mutate the page. Use them!`
  },
})
