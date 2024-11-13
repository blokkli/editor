# Changelog


## v1.1.0

[compare changes](https://github.com/blokkli/editor/compare/v1.0.4...v1.1.0)

### 🚀 Enhancements

- Option to close editor after publish ([#36](https://github.com/blokkli/editor/pull/36))
- Built-in options for block visibility (global, per language) ([#37](https://github.com/blokkli/editor/pull/37))
- Proxy Mode ([#38](https://github.com/blokkli/editor/pull/38))
- Artboard, new 'overview' view, improved drop targets ([#40](https://github.com/blokkli/editor/pull/40))
- Fallback selection for blocks with height/width of 0 ([#39](https://github.com/blokkli/editor/pull/39))
- Use "nullish" option values when multiple blocks selected ([c665390](https://github.com/blokkli/editor/commit/c665390))

### 🩹 Fixes

- Drop target size/style ([18881c4](https://github.com/blokkli/editor/commit/18881c4))
- Apply correct drop alignment class ([6f12ee8](https://github.com/blokkli/editor/commit/6f12ee8))
- Restore artboard styles ([5eebaaf](https://github.com/blokkli/editor/commit/5eebaaf))
- Explicitly pass route.path when starting blökkli ([6c870e7](https://github.com/blokkli/editor/commit/6c870e7))
- Ignore droppable/editable fields when rendered inside proxy field ([87e99b7](https://github.com/blokkli/editor/commit/87e99b7))
- Properly check type of argument ([f71e469](https://github.com/blokkli/editor/commit/f71e469))
- Registering blocks rendered in a proxy field ([f74f5a4](https://github.com/blokkli/editor/commit/f74f5a4))
- Remove duplicate classes ([b79c2b9](https://github.com/blokkli/editor/commit/b79c2b9))
- Don't catch error when field can't be found ([640eb65](https://github.com/blokkli/editor/commit/640eb65))
- Unified min size for drop targets ([4076000](https://github.com/blokkli/editor/commit/4076000))
- Set correct checkbox false value when updating option ([f95ed47](https://github.com/blokkli/editor/commit/f95ed47))
- Properly check if there was a diff when updating options ([95fae34](https://github.com/blokkli/editor/commit/95fae34))
- Properly prevent overlapping drop targets ([ae4a748](https://github.com/blokkli/editor/commit/ae4a748))

### 🏡 Chore

- Update module types ([2b6c95e](https://github.com/blokkli/editor/commit/2b6c95e))
- Add bkHiddenGlobally to docs ([4ee9ba0](https://github.com/blokkli/editor/commit/4ee9ba0))

### ❤️ Contributors

- Jan Hug ([@dulnan](http://github.com/dulnan))

## v1.0.0


### 🚀 Enhancements

- Initial stable release


### ❤️ Contributors

- Jan Hug <me@dulnan.net>
