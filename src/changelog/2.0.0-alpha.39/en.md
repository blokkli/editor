---
date: "2026-02-22"
---

### New Features

- **AI Assistant file attachments**: Drag and drop files (including Word documents) directly onto the AI chat panel to attach them as context — the content is automatically extracted and formatted.
- **AI readability analysis**: The AI assistant can now analyze the page for readability issues and iteratively improve texts based on readability scores.
- **AI prompt routing**: On the first message of a conversation, the assistant automatically determines which tools are most relevant and pre-loads them before responding.
- **AI tool details**: Completed AI tool calls in the conversation can now show an expandable details panel with additional context.
- **AI welcome popup**: A welcome popup now introduces new users to the AI assistant when the editor opens.

### Improvements

- The AI assistant sidebar button has been moved to the bottom-right of the toolbar and features an animated star icon.
- The "Start new conversation" and "Past conversations" buttons are now shown directly in the input area instead of in a dropdown.
- Double-clicking a complex data option (e.g. chart data) now immediately opens the editor for that option.
- The AI assistant shows a reconnection indicator in the chat when the connection drops temporarily.

### Fixes

- Selecting text inside an inline-editable field no longer accidentally closes the editor when releasing the mouse outside the field.
- The middle mouse button no longer interrupts drag-and-drop interactions.
- Incomplete or truncated AI responses are now handled gracefully instead of silently failing.
