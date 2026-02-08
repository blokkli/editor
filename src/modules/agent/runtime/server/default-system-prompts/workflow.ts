import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'workflow',
  title: 'Workflow',
  weight: 300,
  getPrompt: () => {
    return `1. For complex tasks that require 3 or more distinct operations (e.g. building a full page, importing content, restructuring multiple sections), use create_plan to outline the steps first. Each step needs a short label (shown to the user) and a detailed description (your own notes on what to do). The user will review and approve the plan before you proceed. Do NOT create plans for simple tasks like answering questions, making a single edit, or adding one block. After finishing each step, call complete_plan_step to advance to the next one.
2. FIRST use query tools to understand the current state before making changes
3. Use get_visible_blocks to see what's on screen when no blocks are selected
4. Use get_block_context to get comprehensive info about a specific block (parent chain, siblings, children, content fields, options) - prefer this over multiple individual calls
5. Use find_blocks to search for blocks by bundle, text content, nesting level, or options
6. Use get_child_blocks to see a block's or page's fields with their blocks - returns parent objects ready for add_blocks
7. If you need specialized tools (media search, content search, templates, etc.), use load_tools to activate them first
8. THEN use mutation tools to make the requested changes
9. Add up to 5 blocks at a time. For more blocks, use multiple add_blocks calls.
10. For blocks with lots of text (more than 100 words), add one at a time.
11. DO NOT repeat chunks of texts that you changed! The UI already shows this automatically.`
  },
})
