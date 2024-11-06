import type { Block } from './Block'
import { BlockButton } from './Button'
import { BlockButtonList } from './ButtonList'
import { BlockCard } from './Card'
import { BlockFragment } from './Fragment'
import { BlockFromLibrary } from './FromLibrary'
import { BlockGrid } from './Grid'
import { BlockIcon } from './Icon'
import { BlockImage } from './Image'
import { BlockOnThisPage } from './OnThisPage'
import { BlockSlider } from './Slider'
import { BlockTable } from './Table'
import { BlockTeaser } from './Teaser'
import { BlockText } from './Text'
import { BlockTitle } from './Title'
import { BlockTwoColumns } from './TwoColumns'
import { BlockVideo } from './Video'
import { BlockWidget } from './Widget'

export const createBlock = (bundle: string, uuid: string): Block => {
  switch (bundle) {
    case 'text':
      return new BlockText(uuid)
    case 'title':
      return new BlockTitle(uuid)
    case 'grid':
      return new BlockGrid(uuid)
    case 'teaser':
      return new BlockTeaser(uuid)
    case 'two_columns':
      return new BlockTwoColumns(uuid)
    case 'slider':
      return new BlockSlider(uuid)
    case 'button':
      return new BlockButton(uuid)
    case 'card':
      return new BlockCard(uuid)
    case 'image':
      return new BlockImage(uuid)
    case 'from_library':
      return new BlockFromLibrary(uuid)
    case 'video':
      return new BlockVideo(uuid)
    case 'widget':
      return new BlockWidget(uuid)
    case 'table':
      return new BlockTable(uuid)
    case 'on_this_page':
      return new BlockOnThisPage(uuid)
    case 'blokkli_fragment':
      return new BlockFragment(uuid)
    case 'icon':
      return new BlockIcon(uuid)
    case 'button_list':
      return new BlockButtonList(uuid)
  }

  throw new Error('Invalid block bundle: ' + bundle)
}

export const getBlockBundles = (): Array<typeof Block> => {
  return [
    BlockText,
    BlockTitle,
    BlockGrid,
    BlockTeaser,
    BlockImage,
    BlockTwoColumns,
    BlockButton,
    BlockFragment,
    BlockCard,
    BlockVideo,
    BlockWidget,
    BlockTable,
    BlockFromLibrary,
    BlockOnThisPage,
    BlockIcon,
    BlockButtonList,
    BlockSlider,
  ]
}
