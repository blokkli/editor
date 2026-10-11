# File uploads

Pasting or dropping images and files into the editor: a real upload with
progress, and the media's name, alt text and other fields filled in before the
media is saved. Planned with the user on 2026-10-10. It also fixed F42 of the
drupal-setup findings: uploads skipped the media type's create access.

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
- **The upload stores a temporary file where its field stores files; the media
  is created when the user confirms**, with the values from the dialog. Until
  step 15, the file stayed in `temporary://` and was moved when the media was
  created, so that a cancelled upload never reached a public path or Rokka. It
  changed for the generated alt texts: Rokka can only describe an image it has.
  Core's media form stores an upload the same way, and its media library also
  saves the media only on "Save".
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

### 1. Drupal: the groundwork (done)

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

### 2. Drupal: the upload route (done)

- `POST /paragraphs_blokkli/upload/{type}?_format=json`, `type` being `image` or
  `file`, which is also the source the media type must use.
  `ParagraphsBlokkliConfig::getUploadMediaBundle()` resolves the media type from
  blökkli's settings. The adapter builds the URL with the language prefix, as
  `buildFormUrl` does. With `_format: json`, errors come back as JSON
  (`{ message }`).
- Access: `edit paragraphs blokkli edit state`, the media type's create access
  (a type without a media type is a 403), and a CSRF token in the `X-CSRF-Token`
  header (`_csrf_request_header_token`, token key
  `CsrfRequestHeaderAccessCheck::TOKEN_KEY`). A project needn't send core's
  `/session/token` to Drupal (the sandbox does), so GraphQL hands out the token
  (step 5).
- The body: the raw file, `Content-Type: application/octet-stream`, the name in
  `Content-Disposition: file; filename="…"`, percent-encoded (an
  `XMLHttpRequest` header can't carry most non-Latin-1 characters, and core's
  parser rejects `filename*`), decoded after
  `ContentDispositionFilenameParser::parseFilename()`.
- `UploadController` copies the body (`$request->getContent(TRUE)`, not
  `InputStreamFileWriter`, which only reads `php://input`) to a temporary file.
  A body shorter than its `Content-Length` is a 413: PHP discards a body larger
  than `post_max_size`. The duplicate search runs on the file; a duplicate the
  user can view is returned instead. Otherwise `MediaUploader::storeFile()`
  checks it and creates a temporary file entity owned by the user, in
  `temporary://paragraphs_blokkli`.
- The response: `{ fileId }`, or `{ media: { id, label } }` for a duplicate.
  Errors: 400 (no file name), 403, 404 (another type), 413, 422 (the validation
  messages).
- Limits: the raw body is bound by PHP's `post_max_size` (not
  `upload_max_filesize`) and the web server's body size (ddev's nginx: 100M);
  the field's maximum size applies through the validators.
- Kernel tests (`UploadControllerTest`) send requests through the HTTP kernel
  without a session cookie, so the CSRF check doesn't apply; the route's CSRF
  requirement is asserted on the route. Each test has its own temporary
  directory: `temporary://` is otherwise the shared system one.
- On the dev site, nginx sends the route to Drupal, with or without a language
  prefix. A test with a real session (log in, get the token, upload) comes with
  step 5's token.

### 3. Drupal: the form (done)

- `MediaUploadForm` (`src/Form/MediaUploadForm.php`), a `ContentEntityForm`
  (core's `MediaForm` is internal, and adds only the author's details and a
  message), is the media entity type's form for the operation
  `paragraphs_blokkli_upload` (`MediaUploadHooks`, `hook_entity_type_build()`).
  `init()` sets the `media_library` form display (`ContentEntityForm::init()`
  takes the operation as the form mode), and `form()` hides the revision log as
  the media library does. Its form ID is
  `media_<type>_paragraphs_blokkli_upload_form`, its base form ID `media_form`:
  hooks for `media_form` and `hook_form_alter()` apply, hooks for another form
  ID (`media_image_edit_form`) don't.
- `MediaUploadFormBuilder` (service
  `paragraphs_blokkli.media_upload_form_builder`) creates an unsaved media with
  the temporary file in its source field and the file name as its name, as
  core's `AddFormBase` does: an empty name fails validation before
  `prepareSave()` would fill it in. `describe()` builds the form without input,
  so `#process` and `#after_build` callbacks and alter hooks run (the image
  widget adds its alt and title only with a file). Without a file (step 5), the
  fields that come with the file are missing.
