# assistantGetResults()

This method should make a request to an AI assistant with the given prompt and
context and return the generated text from said AI assistant.

The method is called when the user drag and drops the "Add with AI Assitant"
action in a field, writes their prompt in the assistant sidebar pane and clicks
on "Generate".

::: code-group

```typescript [~/app/blokkli.editAdapter.ts]
import {
  defineBlokkliEditAdapter,
  type AdapterAssistantGetResults,
} from '#blokkli/adapter'

export default defineBlokkliEditAdapter((ctx) => {
  return {
    assistantGetResults: async (e: AdapterAssistantGetResults) => {
      const response = await $fetch('/api/gpt', {
        method: 'post',
        body: {
          prompt: e.prompt,
        },
      })

      return {
        type: 'markup',
        text: response.text,
      }
    },
  }
})
```

:::
