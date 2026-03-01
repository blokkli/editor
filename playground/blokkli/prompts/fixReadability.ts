import { defineBlokkliAgentPrompt } from '#blokkli/agent/app/composables'

export default defineBlokkliAgentPrompt({
  id: 'fix_readability',
  skills: ['rewrite-and-translate', 'asses-and-fix-readability'],
  tools: [
    'get_readability_issues',
    'check_readability_for_texts',
    'stream_text_fields',
  ],
  getLabel: () => {
    return 'Fix readability...'
  },
  getPrompt: () => {
    return `The readability issues have already been analyzed and the fix has been applied. Do not call any more tools. Just very briefly confirm that you are done.`
  },
  getUserPrompt: () => {
    return `Fix the readability of the selected paragraphs.`
  },

  async preExecute({ selectedUuids, runTool }) {
    const readability = await runTool(
      'get_readability_issues',
      selectedUuids.length
        ? {
            uuids: selectedUuids,
          }
        : {},
    )

    const fields = Object.entries(readability.result).flatMap(
      ([uuid, fieldMap]) =>
        Object.keys(fieldMap).map((fieldName) => ({ uuid, fieldName })),
    )

    return {
      preSeededResults: [readability],
      autoExecuteTools:
        fields.length > 0
          ? [
              {
                toolName: 'stream_text_fields',
                params: {
                  template: 'fix_readability',
                  templateParams: {},
                  fields,
                },
              },
            ]
          : undefined,
    }
  },
})
