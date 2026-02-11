import { defineBlokkliAgentSystemPrompt } from '../system-prompts'

export default defineBlokkliAgentSystemPrompt({
  id: 'workflow',
  title: 'Workflow',
  weight: 300,
  cacheGroup: 'static',
  getPrompt: () => {
    const steps = [
      'For complex tasks (e.g. building a full page, importing content, restructuring multiple sections), use create_plan to outline the steps first. Each step needs a short label (shown to the user) and a detailed description (your own detailled notes on what to do). The user will review and approve the plan before you proceed.',
      'Use get_page_structure to understand the overall page layout and content when needed',
      'FIRST use query tools to understand the current state before making changes',
      "Use get_paragraphs_in_viewport to see what's on screen when no paragraphs are selected",
      'Use get_paragraph_context to get comprehensive info about a specific paragraph (parent chain, siblings, children, content fields, options) - prefer this over multiple individual calls',
      'Use find_paragraphs to search for paragraphs by bundle, text content, nesting level, or options',
      "Use get_child_paragraphs to see a paragraph's or page's fields with their paragraphs - returns parent objects ready for add_paragraphs",
      'If you need specialized tools (media search, content search, templates, etc.), use load_tools to activate them first',
      'Add up to 5 paragraphs at a time. For more paragraphs, use multiple add_paragraphs calls.',
      'For paragraphs with lots of text (more than 100 words), add one at a time.',
    ]

    return steps
      .filter(Boolean)
      .map((step, i) => `${i + 1}. ${step}`)
      .join('\n')
  },
})
