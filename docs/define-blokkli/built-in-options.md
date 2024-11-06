# Built-in Options

blökkli includes _global options_ that offer additional functionality beyond
what's possible using custom options.

## `bkVisibleLanguages` - Conditionally show a block per language

This option renders a dropdown with checkboxes to select for which languages a
block should be visible. If no languages are selected the block will be visible
for all languages. The behaviour changes once one or more languages are
selected:

- Within the editor the DOM element will be displayed translucent to indicate
  that the block won't be visible in the current language
- Outside the editor the entire block component will not render if it's not
  enabled for the current language

The option is implemented as a [checkboxes](/define-blokkli/options#checkboxes)
option. The data is therefore stored as a comma-separated string.

The available language options are determined at runtime based on the available
languages for the current page entity.

### Enabling the Option

You can enable the option like any global option:

```vue [~/components/Blocks/Card.vue]
<script lang="ts" setup>
const { options } = defineBlokkli({
  bundle: 'card',
  globalOptions: ['bkVisibleLanguages'],
})
</script>
```
