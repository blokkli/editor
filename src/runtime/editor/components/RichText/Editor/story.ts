import { defineEditorComponent } from '#blokkli/editor/composables'
import RichText from './index.vue'

export default defineEditorComponent({
  id: 'richtext-editor',
  label: 'Editor',
  category: 'Rich Text',
  component: RichText,
  description:
    'Proof-of-concept WYSIWYG editor built on TipTap v3. Supports bold, italic, strikethrough, inline code, bulleted/numbered/task lists, blockquotes, links, and Slack-style @-mentions. Mentions are wired via the optional `getUsers` async callback (omitted here = no suggestions). Output is HTML via `v-model`.',
  variants: [
    {
      label: 'Empty',
      description:
        'Empty editor with no `getUsers` callback — typing "@" opens the popover but it stays empty. Use the toolbar for formatting; Cmd/Ctrl+B and Cmd/Ctrl+I work too.',
      props: {
        initialValue: '',
      },
    },
    {
      label: 'Pre-filled (all formatting)',
      description:
        'Demonstrates round-trip: a stored HTML body covering every supported feature — mention pill, bold, italic, strikethrough, inline code, link, bulleted list, numbered list, blockquote, and task list with both checked states.',
      props: {
        initialValue: [
          '<p>Hi <span class="bk-richtext-mention" data-type="mention" data-id="2" data-label="Martin Faux">@Martin Faux</span> — can you take a look at <strong>this issue</strong>?</p>',
          '<p>The bug appears <em>only on Safari</em> when calling <code>fetchUser()</code>. Details in the <a href="https://example.com/ticket/123">ticket</a>.</p>',
          '<blockquote><p>Reproduces 100% on staging, never on prod.</p></blockquote>',
          "<p>Things I've already tried:</p>",
          '<ul><li>Cleared the <strong>session cookies</strong></li><li>Forced an <em>incognito reload</em></li><li>Tried with the feature flag <s>off</s> on</li></ul>',
          '<p>Next steps:</p>',
          "<ol><li>Reproduce locally</li><li>Bisect against last week's deploy</li><li>Open a Linear ticket if it's a regression</li></ol>",
          '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">Reproduce locally</li><li data-type="taskItem" data-checked="false">Open a Linear ticket</li></ul>',
        ].join(''),
      },
    },
    {
      label: 'Custom user list',
      description:
        'The mention popover is fed via the `getUsers` prop — an async callback so consumers can lazy-load users on first @-press. Here it resolves to two hardcoded users.',
      props: {
        initialValue: '',
        getUsers: () =>
          Promise.resolve([
            { id: 'a', label: 'Alice Anderson' },
            { id: 'b', label: 'Bob Baker' },
          ]),
      },
    },
  ],
})
