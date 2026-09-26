# 04: Base content model

- **Status:** done (2026-09-26)
- **Milestone:** M1 Local dev site
- **Depends on:** 03

## Goal

The plain content paragraphs every demo needs, each with the minimum of fields,
and a `page` with a hero image and a lead. Drupal supports everything the editor
needs for them: adding, inline editing, the media library, dropping media and
pasting text, images, files and video URLs.

Until 2026-09-26 this chunk was "Content model and features", with bundles that
mirror the mock playground. The features moved to
[chunk 13](13-editor-features.md), the demo content to
[chunk 14](14-demo-content.md).

## Tasks

- [x] **Media types** image, remote video (YouTube, Vimeo) and document, from
      core's recipes, translatable (the image's alt text per language).
- [x] **Paragraph types:**

  | bundle   | fields                                                                                       | translation                  |
  | -------- | -------------------------------------------------------------------------------------------- | ---------------------------- |
  | `title`  | `field_title` (string, optional)                                                             | on                           |
  | `text`   | `field_text` (text_long, `basic_html`)                                                       | on                           |
  | `image`  | `field_media` (media image, required)                                                        | off; the media is translated |
  | `video`  | `field_video` (media remote video, required)                                                 | off; the media is translated |
  | `button` | `field_link` (link, internal or external, no link title, required), `field_title` (optional) | on                           |

  All enable the `paragraphs_blokkli_data` behavior (blökkli options) and
  library conversion.

- [x] **Node `page`:** `field_lead` (string_long, translatable) and
      `field_hero_image` (media image, optional), in the form after the title.
- [x] **blökkli:** the preview image style `blokkli_preview`, the media bundles
      for pasting, entity mappings from each media type to a paragraph field,
      and the `media_library` search provider.
- [x] **GraphQL:** the `media` entity type, the new bundles and fields.

## Acceptance criteria

- `ddev drush si --existing-config -y` installs it, and `config:status` is
  clean.
- As admin, the editor's `pbConfig` query reports the clipboards, block types,
  editable and droppable fields, and the paste mutations and the media library
  work.

## Notes

### How it was built

The config came from the three recipes and a one-time script (in the gitignored
`tmp/`, not committed), then `ddev drush cex -y`:

1. `ddev drush recipe /var/www/html/drupal/web/core/recipes/<name>` for
   `image_media_type`, `remote_video_media_type` and `document_media_type`.
   - They also install `media_library`, `path` and `views`, and add
     `views.view.files`, `views.view.media_library`, the image styles `medium`
     and `media_library`, and `media_library.settings`.
   - Config that already exists is skipped, and they grant no permissions.
2. The script:
   - sets the media source fields' `file_directory`
   - enables content translation for the media types, with `translation_sync`
     (file only for the image, so the alt text is per language)
   - creates the paragraph types, fields and displays, and the node fields
   - sets `allowed_formats` on `field_text` and the target bundles of
     `field_paragraphs`
   - creates the image style, `paragraphs_blokkli.settings`, the mappings and
     the search provider
   - merges the GraphQL additions into the server's `schema_configuration`

### Findings

- **Plain file directories.** The recipes use `[date:custom:Y]-[date:custom:m]`,
  but blökkli's upload mutations don't replace tokens (F8). Files go to
  `media/images` and `media/documents`, as in the starterkit.
- **Pasting text needs `allowed_formats`** on the clipboard text field.
  `AddClipboardText` throws without one (F7). Chunk 03's `field_text` had none.
- **Required fields and adding blocks.** The `add` mutation validates the new
  paragraph but takes no field values (F7). So a block type with a required
  field can only be added through the Drupal form (`addBehaviour: 'form'`).
  - Hence `field_title` is optional: title blocks can be added with
    `editable:field_title`.
  - Image and video are added from the media library or through the form.
    Pasting and dropping don't validate.
- **The button text is its own field, and the link has no title.** blökkli sets
  a link title to the new paragraph's label ("Orphaned Button: …") when it links
  a dropped or pasted entity (F9). Both reference projects avoid this the same
  way.
- **Media library thumbnails** come from
  `paragraphs_blokkli.settings:image_style` (here `blokkli_preview`, 300×300).
  It also enables user images.
- **The media library lists only mapped media bundles.** A new media type needs
  a `pb_entity_mapping`.

### For chunk 06

- **`addBehaviour`:**
  - title: `editable:field_title`
  - text: `editable:field_text` (or the form)
  - image, video, button: the form (image and video usually come from the media
    library)
- **Document buttons link to the media edit page.** A pasted PDF becomes a
  button with `entity:media/ID`, which resolves to `/media/ID/edit` because
  `media.settings:standalone_url` is off.
  - The frontend needs the file URL: the graphql_core_schema `media` extension
    (`mediaFileUrl`).
  - `FieldItemTypeLink.resolvableUri` throws for these links ("The URI
    '/de/media/5/edit' is invalid"). Use `uri`.
- **Images:** enable the `image` extension (`derivative(style:)`) and add the
  frontend's image styles. The file and media metadata fields (`filename`,
  `filemime`, `thumbnail`, …) are not exposed yet either.
- **The URL alias widget** (`path`) is on the node form. Nuxt resolves aliases
  through the `routing` extension.

### Verification (2026-09-26)

- **Install:** `ddev drush si --existing-config -y` on an empty database.
  - `config:status` is clean.
  - The config schema check shows only the known gaps: `media_bundle_file` (F7)
    and the search provider's `weight` and `search_plugin_configuration` (F7).
- **Schema:**
  - The dump has `ParagraphTitle`, `ParagraphImage`, `ParagraphVideo`,
    `ParagraphButton`, `MediaImage`, `MediaRemoteVideo`, `MediaDocument`,
    `NodePage.fieldHeroImage` (`MediaImage`) and `NodePage.fieldLead`.
  - No `…Unexposed` types.
- **pbConfig** through `/de/graphql` as admin:
  - Clipboards: rich text → text, image → image, file → button, remote video
    (YouTube, Vimeo) → video.
  - `field_paragraphs` allows all seven block types.
  - Editable:
    - node `title` and `field_lead` (plain)
    - `field_title` on title and button (plain)
    - `field_text` (frame)
  - Droppable:
    - `field_hero_image`, `field_media` and `field_video` (media reference)
    - `field_link` (link, media document)
    - node `uid`
- **Mutations** on a throwaway page:
  - `add` created a title block without a form.
  - `add_image` put `media/images/pasted.png` in a media item.
  - `add_file` created a document and a button linking to it.
  - `add_video_remote` fetched the oEmbed data and thumbnail from YouTube.
  - `add_clipboard_text` stored the text as `basic_html` and stripped a
    `<script>`.
  - `pbMediaLibraryGetResults` listed all media with `blokkli_preview`
    thumbnails.
- **Forms,** as admin, all 200:
  - `/en/node/add/page` (lead, hero image with the media library, URL alias)
  - `/de/media/add/image`
  - the blökkli add form for image (media library widget) and button
  - the blökkli settings, entity mapping and search pages
- `ddev check-routes` (39 rows, new: `/media/oembed`) passes.