- **Describing** (`src/Form/FormDescription.php`): each shown element (`#access`
  and not `#disabled`) becomes a config input: `textfield` → `Text`, `textarea`
  → `Text` (multiline), `checkbox` → `Checkbox`, `select` (one value) and
  `radios` → `Options`. The name is the element's HTML name
  (`field_media_image[0][alt]`). Labels, descriptions and messages become plain
  text, in the page's language. Other input elements and formatted texts keep
  their default values; of a file element, the children are described (alt text,
  title, description). `complete` is FALSE when a shown required element that
  isn't described is empty (the source field's file comes from the upload), or
  when the form has no submit button.
- **Submitting:** `submit()` submits the values through the same form
  (`FormBuilder::submitForm()`) with the Save button's value, as a browser does,
  so the button's submit handlers run (hooks add theirs there) and the form's
  `save()` saves the media. `#required`, `#element_validate`, hooks' validators
  and the entity's constraints run. The values also carry the file elements'
  file IDs, which a browser sends in a hidden field. Elements the user can't see
  keep their default values (`setProgrammedBypassAccessCheck(FALSE)`), so a
  field a hook hides and requires doesn't fail. An error belongs to the input of
  its element or of an element below it (a field's violations are set on the
  widget); an error of an element that isn't described (the file) has no input.
  The messages the submission adds, such as the errors, are removed: the user
  would see them on their next page in Drupal.
- The GraphQL query
  `pbGetUploadForm(type: ParagraphsBlokkliUploadType!, fileId: String!)` returns
  `ParagraphsBlokkliUploadForm { inputs, complete }` for one of the user's
  temporary files, with the upload route's access (the edit permission and the
  media type's create access). It's never cached. The existing
  `ParagraphsBlokkliConfigInput` types are unchanged.
- Kernel tests: `MediaUploadFormTest`, with the test module
  `paragraphs_blokkli_upload_test`, which alters media forms as a site might
  (hides and requires a field, disables one, requires one and validates it): the
  mapping, incomplete forms, values saved, errors at their inputs, no messages
  left. `UploadFormDataProducerTest`: someone else's or a permanent file
  refused, no access refused. `TemporaryDirectoryTrait` gives each test its own
  `temporary://`.
- On the dev site, the query (through the GraphQL server, as an editor)
  describes the image type's form as complete, with the credit and the alt text;
  the name is hidden in its `media_library` form display until step 9.

### 4. Drupal: creating the media (done)

- The GraphQL mutation `pbCreateMediaFromUploads(langcode, items)`, not an edit
  state mutation: media is shared between pages and saved straight away. An item
  (`ParagraphsBlokkliUploadMediaInput`) is `{ type, fileId, values }`, `values`
  keyed by the inputs' names (`MapData`), so a drop can mix images and files. It
  returns `ParagraphsBlokkliUploadMediaResult { mediaId, errors }` per item, in
  the same order (errors as `{ name, message }`), or null for a language the
  site doesn't have.
- Checks per item, shared with the query (`UploadProducerBase`): the edit
  permission and the media type's create access ("You can't create media of this
  type."), and a temporary file of the user ("The file is no longer available.
  Upload it again.": cron deletes temporary files after six hours).
- Per item, `MediaUploadFormBuilder::submit()` with the language being edited:
  the media is created in it. It first checks the file again
  (`MediaUploader::checkFile()`: the MIME type and the validators, as at the
  upload). The field's allowed extensions may have changed since, and the form's
  own check (`FileValidation`) fails in core's `ImageWidget::errorElement()`
  (since
  [drupal#3508822](https://www.drupal.org/project/drupal/issues/3508822)). Core
  11.4 checks the size limit only for new files, so a changed limit doesn't
  apply.
- `MediaUploadForm::save()` moves the file to the field's directory
  (`MediaUploader::moveFile()`, keeping its name), sets the moved file on the
  media (its thumbnail and metadata read it), then saves: an invalid item moves
  nothing. The save makes the file permanent; if it fails, the moved file stays
  temporary and cron deletes it.
- An item whose save fails with an exception gets "The media couldn't be
  created.", and the exception is logged; the other items are still created. The
  messages of the submission are removed even then.
- The builder builds and submits the form in its own render context. Replacing
  the upload directory's tokens (core's default is
  `[date:custom:Y]-[date:custom:m]`) rendered max-age 0 into the GraphQL
  controller's context, which a cacheable response refuses with a
  `LogicException`. This fixes step 3's query too. The dev site's image
  directory has no tokens (`media/images`), so it didn't show there.
- `MediaUploader`'s own messages ("The extension is not allowed.") are
  translatable.
- Kernel tests: `MediaUploadFormTest` (the file moved and permanent, the
  thumbnail is the moved file, a file the field no longer allows, nothing
  rendered into the caller's render context, a failing save) and
  `CreateMediaFromUploadsTest` (the media's language, errors per item, an item
  without values, a failing item, refused items, an unknown language).
  `UploadTestTrait` creates the uploads.

### 5. Drupal: the clipboard config and the token (done)

- `ParagraphsBlokkliSupportedClipboardImage` and `…File` have `canUpload`: the
  user has the upload route's access (the edit permission and the media type's
  create access), and the media's form, built without a file (the upload isn't
  known yet), is complete.
