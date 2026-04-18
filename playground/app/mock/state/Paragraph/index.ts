import type { Paragraph } from './Paragraph'
import { ParagraphButton } from './Button'
import { ParagraphButtonList } from './ButtonList'
import { ParagraphCard } from './Card'
import { ParagraphChart } from './Chart'
import { ParagraphFragment } from './Fragment'
import { ParagraphFromLibrary } from './FromLibrary'
import { ParagraphGrid } from './Grid'
import { ParagraphIframe } from './Iframe'
import { ParagraphIcon } from './Icon'
import { ParagraphImage } from './Image'
import { ParagraphNotImplemented } from './NotImplemented'
import { ParagraphOnThisPage } from './OnThisPage'
import { ParagraphSlider } from './Slider'
import { ParagraphTable } from './Table'
import { ParagraphTeaser } from './Teaser'
import { ParagraphText } from './Text'
import { ParagraphTitle } from './Title'
import { ParagraphTwoColumns } from './TwoColumns'
import { ParagraphVideo } from './Video'
import { ParagraphGallery } from './Gallery'
import { ParagraphWidget } from './Widget'

export const createParagraph = (bundle: string, uuid: string): Paragraph => {
  switch (bundle) {
    case 'text':
      return new ParagraphText(uuid)
    case 'title':
      return new ParagraphTitle(uuid)
    case 'grid':
      return new ParagraphGrid(uuid)
    case 'teaser':
      return new ParagraphTeaser(uuid)
    case 'two_columns':
      return new ParagraphTwoColumns(uuid)
    case 'slider':
      return new ParagraphSlider(uuid)
    case 'button':
      return new ParagraphButton(uuid)
    case 'card':
      return new ParagraphCard(uuid)
    case 'chart':
      return new ParagraphChart(uuid)
    case 'image':
      return new ParagraphImage(uuid)
    case 'from_library':
      return new ParagraphFromLibrary(uuid)
    case 'video':
      return new ParagraphVideo(uuid)
    case 'widget':
      return new ParagraphWidget(uuid)
    case 'table':
      return new ParagraphTable(uuid)
    case 'on_this_page':
      return new ParagraphOnThisPage(uuid)
    case 'blokkli_fragment':
      return new ParagraphFragment(uuid)
    case 'iframe':
      return new ParagraphIframe(uuid)
    case 'icon':
      return new ParagraphIcon(uuid)
    case 'button_list':
      return new ParagraphButtonList(uuid)
    case 'gallery':
      return new ParagraphGallery(uuid)
    case 'not_implemented':
      return new ParagraphNotImplemented(uuid)
  }

  throw new Error('Invalid paragraph bundle: ' + bundle)
}

export const getParagraphBundles = (): Array<typeof Paragraph> => {
  return [
    ParagraphText,
    ParagraphTitle,
    ParagraphGrid,
    ParagraphTeaser,
    ParagraphImage,
    ParagraphTwoColumns,
    ParagraphButton,
    ParagraphFragment,
    ParagraphCard,
    ParagraphChart,
    ParagraphVideo,
    ParagraphWidget,
    ParagraphTable,
    ParagraphFromLibrary,
    ParagraphOnThisPage,
    ParagraphIframe,
    ParagraphIcon,
    ParagraphButtonList,
    ParagraphGallery,
    ParagraphSlider,
    ParagraphNotImplemented,
  ]
}
