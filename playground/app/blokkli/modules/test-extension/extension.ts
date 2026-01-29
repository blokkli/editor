import { defineBlokkliAdapterExtension } from '#blokkli/editor/adapter'
import { defineAnalyzer } from '#blokkli/analyzer'

const testAnalyzer = defineAnalyzer(() => {
  return {
    id: 'test-extension-analyzer',
    continuous: false,
    run: async function (context) {
      // Simple analyzer that checks if any text contains "TODO"
      const allTextElements = context.getTextElements()

      const nodes = allTextElements
        .filter((v) => v.text.toLowerCase().includes('todo'))
        .map((element) => ({
          description: element.text,
          targets: [element.element],
        }))

      if (nodes.length === 0) {
        return null
      }

      return {
        id: 'test-extension-todo',
        category: 'text',
        title: 'TODO found in content',
        description:
          'This analyzer was provided by a test extension module! It found TODO items in the content.',
        status: 'violation',
        nodes,
      }
    },
  }
})

export default defineBlokkliAdapterExtension(() => ({
  getAnalyzers: () => [testAnalyzer()],
}))
