# Say why the editor doesn't open a page

A link that opens a page in the editor shows the page without it, and nothing
says why. It was part of F128 of the drupal-setup findings, found on 2026-10-28
by reading the code, and moved here on 2026-10-29: the other part, the list of
pages offering pages that blökkli doesn't edit, was fixed.

## Today

- **The editor opens** when the URL has `?blokkliEditing=<uuid>` and Drupal
  gives the user at least one permission for the page (`BlokkliProvider`,
  `src/runtime/components/BlokkliProvider.vue:260-267`, in this repository).
  Otherwise the page renders as for a visitor: no editor, no "Edit" button, no
  message.
- **Drupal gives no permission** (`BlokkliProps::getPermissions()`,
  `modules/paragraphs_blokkli_graphql/src/Plugin/GraphQL/DataProducer/BlokkliProps.php:118-131`
  in `paragraphs_blokkli` at `5d40012`) when:
  - the user lacks "view paragraphs blokkli edit state";
  - blökkli isn't enabled for the page
    (`ParagraphsBlokkliConfig::isEnabledForEntity()`,
    `src/ParagraphsBlokkliConfig.php:186-200`):
    - its bundle isn't enabled;
    - content moderation moderates its bundle;
    - its latest revision isn't its default one.
- **Links that lead there:** "Switch page" (`OpenEditingController` redirects to
  the page with the parameter, whatever the page), a notification, a link
  someone shared, a page whose bundle was disabled since.

## Idea

- **`paragraphs_blokkli`:** `BlokkliProps` names the reason when it gives no
  permission, e.g. a `disabledReason` enum: `NO_PERMISSION`,
  `BUNDLE_NOT_ENABLED`, `MODERATED`, `PENDING_REVISION`.
- **The editor:** when the URL asks to edit the page and there is a reason,
  `BlokkliProvider` shows a short message with it instead of nothing. The
  adapter passes the reason on with the permissions.
- **To decide:**
  - Which reasons a user without the permission may see: perhaps only that they
    may not edit the page.
  - Where the message appears: in the page, or as a toast.
  - Whether the message offers a way out, e.g. a link to the entity's revisions
    for a pending one.
