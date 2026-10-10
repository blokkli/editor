# File uploads

Pasting or dropping images and files into the editor: a real upload with
progress, and the media's name, alt text and other fields filled in before the
media is saved. Planned with the user on 2026-10-10. It also fixes
[F42](../drupal-setup/findings.md#f42-uploads-skip-media-create-access).

## Today

- The clipboard feature (`src/runtime/editor/features/clipboard/index.vue`)
  reads every file into memory as a data URL, then runs one `add_image` or
  `add_file` mutation per file, one after the other, inside
  `mutateWithLoadingState`. The editor is locked throughout, without progress.
- Each request goes from the browser through Nitro (nuxt-graphql-middleware
  holds the whole body) to Drupal. Base64 adds a third, and PHP holds the
  string, its decoded copy, and a temporary file.
- Each mutation returns the whole edit state. When the third of five files
  fails, the first two are already added.
- An image and a PDF can't be dropped together ("No common block type").
- The Drupal adapter's `clipboardMapBundle` ignores the `maxFileSize` and
  `fileExtensions` that Drupal sends: a file that's too large fails after its
  upload.
- `FileUploadMutationBase` saves the media straight away, with the file name as
  its alt text, and never checks the media type's create access (F42). Nobody is
  asked for a name or an alt text, so they rarely get one.

## Decisions

- **One request per file, straight to Drupal.** A new route under
  `/paragraphs_blokkli/`, which the setup already sends to Drupal (one origin is
  a requirement). The body is the raw file, as in core's REST and JSON:API file
  uploads, sent with `XMLHttpRequest` for progress and cancelling.
- **The upload stores a temporary file in `temporary://`; the media is created
  when the user confirms**, with the values from the dialog, and only then is
  the file moved to the field's directory. A cancelled upload never reaches a
  public path or Rokka, and cron deletes it after six hours. Core's media
  library also saves the media only on "Save".
- **The fields come from the media's own form**, not from the form display's
  config: Drupal builds and processes the media entity form for a new media with
  the uploaded file, in the `media_library` form mode. It's a media entity form,
  so its base form ID is `media_form`, and the hooks a site has for media forms
  apply: `#access`, a `#required` set only by the form, validators. The values
  are submitted through the same form.
- **The descriptions reuse the existing config inputs**
  (`ParagraphsBlokkliConfigInput{Text,Checkbox,Options}`, rendered by
  `PluginConfigForm`). This is a general concept, loaded when needed: later it
  can render a node's fields instead of the node form in an iframe.
- **A media type whose form has a visible required field the dialog can't show
  isn't offered for uploads.**
- **An image and a PDF can be dropped together.** Each file gets its own
  paragraph type; a field accepts the drop when every file has one it allows.
- **The blocks are added with one mutation:** the existing
  `add_entity_reference_multiple`, which takes a paragraph type per reference.
- **Backwards compatible in Drupal:** `add_image` and `add_file` stay, with
  F42's access check. The frontend uses the new path only when Drupal's schema
  has it; an adapter without the new methods keeps the base64 path (the mock
  playground does).

## Form hooks

Best effort, no more (the user, 2026-10-10): what a real media form gives for
free is welcome, anything that takes extra work is left out. The user's
projects, for instance, show a copyright field only while a checkbox is
unticked, through a `media_form` alter that adds `#states` in an `#after_build`
callback. The dialog's form is a media entity form, so the hook runs and the
form's validation applies; the `#states` condition isn't described (see
"Later"), so the dialog shows both fields.

## The flow

1. A paste or drop starts the clipboard drag as today. Fields light up when they
   allow a paragraph type for every file; the user places the files.
2. A dialog opens with a row per file: thumbnail, file name, size, progress and
   status. Size and extension are checked first, so nothing is sent that Drupal
   refuses anyway.
3. The uploads start right away, two at a time. When a file type has several
   allowed paragraph types, the dialog asks once for all files of that type.
4. An upload returns a temporary file, or the existing media when the file is a
   duplicate (filehash, Rokka). A finished row loads its file's form and shows
   its fields, so the user fills in finished rows while the others upload. A
   duplicate's row shows its name, with nothing to fill in: changing it would
   change every page using it.
5. "Add" (enabled once every upload is done and the required fields are filled)
   creates the media in one request. Each file gets its media or its errors,
   shown next to its fields; a created media isn't created again on a retry.
   Then one mutation adds the blocks in drop order; only this step locks the
   editor.
6. "Cancel" aborts the uploads and closes the dialog.

## Steps

Drupal first (`sandbox/drupal/paragraphs_blokkli`, committed by the user), then
the schema dump, then the frontend.

### 1. Drupal: the groundwork (done, not committed)

- `MediaUploader` (`src/MediaUploader.php`) holds what `FileUploadMutationBase`
  did with the file: the source field check, the duplicate search (filehash,
  Rokka), the MIME check, the upload location, the validators (`FileIsImage` for
  image fields), and creating the media with the Rokka alt text (only the old
  mutations use that). It works on a file on disk, so the old mutations (decoded
  base64 written to a temporary file, as before) and the new route share it. A
  service: `paragraphs_blokkli.media_uploader`.
- `paragraphs_blokkli` depends on core `media` (and so on `file`): the service
  needs it, as does the settings form. `paragraphs_blokkli_update_9008` installs
  `media` where it's missing. Kernel tests that enable the module without `file`
  now list it.
- F42: the old mutations check the media type's create access on their first run
  (`ParagraphsBlokkliHelper::checkMediaCreateAccess()`).
- `drupal/filehash` is a dev dependency of the module.
- Kernel tests (`FileUploadMutationTest`): with and without the media type's
  create access, and a duplicate found by filehash.

### 2. Drupal: the upload route

- `POST /paragraphs_blokkli/upload/{type}`, `type` being `image` or `file`; the
  server resolves the media type from blökkli's settings
  (`getMediaBundleImage()`, `getMediaBundleFile()`). The adapter builds the URL
  with the language prefix, as `buildFormUrl` does.
- Access: `edit paragraphs blokkli edit state`, the media type's create access,
  and a CSRF token in the `X-CSRF-Token` header (`_csrf_request_header_token`,
  token key `CsrfRequestHeaderAccessCheck::TOKEN_KEY`). `/session/token` isn't
  routed to Drupal, so GraphQL hands out the token (step 5).
- The body: the raw file, `Content-Type: application/octet-stream`, the name in
  `Content-Disposition: file; filename="…"`, percent-encoded (an
  `XMLHttpRequest` header can't carry most non-Latin-1 characters, and core's
  parser rejects `filename*`), decoded after
  `ContentDispositionFilenameParser::parseFilename()`.
- `InputStreamFileWriter` writes the body to a temporary file; the duplicate
  search runs on it; then `FileUploadHandler` validates it and creates a
  temporary file entity owned by the user, in `temporary://`.
- The response is JSON: `{ fileId }`, or `{ media: { id, label } }` for a
  duplicate; errors are 403, 404, and 422 with the validation messages.
- Limits: the raw body is bound by PHP's `post_max_size` (not
  `upload_max_filesize`) and the web server's body size (ddev's nginx: 100M);
  the field's maximum size applies through the validators.
