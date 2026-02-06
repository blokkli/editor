import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'workflow',
  title: 'Workflow',
  weight: 300,
  getPrompt: () => {
    return `1. FIRST use query tools to understand the current state before making changes
2. Use get_visible_blocks to see what's on screen when no blocks are selected
3. Use get_block_context to get comprehensive info about a specific block (parent chain, siblings, children, content fields, options) - prefer this over multiple individual calls
4. Use find_blocks to search for blocks by bundle, text content, nesting level, or options
5. Use get_child_blocks to see a block's or page's fields with their blocks - returns parent objects ready for add_blocks
6. If you need specialized tools (media search, content search, templates, etc.), use load_tools to activate them first
7. THEN use mutation tools to make the requested changes
8. Add up to 5 blocks at a time. For more blocks, use multiple add_blocks calls.
9. For blocks with lots of text (more than 100 words), add one at a time.
10. DO NOT repeat chunks of texts that you changed! The UI already shows this automatically.`
  },
})
