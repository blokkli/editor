# Minimal Adapter Example

Check out the
[playground-minimal folder](https://github.com/blokkli/editor/tree/main/playground-minimal)
for a minimal example of a blökkli adapter.

Keep in mind that it only implements the bare minimum of methods. For example,
it does not implement any history state (for undo/redo) and does not persist any
changes. It could serve as a starting point for your own implementation or
integration with a backend.

The only required methods that must be implemented are:

- [adapter.loadState]
- [adapter.mapState]
- [adapter.getAllBundles]
- [adapter.getFieldConfig]
- [adapter.addNewBlock]
- [adapter.moveBlock]
- [adapter.moveMultipleBlocks]

Without these the editor would be pretty useless, so they are required.