- Kernel tests call the controller directly, without a session cookie (the CSRF
  check only applies with one, and cookie authentication would replace the
  test's user): access, refused extension and size, the temporary file and its
  owner. The CSRF token is covered by E2E.

### 3. Drupal: the form

- A subclass of core's `MediaForm`, registered as a form handler of the media
  entity type for an operation of its own. It uses the `media_library` form
  display (`ContentEntityForm::init()` takes the operation as the form mode, so
  the subclass sets the display itself), and its `save()` adds no message and no
  redirect. Its form ID is `media_<type>_<operation>_form`, its base form ID
  `media_form`: hooks for `media_form` and `hook_form_alter()` apply, hooks for
  another form ID (`media_image_edit_form`) don't.
- The entity: an unsaved media of the type, with the temporary file in its
  source field and the name set to the source's default name (the file name), as
  core's `AddFormBase` does. `name` is required, and an empty one fails
  validation before `prepareSave()` would fill it in.
- **Describing:** the form is built and processed, so `#process` and
  `#after_build` callbacks and alter hooks run (the image widget adds its alt
  and title only with a file). Each visible element becomes a config input:
  `textfield` → `Text`, `textarea` → `Text` (multiline), `checkbox` →
  `Checkbox`, `select` and `radios` → `Options`. The name is the element's
  `#parents`, so values go back to the same place. Labels come in the page's
  language, as other labels from Drupal. `complete` is FALSE when a visible
  required element can't be described.
- **Submitting:** the values are submitted through the same form
  (`FormBuilder::submitForm()`), so `#required`, `#element_validate` (the image
  widget's required alt text is only enforced there), hooks' validators and the
  entity's constraints run. Errors come back per element name.
- A GraphQL query returns the description for a temporary file (only the user's
  own) and the media type: the config inputs and `complete`. The existing
  `ParagraphsBlokkliConfigInput` types get no changes.
- Kernel tests, with media types in a test module: the mapping, a required alt
  text, someone else's file refused, no messages left in the messenger.

### 4. Drupal: creating the media

- A GraphQL mutation, not an edit state mutation: media is shared between pages
  and saved straight away. It takes a list of `{ fileId, values }` and the
  language, and returns per item the media's ID or the errors
  (`{ name, message }`).
- Checks per item: the file is temporary and owned by the current user, and the
  user has the media type's create access.
- Per item: submit the form from step 3; when it's valid, move the file to the
  field's directory (`getUploadLocation()`), and save the media in the language
  being edited. An invalid item saves nothing.
- Kernel tests: values set, the file moved and permanent, errors returned per
  element, someone else's or a permanent file refused, no access refused.

### 5. Drupal: the clipboard config and the token

- `ParagraphsBlokkliSupportedClipboardImage` and `…File` get whether the media
  type can be uploaded: the user has create access, and its form (built without
  a file) is complete. Its cache metadata: the access result's
  (`user.permissions`) and the tags of the media type, the form display and the
  field configs.
- The token comes from a mutation, like `paragraphsBlokkliAgentToken`: the
  GraphQL results cache never caches mutations, and the token is per session.
  The adapter requests it when a dialog opens.
- Then: `ddev drush cr`, `bun run drupal:schema` in the container,
  `bun run dev:prepare` on the host (revert
  `playground/app/options-schema.json`).

### 6. blökkli: drops of several file types

- `clipboardMapBundle`'s file events get an optional `fileName`. The Drupal
  adapter checks `maxFileSize` and `fileExtensions` (from the name), and skips a
  check when the name or size is unknown (during `dragenter`, the browser gives
  neither). Both paths profit.
- The native drag's `buildMapBundleEvent` maps every file, not only the last one
  (`clipboard/helpers.ts:55`).
- On the upload path, the bundles are grouped per file type instead of
  intersected (`handleFiles`, and the native drop's `resolveBundles`): per type,
  the field's allowed bundles ∩ the mapped ones ∩ the permitted ones; no drop
  when a type has none. The groups are stored on the drag item (as `item.files`
  is), and `resolveBundles` returns one bundle so the dispatcher skips the
  bundle selector; `execute` uses the groups. The base64 path keeps the
  intersection: it passes one bundle for every file.
- Drop targets: an optional `itemBundleGroups` on the native drop item; a field
  lights up for a new item when every group has an allowed and permitted bundle
  (`helpers/dropTargets/index.ts`). One group behaves as today.
- Several files count as several items for the field's cardinality
  (`dragging-overlay/Renderer/index.vue:727`).
- On the upload path, a paste keeps the `File` objects instead of reading them
  as data URLs.
- Unit tests (Vitest): the drop target groups, the extension and size checks.

### 7. blökkli: the upload dialog

- New optional adapter methods in the clipboard feature's types:
  - `uploadFile({ file, type, onProgress, signal })`: a temporary upload or an
    existing media;
  - `getUploadForm({ upload })`: the config inputs and `complete`;
  - `createMediaFromUploads({ items })`: per item a media or errors;
  - `addBlocksFromUploads({ items, host, afterUuid })`, each item with its
    paragraph type: one mutation.
- With all four, the clipboard drop handler's `execute` opens the dialog and
  waits for it (as `showBundleSelector`'s promise does); without them it keeps
  the base64 path (`addBlockFromClipboardItem`).
- The dialog: `DialogModal`, a row per file as in the flow above, the fields
  through `PluginConfigForm` with the errors at each field, object URLs for the
  thumbnails (revoked on close), two uploads at a time, "Cancel" aborts them,
  "Retry" for failed uploads.
- No paste while a dialog is open (`onPaste` doesn't check `ui.hasDialogOpen`).
- New strings through `bun run texts`, translated for every language the editor
  ships.

### 8. The Drupal adapter

- Register the four methods only when the schema has the query, the mutations
  and the clipboard's new field (`getTypeFields`, as for the rich text's
  `paragraphs`), plus a runtime check of the field's value.
- `uploadFile`: `XMLHttpRequest` with the token, `upload.onprogress`, aborted
  through the signal.
- `getUploadForm`: the query, mapped with `mapPluginConfigInputs`.
- `addBlocksFromUploads`: `pbAddEntityReferenceMultiple`.
- `clipboardMapBundle` leaves out media types that can't be uploaded.

### 9. Tests

- The kernel tests from steps 1 to 4, and the unit tests from step 6.
- E2E (`test/e2e-drupal/features/clipboard/upload.test.ts`), pasting files (a
  `File` in the paste event's `DataTransfer`):
  - an image shows the form's fields; filling them adds the block, and its image
    has the alt text;
  - an image and a PDF add an image and a document paragraph;
  - a file that's too large is refused before uploading;
  - an error shows at its field;
  - "Cancel" adds nothing;
  - an upload without the CSRF token is refused.
- The sandbox: add `name` to the image and document types' `media_library` form
  displays, so the dialog asks for a name.

### 10. Docs and skills

- `docs/modules/drupal/`: uploads (the route, its limits, the form mode, and
  that hooks for the base form ID `media_form` apply, `#states` don't).
- The clipboard feature's `docs.md` (it still describes a sidebar that no longer
  exists) and the adapter methods.
- `skills/blokkli-setup-drupal`: the form mode decides the fields; a visible
  required field the dialog can't show prevents uploads of that type; the body
  size limits.
- The `sandbox` skill, if its config changes need explaining.

## Later

- Starting the uploads while the user places the files.
- Setting a field for all files at once.
- Suggested alt texts (Rokka's descriptions, the agent).
- An "Upload" button in the media library sidebar.
- Replacing a block's media by dropping a file on it (`replace_media`).
- Rendering a node's fields with the same descriptions, saved through
  `update_host_entity_field_value`.
- More widgets: formatted text, entity references.
- Simple `#states` conditions in the descriptions (a field shown or required
  depending on a checkbox), only if it turns out to be cheap.
- The `clipboard` drop handler emits `drop:clipboardItem`, which nothing listens
  to.