- Its cache metadata: the access result's (`user.permissions`),
  `entity_field_info` (a change of a field or of the media type clears the field
  definitions) and the form displays' list tag (a display created for the form
  mode doesn't invalidate its own tag). A form hook that depends on anything
  else isn't accounted for. `fileExtensions` and `maxFileSize` weren't
  invalidated before; they are now.
- The mutation `pbUploadToken` returns the token for the upload route's
  `X-CSRF-Token` header (`/session/token`'s), or null without the edit
  permission. A mutation, like `paragraphsBlokkliAgentToken`: the GraphQL
  results cache never caches mutations, and the token is per session. The
  adapter requests it when a dialog opens.
- Kernel tests: `SupportedClipboardsDataProducerTest` (`canUpload` with and
  without access, an incomplete form, the entry invalidated by a changed media
  type, a changed source field and a display created for the form mode) and
  `UploadTokenDataProducerTest` (the token passes the header's check; none for a
  reviewer).
- `build/drupal-schema.graphql` has steps 3 to 5.
- On the dev site, through a real session (Anna Keller, logged in with a
  one-time link, curl): `canUpload` for images and files, the token, the upload
  without it (403, "missing"), with a wrong one (403, "invalid") and with it
  (the file's ID), the form, and the media created, its file permanent in
  `public://media/images`. Deleted afterwards, with the session.

### 6. blökkli: drops of several file types (done)

- `clipboardMapBundle`'s file events have an optional `fileName`; `fileSize` is
  0 while a file is dragged. The paste, the native drop and its `execute` build
  the events from the `File` (`buildFileMapEvent`).
- The Drupal adapter checks `maxFileSize` and `fileExtensions` as Drupal does
  (`isFileAccepted`: the end of the name, ignoring case; no extensions or a
  maximum of 0 allow any), and skips a check when the name or size is unknown
  (during `dragenter`, the browser gives neither). Both paths profit: a file
  Drupal would refuse is refused before it's sent, with a message that names it
  ("The type or size of "@name" is not supported.", replacing "This file type is
  not supported."; translated for `de` and `gsw_CH`, which had the old one). A
  refusal at the drop, where a real drag first gives the size, was silent.
- The native drag maps every file (`buildMapBundleEvents`), not only the last
  one. On the base64 path, a drag of files without a bundle in common doesn't
  start (an image and a PDF in the sandbox: `image` and `link`); its drop falls
  back to the paste's handling, which says so.
- Several files count as several blocks for the field's cardinality: the native
  drop item's `blockCount`, summed by `getDraggingBlockCount()` in the dragging
  overlay.
- Drop targets per group: the native drop item's optional `itemBundleGroups`;
  for new items, a field lights up when every group has a bundle it allows and
  the user may add (`determineCanAddChildren()`, `getDraggingBundleGroups()`).
  One group behaves as today. Nothing sets the groups yet.
- Moved to step 7, which defines the upload path through its adapter methods:
  the grouping per file type, and the paste keeping the `File` objects. Without
  the dialog, a drop on the upload path would have nothing to do.
- Unit tests (Vitest): `isFileAccepted`, `determineCanAddChildren` with groups
  and counts, the two dragging helpers, `buildMapBundleEvents` and
  `buildFileMapEvent`. E2E (`test/e2e-drupal/features/clipboard/files.test.ts`):
  a pasted image too large or of a refused format, refused by its name; pasted
  and dragged-in images adding a block each; an image too large at the drop; an
  image and a PDF dragged in starting no drag. The overlay passing the count and
  the groups isn't covered: the E2E tests don't drive its drop targets.

### 7. blökkli: the upload path and its dialog (done)

- Four optional adapter methods in the clipboard feature's types: `uploadFile`
  (a temporary upload or an existing media), `getUploadForm`,
  `createMediaFromUploads` (per item a media or errors) and
  `addBlocksFromUploads`, whose items carry their upload type: the Drupal
  adapter needs it for the media type.
- With all four (`canUploadFiles()`), files take the upload path; without, the
  base64 path (the mock playground), which keeps the intersection.
- The upload path groups the bundles per file type (`groupFileBundles()`): the
  paste and the native drag set `itemBundleGroups`. The native drop's
  `resolveBundles` narrows the groups to the bundles the field allows and the
  user may add (`narrowFileGroups()`), and returns one, so the dispatcher skips
  the bundle selector. `execute` opens the dialog and waits for it (a promise,
  as `showBundleSelector`'s), then adds the blocks with `addBlocksFromUploads`
  under the loading state.
- The paste keeps the `File` objects; the drag preview shows the images through
  object URLs, revoked with the next drag.
- The dialog (`UploadDialog`): a `DialogModal` with one `PanelSection` that
  lists the files, titled with their number, in rows divided by lines. A row: a
  160×120 preview (the image, or an icon with the extension), the name, size and
  a `StatusIcon` on one line, then a progress bar while it uploads, the error
  with "Try again" when it failed, the existing media's label for a duplicate,
  "Nothing to fill in" for a form without fields, or the form through
  `ConfigForm` (stacked), with the errors at their fields and the others below.
  A section to pick the block type per file type, only when a type has several
  (`FormRadioTabs`). New markup: the rows, the preview and the progress bar; the
  only new CSS is `ConfigForm`'s stacked layout.
- Its state (`UploadDialog/uploads.ts`): two uploads at a time, retry, abort (no
  upload starts after it, even when a form arrives late), the forms' default
  values, "Add" once every file is uploaded and its required fields are filled
  in, media created only for the files without, errors at their fields.
- `ConfigForm` shows errors at its fields (`errors`), and its inputs' ids are
  unique per form (`useId()`): the dialog shows forms with the same names. It
  can stack its fields (`stacked`), spaced as `FormItem`s are.
- No paste while a dialog is open. The drop element calls files of several types
  "File".
- New strings through `bun run texts`, translated for `de` and `gsw_CH`; `fr`
  and `it` lack the strings around them too.

### 8. The Drupal adapter (done)

- Drupal (`paragraphs_blokkli`): the image and file clipboard entries name their
  media type (`mediaBundle`): `pbAddEntityReferenceMultiple` needs each
  reference's, which the frontend doesn't know.
- The module's build: the image and file clipboard fragments get `canUpload` and
  `mediaBundle` when the schema has them; `features/uploads.graphql` (the form
  query, the media mutation, the token mutation) when it has all of them.
- The adapter registers the four methods when those operations and
  `pbAddEntityReferenceMultiple` are there; `clipboardMapBundle` then leaves out
  a type the user can't upload to (`canUpload`).
- `uploadFile`: `XMLHttpRequest` to `/paragraphs_blokkli/upload/{type}`, with
  the language prefix and `_format=json`, the name percent-encoded, the token
  requested with the first upload and again after a 403, the progress, aborted
  through the signal, and the route's `{ message }` as the error.
- `getUploadForm` (mapped with `mapPluginConfigInputs`),
  `createMediaFromUploads` in the language being edited, `addBlocksFromUploads`
  with the media type from the clipboard config.

### 9. Tests (done)

- Done with steps 6 to 8: the unit tests (the clipboard helpers, the drop
  targets, the dialog's state), `files.test.ts` (refused files named before
  uploading, the groups of an image and a PDF) and `upload.test.ts` (an image
  added with its alt text, its name with a character a header can't carry; an
  image and a PDF added as an image and a link, after the paragraph they were
  dropped after; "Cancel" adds nothing, and nothing is pasted while the dialog
  is open; no upload without the token).
- The sandbox: the image and document types' `media_library` form displays have
  `name`, so the dialog asks for it, prefilled with the file's name.
- The dialog: a "Remove" button on a failed row. A file Drupal refuses fails
  again on every retry and kept "Add" disabled; removed, it gets no block. With
  the last file removed, the dialog closes.
- `upload.test.ts`: the name is prefilled; Drupal's error shows at its field (a
  credit past the field's maximum length, set in the page: typed, the browser
  keeps it within), and the file is added once it's fixed; a file Drupal refuses
  (zeros) is removed, and the others are added.
- `files.test.ts`: a translator, who may not create media, can't paste images
  (on a page of their own, which they edit). It covers `canUpload` in
  `clipboardMapBundle`.
- Unit tests: a removed file is left out; without files, nothing can be added.

### 10. Docs and skills (done)

- `docs/modules/drupal/configuration.md`: "Uploads" (the media types and their
  mappings, access, the route, the limits, temporary files, the language,
  duplicates, the `media_library` form mode and the widgets it shows, the form's
  hooks, `#states`), the media type for files in the settings, uploads in
  "Feature Detection", the media create access next to the permissions.
  `faq.md`: refused files. `getting-started.md`: the media types.
- The clipboard feature's `docs.md`, rewritten (it described a sidebar that no
  longer exists): new blocks, files, the upload dialog. The adapter docs:
  `uploadFile`, `getUploadForm`, `createMediaFromUploads`,
  `addBlocksFromUploads`, and `clipboardMapBundle` with the file's name, the
  drag and refusals.
- `skills/blokkli-setup-drupal`: the body size limits, the `media_library` form
  display decides the dialog's fields (a visible required field it can't show
  means no uploads of the type), the media create access.
- The `sandbox` skill needs nothing: the form displays are ordinary config, and
  the upload quota (`UploadQuotaSubscriber`, on file validation) covers the
  route.
- The module: an upload next to a file of the same name keeps its name, only its
  URI gets the suffix ("image_0.png"), so the media's default name is the file's
  (`MediaUploader::storeFile()`, `UploadControllerTest::testSameName()`).

### 11. Focal points (done)

The user's idea (2026-10-10): set an image's focal point in the dialog.

- **Drupal:** the Focal Point module's widget (`image_focal_point`) adds a text
  field, "x,y" in whole percent, which it validates
  (`FocalPointImageWidget::validateFocalPoint`) and saves as a crop of the
  media's file after the save. `FormDescription` describes that text field as a
  `FocalPointInput` (type `focal_point`), GraphQL
  `ParagraphsBlokkliConfigInputFocalPoint`; its value is submitted as any other,
  and the crop belongs to the moved file. `drupal/focal_point` is a dev
  dependency of the module. Kernel tests (`MediaUploadFocalPointTest`):
  described with the widget's default, saved as the moved file's crop, the
  default without a value, an invalid value refused at its input.
- **The sandbox:** `drupal/focal_point` (and `crop`); the image media's
  `default` and `media_library` form displays use its widget.
  `blokkli_playground`: `FieldItemTypeImage.focalPoint` reads the file's crop,
  in percent (cached with `crop_list`); `Media/Image` crops around it
  (`object-position`).
- **blökkli:** `PluginConfigInputFocalPoint` (`focalPoint`), which
  `PluginConfigForm` leaves out. The Drupal module's build adds it to the input
  fragment when the schema has the type, so the fragment is built in `index.ts`
  now. The dialog shows it on the image's preview once the form has one, until
  the media is created (`UploadDialog/FocalPoint`): a click or a drag sets it,
  the arrow keys move it by one percent (ten with Shift), with "Click the image
  to set its focal point." below. The image keeps the previews' size; the point
  is placed on the image, not on the space around it. Its errors are shown with
  the form's other messages. The dialog's focus trap includes elements with a
  `tabindex` (`useFocusTrap`): it only cycled through form elements.
- Tests: unit tests (`focalPoint.spec.ts`; the error in `uploads.spec.ts`), and
  `upload.test.ts`: set by a click and a key, and saved with the media (the
  block's `focalPoint`).
- Docs: `configuration.md` ("Uploads"), `getUploadForm.md`, the feature's
  `docs.md`, the setup skill and the sandbox skill.

### 12. The follow-ups (done)

Discussed with the user on 2026-10-11, who picked these four.

- **Shared code:** the dialog is `components/UploadDialog`, no longer the
  clipboard feature's. It uploads files and creates their media; what happens
  with the media is its caller's. The block types' choice is the clipboard
  feature's (`UploadBundles`, in the dialog's slot). The upload types
  (`types/uploads.ts`, without "Clipboard" in their names) and `uploadFile`,
  `getUploadForm` and `createMediaFromUploads` are the core adapter's, with
  `getUploadMediaBundle`: the bundle of the media a file becomes, if it can be
  uploaded, as far as the file is known (only its upload type when asking
  whether such files can be uploaded at all). `addBlocksFromUploads` stays the
  clipboard feature's. The dialog's strings and test hooks are `upload…`.
- **The media library's upload button**, next to its view toggle, if images or
  files can be uploaded (`Library/Upload`): a file picker (images only, unless
  files can be uploaded too), a refused file named in a message, the dialog,
  then the library loaded again on its first page.
- **Drupal:** the adapter registers the upload methods for the clipboard or the
  media library; `getUploadMediaBundle` is the clipboard entry's `mediaBundle`,
  with `canUpload` and the file checks. `entity_query_media_library` sorts by
  the newest (`created`, then the ID): it had no sort, so a new media was on the
  last page, and the pages' order was the database's. Kernel test:
  `EntityQueryMediaLibraryTest`. The Search API plugin still has no sort.
- **A file dropped on a block's media replaces it:** a drag of one file (pasted
  or from the operating system, on the upload path) gets the media library's
  "Replace" drop areas (`getReplaceMediaTargets`, shared by both features), for
  the fields that allow the file's media bundle. The drop opens the dialog for
  the one file, titled as the drop area, then calls `mediaLibraryReplaceMedia`
  or `mediaLibraryReplaceEntityMedia`. The native drag item carries what's known
  of its files (`uploads`): only their types until they're dropped, so the file
  is checked again at the drop.
