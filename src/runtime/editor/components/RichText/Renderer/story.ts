import { defineEditorComponent } from '#blokkli/editor/composables'
import RichTextRenderer from './index.vue'

const fullBody = [
  '<p>Hi <span class="bk-richtext-mention" data-type="mention" data-id="2" data-label="Martin Faux">@Martin Faux</span> — quick recap of <strong>where we are</strong> and what\'s left.</p>',
  '<p>The bug appears <em>only on Safari</em> when calling <code>fetchUser()</code>. Details in the <a href="https://example.com/ticket/123">ticket</a>; full <s>repro steps</s> updated repro steps below.</p>',
  '<blockquote><p>Reproduces 100% on staging, never on prod.</p></blockquote>',
  "<p>Things I've already tried (with sub-points):</p>",
  '<ul>',
  '<li>Cleared the <strong>session cookies</strong><ul><li>Both first-party</li><li>And cross-site</li></ul></li>',
  '<li>Forced an <em>incognito reload</em><ul><li>Safari Technology Preview<ul><li>17.4</li><li>17.5</li></ul></li><li>Stable Safari 17.3</li></ul></li>',
  '<li>Tried with the feature flag <s>off</s> on</li>',
  '</ul>',
  '<p>Next steps (with sub-steps):</p>',
  '<ol>',
  '<li>Reproduce locally<ol><li>Pull <code>main</code></li><li>Reset local DB</li><li>Run <code>npm run dev</code></li></ol></li>',
  "<li>Bisect against last week's deploy</li>",
  '<li>Open a Linear ticket if it\'s a regression<ul><li>Tag <strong>P1</strong></li><li>CC <span class="bk-richtext-mention" data-type="mention" data-id="3" data-label="Sarah Chen">@Sarah Chen</span></li></ul></li>',
  '</ol>',
  '<p>Punch list:</p>',
  '<ul data-type="taskList"><li data-type="taskItem" data-checked="true">Reproduce locally</li><li data-type="taskItem" data-checked="true">Capture HAR file</li><li data-type="taskItem" data-checked="false">Open a Linear ticket</li><li data-type="taskItem" data-checked="false">Loop in <span class="bk-richtext-mention" data-type="mention" data-id="3" data-label="Sarah Chen">@Sarah Chen</span> for a tone check</li></ul>',
].join('')

export default defineEditorComponent({
  id: 'richtext-renderer',
  label: 'Renderer',
  category: 'Rich Text',
  component: RichTextRenderer,
  description:
    'Read-only renderer for the HTML produced by the RichText editor. Enriches stored task-item markup back into the label/input/checkbox DOM so the same CSS works in both editor and display. Pass `taskTogglable` to make checkboxes interactive — clicks emit `toggleTask` with the document-order index of the task item.',
  variants: [
    {
      label: 'All formatting',
      description:
        'Demonstrates every supported feature — paragraphs, bold, italic, strikethrough, inline code, links, blockquote, bulleted list, numbered list, mentions, and a task list with mixed checked/unchecked items.',
      props: {
        body: fullBody,
      },
    },
    {
      label: 'Task list, togglable',
      description:
        'Same body but with `taskTogglable` enabled. Clicking a checkbox emits `toggleTask` (no internal state change) — the consumer is expected to persist the toggle and pass the updated body back.',
      props: {
        body: fullBody,
        taskTogglable: true,
      },
    },
    {
      label: 'Plain text',
      description:
        'A comment body without any markup. Plain-text bodies pass through unchanged.',
      props: {
        body: 'Looks great — shipping it.',
      },
    },
    {
      label: 'Empty',
      description: 'Empty body. The component renders an empty container.',
      props: {
        body: '',
      },
    },
  ],
})
