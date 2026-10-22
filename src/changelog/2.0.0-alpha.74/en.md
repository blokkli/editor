---
date: '2026-10-22'
---

### New Features

#### File uploads

Files that you paste or drag onto the page used to be uploaded without any
further details. Now the "Add files" dialog opens for them:

- It uploads the files and shows a preview and the progress for each one.
- Fill in the details of each media, such as its name or alt text, right in the
  dialog. Errors appear at the field they concern. With "Apply to all", a value
  applies to every file.
- Set an image's focal point on its preview: with a click, by dragging or with
  the arrow keys.
- If the website offers it, "Generate" suggests an alt text for an image.
- Fields that the website's media form only shows or requires under a condition
  behave the same way in the dialog.
- Add files of different kinds, such as images and PDFs, in one go, each as the
  matching block.
- The media library has an "Upload files" button and also takes files that you
  drag onto it. It shows the newest media first, so uploaded files are at the
  top.
- Drag a single file onto the media of a block to replace it.
- If a file already exists as a media, the dialog says so, and the editor uses
  that media.
- Files whose type or size the website doesn't allow are refused as soon as you
  paste them, with a message that names the file. A file that couldn't be
  uploaded can be removed from the dialog, and the others still be added.

### Improvements

- When the website refuses a change, the editor gives the reason, for example
  that a text is too long for its field, instead of "An unexpected error
  happened". The dialogs then stay open with what you entered.
- In "Translate texts" and when importing translations, the reason appears in
  the row of the refused text, and the dialog brings that row into view.
- When publishing fails, the dialog says why.
- When a page can't be edited, a notice explains why.
- Errors in nested blocks are now reported and hold back publishing, like those
  of any other block. When you delete a misplaced block, its error goes away
  right away too.
- A link created by dragging a page or a file onto the page gets its title as
  the link text. A link text of your own is kept when you replace the target.
- You can now link to documents that you may view but not edit.
- Users who may only review pages can now also open pages that nobody has edited
  yet.
- The headings of option groups appear in the editor's language, if the website
  translates them.
- The content search and the media library show their results in the language
  you're editing.
- Searches and lists such as the content search, the media library, the library,
  the templates and "Related Content" only show what you may view. Entries that
  you may not edit no longer lead to an "Access denied" page.

### Fixes

- When several people edit the same page at the same time, changes are no longer
  lost.
- Blocks nested deeper than five levels were lost when publishing. Seven levels
  are possible now, and the editor refuses anything deeper.
- Block types that a field doesn't allow are refused right away, also when
  importing, from templates and from the library, instead of failing only when
  publishing.
- Fields that you may not edit in a page's form can't be changed through the
  editor either.
- A block's form now also shows a link whose target you may not open, and no
  longer removes it when saving.
- "Replace" from the media library or with a dropped file also works for links
  to documents.
- Duplicated blocks and templates keep their nested blocks, also on websites
  that only enable certain fields for blökkli.
- Duplicated and imported blocks keep their published status in every language.
  Templates don't take over a block's schedule.
- A detached library block stays, even if its library item is deleted before
  publishing.
- "Visible languages" and "Hide globally" now also work for blocks from the
  library and for fragments.
- Blocks that you imported from another page no longer change along with that
  page when it is changed before publishing.
- A "Publish on" or "Unpublish on" date that has passed in the meantime no
  longer prevents publishing the page. A date in the past is refused when you
  schedule it.
- Translations of the page's title and the page's other own texts are now saved.
- Fields that are the same in every language no longer appear among the texts to
  translate.
- When an automatic translation fails, the editor says so. Before,
  "Auto-translate" and "Translate" then did nothing.
- The dialog for adding a translation names the language in its title again.
- Comments are only marked as "edited" when their text was changed, no longer
  when they're resolved or a task in them is ticked.
- When dragging, the editor always moves the block you pressed the mouse button
  on, no longer the block above it or its parent by mistake.
- Selecting with a selection box only selects blocks. Before, "Create template"
  could fail afterwards.
- A text edited directly on the page sometimes still showed its old content
  after an undo or after an accepted suggestion.
- When the edit state of a page can't be loaded, the editor no longer stops with
  an error.
- The table of contents no longer contains headings that are hidden in the
  current language.
- Charts show their footnotes and category filter correctly, and the chart
  editor keeps the link to a data source.