- **"Apply to all"** next to a field's input, when another file whose media
  isn't created has the field (same name and type): it sets the field's value
  for those files. It's hidden while the field is empty, keeping its place, so
  the inputs keep their width. `ConfigForm` has an `action` slot per field.
- **Removed:** the `clipboard` drop handler, its drag item type and the
  `drop:clipboardItem` event, left over from the clipboard sidebar.
- **Fixed on the way:** `:class="{ invisible: … }"` isn't mangled (an unquoted
  key), so the focal point's box showed before its image was measured.
- Tests: unit (`uploads.spec.ts`: the fields files share; the upload helpers),
  E2E (`clipboard/upload.test.ts`: a value applied to the other file, an image
  replacing a block's, no drop area for a document;
  `media-library/upload.test.ts`: a refused file, picked files listed first;
  `clipboard/files.test.ts`: no button without create access).
  `support/uploads.ts` has the files and the dialog's helpers.

### 13. Simple states (done)

The user's case (see "Form hooks"): a field shown while a checkbox is unticked.

- **Drupal:** `FormDescription` describes an element's `#states` (its own and
  those of the elements containing it) as conditions on another input:
  `visibleIf` and `requiredIf`, from `visible` and `required` (and `invisible`
  and `optional`, for a checkbox). A condition is one other described input,
  selected by its name (`:input[name="…"]`, `input[…]`, `select[…]`,
  `[name=…]`): a checkbox `checked` or `unchecked`, or a select or radios with a
  `value`. Anything else (several conditions, another selector or trigger, an
  input that isn't described) is left out, as before. An element that's required
  anyway gets no `requiredIf`. GraphQL: `ParagraphsBlokkliConfigInputCondition`
  (`name`, `checked`, `value`), on every config input. The form's validation is
  unchanged.
- **blökkli:** `PluginConfigInputCondition` (`name`, `value`: a boolean or a
  string) as an input's `visibleIf` and `requiredIf`. `ConfigForm` leaves out an
  input whose condition doesn't hold (unless it has an error to show) and marks
  one required while its condition holds; the dialog needs no value for an input
  that isn't shown (`isInputVisible`, `isInputRequired`). A hidden input's value
  is still sent, as a browser sends it. The Drupal module's build adds the
  conditions to the input fragment when the schema has the type.
- Tests: unit (`FormDescriptionStatesTest`, the states that become conditions;
  the two helpers; `uploads.spec.ts`), kernel
  (`MediaUploadFormTest::testStates`, with the test module's hook), E2E
  (`upload.test.ts`).
- **The sandbox:** every site's media forms have a checkbox "Licensed", and a
  licence shown and required while it's ticked (`blokkli_playground`'s
  `MediaFormHooks`), so that the states can always be tried (the user,
  2026-10-11). Neither is a field, so neither is saved; the checkbox says so.
- Docs: `configuration.md` ("Uploads"), `getUploadForm.md`, the setup skill, and
  the sandbox skill.

### 14. Duplicates (done)

The search for a media with a file of the same content had two faults since its
first version in 2024, found on 2026-10-11 and reproduced with tests. The dialog
added a third.

- **A wrong media.** The search read the file's usages without their entity
  type: a file that only a node used gave the media with the node's ID.
- **Only the first file.** A first file without a media of the type (a deleted
  media's file, or another media type's) ended the search, so every later upload
  of that content became a new media.
- **Identical files in one dialog** became two media: neither exists yet when
  the other is uploaded. The old mutations ran one after the other.

What changed, all in Drupal:

- `MediaUploader::findDuplicate()` no longer reads file usages. It collects
  every file of the content (every row of the rokka module's metadata with the
  binary hash, or every permanent file with the filehash), and queries the media
  of the type whose source field has one of them: the oldest first, and only
  published ones, since a block with an unpublished media shows nothing (the
  user, 2026-10-11). It returns the first one the current user can view. So the
  old mutations check the view access too, and a media that has the file in
  another field than its source field isn't a duplicate.
- `CreateMediaFromUploads` searches again before an item's form is submitted.
  The items are created in order, so the second of two identical files gets the
  first one's media. Its file is deleted, and its values are left out, without a
  message. This also covers a media created since the upload. The schema is
  unchanged but for the description of `mediaId`; the frontend is unchanged.
- `drupal/rokka` is a dev dependency of the module. The search only reads the
  rokka module's metadata, which a kernel test creates itself: nothing reaches
  Rokka.
- Kernel tests: `MediaUploaderDuplicateTest` (filehash: another entity's file, a
  later file, an unpublished media, one the user can't view),
  `MediaUploaderRokkaDuplicateTest` (with the rokka module: found, and a later
  file), `CreateMediaFromUploadsTest::testDuplicate`.
- **The sandbox has `filehash`** (SHA-256, its own `dedupe` off), so duplicates
  can be tried and tested (the user, 2026-10-11). It's enabled on the dev site;
  the templates that `ddev reset` and new sandboxes copy get it with the next
  bake, and E2E's template bakes itself.
- E2E (`clipboard/upload.test.ts`): a file that a media already has, and two
  identical files in one dialog. `support/uploads.ts` builds images of random
  colours, and identical ones for the same `color`. The dialog's duplicate row
  has a test hook (`upload-duplicate`).
- Not covered: an upload to Rokka itself has never been run here.
- Docs: `configuration.md` ("Uploads"), and the sandbox skill.

### 15. Uploads stored at their field, and a generated alt text (done)

The user's idea (2026-10-11): a button next to an image's alt text that
generates it. Rokka can only describe an image it has, so an upload now goes to
where its field stores files straight away, as in core's media form and media
library. This replaced the decision that an upload stays in `temporary://` until
"Add".

What the code says, checked on 2026-10-11:

- Core's image widget stores an upload at the field's location at once, as a
  temporary file. The media library moves it there before its fields are shown.
  The save makes it permanent; cron deletes an abandoned one after six hours.
- The rokka module (3.0.15) has two settings. "Manual": a button in the media
  form and the media library asks Rokka to describe the image it has, in the
  current language (`RokkaService::addAutoDescription()`). "Auto": every upload
  to Rokka asks for descriptions in all the site's languages
  (`RokkaStreamWrapper::stream_flush()`, which wants the setting to be a real
  `TRUE`), and the forms prefill the alt text. Its form hooks name core's form
  IDs and expect a `MediaForm`, so they don't run on `MediaUploadForm`.
- Reading a `rokka://` file downloads it from Rokka. Its size, dimensions and
  validity come from the module's metadata without a request (it replaces the
  image factory). Deleting it deletes the image on Rokka, unless another file of
  the site has the same hash.
- Core's upload handler validates a file before it moves it, so a refused file
  never reaches the field's location.

**Storing** (Drupal)

- The upload route stores the file at the source field's upload location, as a
  temporary file of the user (`MediaUploader::storeFile()`'s default). The body
  is still written to `temporary://` first, where the duplicate search and the
  checks run: a duplicate or a refused file goes no further.
- For every field, not only those on Rokka (my choice, which the user didn't
  overrule): one path, which the sandbox's tests run. The price: a cancelled
  upload of a public field is in the public directory until it's deleted.
- `MediaUploadForm::save()` no longer moves the file;
  `MediaUploader::moveFile()` and the uploader's file repository are gone. "Add"
  sends nothing to Rokka.
- Two reads of a stored file are gone, since each would download it from Rokka.
  The duplicate search before an item's form is submitted
  (`findDuplicateOfFile()`) takes the hash that the rokka module or filehash
  stored with the file. `checkFile()` no longer checks the content's MIME type:
  it was checked when the file was stored, and the validators still check the
  name's extension and the size against the field's settings as they are now.
- **A cancelled upload is deleted.** The mutation `pbDeleteUploads(fileIds)`
  returns the number of deleted files. It needs the edit permission, and only
  deletes temporary files of the current user, as core lets a user remove their
  own unsaved upload; a permanent file (a media's) and someone else's stay.
- Anonymous users are refused by all the upload producers
  (`UploadProducerBase::loadFile()`): they share one user ID. The user asked
  whether the mutation lets anyone delete any file (2026-10-11); this was the
  one case where a file of someone else could have been reached. Still wider
  than needed: a user's own temporary files from elsewhere, such as an unsaved
  upload in a Drupal form. Closing that needs a marker per upload (offered, not
  built).
- A consequence: core lets a user reference a file in a public directory only
  with `access content`, so an upload to a public field needs it, as in core's
  media form. Without it, the form's validation fails on the file. The kernel
  tests' users have it now.

**The alt text** (Drupal)

- A generator is a service tagged `paragraphs_blokkli.alt_text_generator`
  (`AltText\AltTextGeneratorInterface`: `applies()` to a source field,
  `generate()` on request, `getDefault()` for an alt text the image has
  already). `AltText\AltTextGenerators` collects them; the one with the highest
  priority that applies is used.
- `RokkaAltTextGenerator` follows the rokka module's settings. With "manual", it
  applies to an image field on Rokka, and returns the description the metadata
  already has for the language, or asks Rokka for it. With "auto", the
  description of the upload is the form's default (prefilled, as in Drupal's
  forms; the user didn't overrule it). A failed request is logged, and there's
  no alt text.
- `ParagraphsBlokkliUploadForm.altTextInput`: the name of the image's alt text
  input (`<source field>[0][alt]`), if a generator applies and the form has it.
  The mutation `pbGenerateUploadAltText(type, fileId, langcode)` returns the
  text, or null, with the form's access. A mutation: never cached, and it may
  cost.
- A default alt text only reaches the media if it's submitted, as the dialog
  does with every field's value: an item without values has none.

**blökkli**

- `UploadForm.altTextInput`, and two optional adapter methods: `deleteUploads`
  and `generateUploadAltText`.
- The dialog's state (`uploads.ts`): `abort()` deletes the uploads without a
  media, once (it's called when the dialog is cancelled and again when it
  closes); so do removing a file and uploading one again. Not waited for, and
  errors are ignored. `generateAltText()` sets the field's value.
- The dialog shows "Generate" in the alt text's action slot, before "Apply to
  all": the `stars` icon, a spinner while it waits. The text replaces the
  field's value; no text or an error is a message ("No alt text could be
  generated."). The action slot's buttons have a gap.
- The Drupal module: the form's fragment is built in `index.ts` (with
  `altTextInput` if the schema has it), and the two mutations are documents of
  their own, added if the schema has them. The adapter registers the methods
  accordingly.
- **The sandbox** has a generator that returns a placeholder which says what it
  is (`blokkli_playground`'s `PlaceholderAltTextGenerator`, priority -100), so
  that the button can always be tried and tested, as with the "Licensed"
  checkbox (the user didn't overrule it).

**Tests**

- Kernel: `UploadControllerTest` (the field's directory, nothing there for a
  refused file or a duplicate), `MediaUploadFormTest` (the file stays and is
  permanent, the alt text's input and default), `MediaUploaderDuplicateTest` and
  `MediaUploaderRokkaDuplicateTest` (a stored file isn't read),
  `RokkaAltTextGeneratorTest` (the rokka module's request replaced; nothing
  reaches Rokka), `DeleteUploadsTest`, `GenerateUploadAltTextTest`. The test
  module has a generator that a test turns on.
- Unit (`uploads.spec.ts`): what's deleted and when, generating.
- E2E (`clipboard/upload.test.ts`): a cancelled dialog's upload is deleted
  (Drupal answers 1), and an image's alt text is generated and saved.

**The round on Rokka** (2026-10-11, a throwaway sandbox with the user's test
organisation; the recipe is in the sandbox skill)

- An upload is stored on Rokka as a temporary file (0.34 s for a small image),
  with its dimensions from the metadata.
- Deleting it removes the file, the metadata and the image on Rokka.
- "Add" creates the media in 0.28 s, without another upload; the file is
  permanent at the same URI. The focal point is set on Rokka: its hash changes,
  as the rokka module does with every crop.
- The same content again is a duplicate (0.02 s, nothing sent to Rokka).
- Two identical files in one dialog become one media. The second file's metadata
  row stays behind, without a file: the first media's focal point replaced the
  image they shared, so Rokka had nothing left to delete for the second. It does
  no harm (a row without a file isn't a duplicate, and a new file of that name
  gets a suffix). The rokka module's own forms leave the same when two files
  share an image and one gets a crop.
- **Not seen: a generated description.** Rokka answers the request with 403,
  "You need to be a paying customer to use this call." The request is the right
  one (the image's hash, the language), the failure ends as "no alt text", and
  with "auto" the upload still works, without descriptions. A description's
  text, and the prefilled alt text, are only covered by the kernel tests.
- Nothing of the round is left in the organisation.

**Risks that remain**

- Environments that share a Rokka organisation: deleting a cancelled upload
  deletes its image on Rokka when no other file of this site has it, even if
  another environment does. Removing an item in core's media library does the
  same, but uploads are cancelled more often.
- With the "auto" setting, a cancelled upload has still asked Rokka for its
  descriptions, as in Drupal's forms.

Docs: `configuration.md` ("Uploads"), the adapter docs (`deleteUploads`,
`generateUploadAltText`, `getUploadForm`, `uploadFile`), the feature's
`docs.md`, the setup skill and the sandbox skill.

## Later

- Setting the focal point of an existing image, such as a block's (waiting: it
  belongs to the file, so it changes every page using the image, outside the
  edit state; better as "edit this media" with the same descriptions).
- Alt texts from the agent's model, for any backend: another generator (step
  15). And generating the alt texts of all of a dialog's images at once.
- Adding a dropped file to a multi-value media field ("Add to …", as media
  library items can).
- Dropping files onto the media library, besides its upload button.
- Sorting the Search API media library by the newest.
- Rendering a node's fields with the same descriptions, saved through
  `update_host_entity_field_value`.
- More widgets: multi-value options first, then formatted text and entity
  references.

Dropped: starting the uploads while the user places the files. A drag from the
operating system gives the browser no file contents until the drop.
