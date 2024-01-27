## Overview

The `transform` feature implements a way to apply transform plugins to one or
more selected blocks.

The [getTransformPlugins()](/adapter/getTransformPlugins) method should return a
list of available transform plugins. The editor then lists the plugins that are
available for the selected blocks.

## Usage in editor

The matching transform plugins are displayed in the block actions overlay for
one or more selected blocks. Selecting a transform plugin calls the
[applyTransformPlugin()](/adapter/applyTransformPlugin) method on the adapter
once (e.g. not separately for every block).

In addition, when dragging a block over another block where a transform plugin
would be available, the editor shows a small overlay of the first matching
transform plugin. When the user presses the CTRL key and then drops the selected
block onto the matching block, the transform plugin is also applied.

## Examples

A transform plugin can do basically anything with the selection. Some ideas:

- Merge text of two or more text blocks
- Automatically translate the contents of a block to another language
- Extract parts of the block into new blocks, e.g. split every `<p>` into a
  separate text block
- Wrap all selected blocks into a new block (e.g. with 5 image blocks selected,
  adds a new gallery block containing the image blocks)

## Defining a transform plugin

Every transform plugin is required to define these properties:

### id: `string`

A unique ID of the transform plugin.

### label: `string`

The human readable label of the plugin which is shown in the dropdown in the
editor.

### bundles: `string[]`

Contains all block bundles for which the transform is available.

### targetBundles: `string[]`

The possible bundles that could result after the transform is applied.

For example, when writing a transform plugin that converts blocks of bundle
`image` into a gallery block, the value of targetBundles should be
`['gallery']`.

### min: `number`

The minimum number of blocks required. A transform plugin that merges text
blocks would set a minimum value of `2`. A plugin that translates text content
could define the min value as `1`.

### max: `number`

The maximum number of blocks supported by the plugin. A value of `-1` indicates
unlimited amount of blocks.
