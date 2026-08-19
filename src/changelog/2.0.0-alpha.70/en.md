---
date: '2026-08-19'
---

### Fixes

- The AI assistant only knew which blocks were selected for the first message of
  a conversation. Later on it worked with an outdated selection or guessed. It
  now receives the current selection with every message.
- Selecting blocks was undone when the AI assistant looked something up on the
  page. The selection now stays as it was.
- When editing access changed while the AI assistant was open — for example
  after assigning the edit state to yourself — the assistant kept behaving as if
  the page were still read-only. It now follows changes to editing access,
  language, and publication state during a conversation.
