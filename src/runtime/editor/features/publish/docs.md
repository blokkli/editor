## Menu button

The menu button opens the publish dialog. An adapter without
[getPublishOptions()](/adapter/getPublishOptions) has no dialog: the button
publishes right away.

## Languages

One edit state covers every language, so publishing saves its changes in all of
them. While each translation has a status of its own
([isStatusTranslatable](/editor/edit-state#translationstate-isstatustranslatable)),
the dialog's section "Languages" lists the page's translations with their
status, and the user ticks the ones to publish:

- The published ones are ticked and can't be unticked: publishing never
  unpublishes.
- The current language is ticked by default.
- Each row says what publishing does to its language.

With a shared status, the section has one row: "All languages".

A user who may not change the status of an unpublished translation
([canChangeStatus](/editor/edit-state#translationstate-translations)) can't tick
it, and a note says so. When nothing is published and the user may publish
nothing, only "Save" is left.

"Save" is disabled while a translation is published: saving would put the
changes live in it. The dialog also opens without pending changes while a
translation is unpublished, to publish it on its own.

## Schedule

The mode "Schedule" publishes the changes at a date, with the languages ticked
([scheduleEditState()](/adapter/scheduleEditState)).
