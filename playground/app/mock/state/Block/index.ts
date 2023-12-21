import type { Block } from './Block'
import { BlockButton } from './Button'
import { BlockCard } from './Card'
import { BlockFromLibrary } from './FromLibrary'
import { BlockGrid } from './Grid'
import { BlockHero } from './Hero'
import { BlockImage } from './Image'
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
    case 'button':
      return new BlockButton(uuid)
    case 'hero':
      return new BlockHero(uuid)
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
    BlockHero,
    BlockCard,
    BlockVideo,
    BlockWidget,
    BlockTable,
    BlockFromLibrary,
  ]
}
