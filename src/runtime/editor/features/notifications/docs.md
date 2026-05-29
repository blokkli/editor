## Sidebar

The sidebar pane lists the current user's notifications (mentions, resolved
comments, edit state events). The toolbar tab shows a badge with the number of
unread notifications.

## Deep linking

Each notification links to its host entity in edit mode. The feature builds the
URL from the host entity URL plus `?blokkliEditing=<uuid>` and any type-specific
query parameter (e.g. `blokkliComment=<uuid>` for comment notifications). Links
open in a new tab.
