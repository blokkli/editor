import type { EditorEntry } from '#blokkli/editor/composables/defineEditorComponent'
import banner from '#blokkli/editor/components/Banner/story'
import dropdown from '#blokkli/editor/components/Dropdown/story'
import infoBox from '#blokkli/editor/components/InfoBox/story'
import pagination from '#blokkli/editor/components/Pagination/story'
import tabs from '#blokkli/editor/components/Tabs/story'
import formCheckboxes from '#blokkli/editor/components/Form/Checkboxes/story'
import formDatepicker from '#blokkli/editor/components/Form/Datepicker/story'
import formGroup from '#blokkli/editor/components/Form/Group/story'
import formItem from '#blokkli/editor/components/Form/Item/story'
import formRadio from '#blokkli/editor/components/Form/Radio/story'
import formRadioBox from '#blokkli/editor/components/Form/RadioBox/story'
import formRadioTabs from '#blokkli/editor/components/Form/RadioTabs/story'
import formSearch from '#blokkli/editor/components/Form/Search/story'
import formSelect from '#blokkli/editor/components/Form/Select/story'
import formText from '#blokkli/editor/components/Form/Text/story'
import formTextarea from '#blokkli/editor/components/Form/Textarea/story'
import formToggle from '#blokkli/editor/components/Form/Toggle/story'
import panelAction from '#blokkli/editor/components/Panel/Action/story'
import panelDetails from '#blokkli/editor/components/Panel/Details/story'
import panelItem from '#blokkli/editor/components/Panel/Item/story'
import panelSection from '#blokkli/editor/components/Panel/Section/story'
import cssButton from './snippets/button'
import cssPill from './snippets/pill'
import cssShortcut from './snippets/shortcut'
import examplePanel from './examples/Panel'

/**
 * Manual registry of styleguide entries.
 *
 * TODO: replace with a build-time collector that scans for `story.ts` files
 * next to components and `snippets/*.ts` here, generating this list
 * automatically.
 */
export const editorEntries: EditorEntry[] = [
  banner,
  dropdown,
  infoBox,
  pagination,
  tabs,
  formCheckboxes,
  formDatepicker,
  formGroup,
  formItem,
  formRadio,
  formRadioBox,
  formRadioTabs,
  formSearch,
  formSelect,
  formText,
  formTextarea,
  formToggle,
  panelAction,
  panelDetails,
  panelItem,
  panelSection,
  examplePanel,
  cssButton,
  cssPill,
  cssShortcut,
]
