# Notify the people working on a page of new comments

A new comment notifies nobody unless it mentions someone. It was F40 of the
drupal-setup findings, found on 2026-09-28, and moved here on 2026-10-29: it's a
feature that `paragraphs_blokkli` doesn't have, not a bug.

## Today

- An editor comments on a page. The other people working on it see the comment
  only when they open the page, unless the comment mentions them.
- The comment module creates four kinds of notifications
  (`modules/paragraphs_blokkli_comment/src/CommentNotifier.php:74-76`, `:96-102`
  in `paragraphs_blokkli` at `5d40012`):
  - `comment:mention`, to every user the comment mentions;
  - `comment:reply`, to the author of the comment that is replied to;
  - `comment:thread`, to the other participants of the thread;
  - `comment:resolved`, to the participants of a thread that is resolved.
- **Workaround:** mention the person who should see it.

## Idea

- Notify the owner of the page's edit state of a new comment on their page: a
  new kind, e.g. `comment:new`, next to the four above.
- **To decide:**
  - Who else, if anyone: the page's author, everyone who commented on the page
    before.
  - That nobody gets two notifications for one comment, e.g. the owner who is
    also mentioned.
  - Whether the author of the comment is left out, as for the other kinds.
