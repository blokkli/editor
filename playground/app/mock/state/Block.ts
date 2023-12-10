import { Entity } from './Entity'
import { FieldBlocks, FieldOptions, FieldText } from './Field'

export abstract class Block extends Entity {
  constructor(uuid: string, bundle: string) {
    super(uuid, 'block', bundle)
    this.addField(new FieldOptions('options', 'Options', this))
  }

  options(): FieldOptions {
    return this.fields.options as FieldOptions
  }

  static create(bundle: string, uuid: string): Block {
    switch (bundle) {
      case 'text':
        return new BlockText(uuid)
      case 'title':
        return new BlockTitle(uuid)
      case 'grid':
        return new BlockGrid(uuid)
      case 'teaser':
        return new BlockTeaser(uuid)
    }

    throw new Error('Invalid block bundle: ' + bundle)
  }
}

export class BlockText extends Block {
  constructor(uuid: string) {
    super(uuid, 'text')
    this.addField(new FieldText('text', 'Text', this))
  }

  text(): FieldText {
    return this.get('text')
  }
}

export class BlockTitle extends Block {
  constructor(uuid: string) {
    super(uuid, 'title')
    this.addField(new FieldText('title', 'Title', this))
    this.addField(new FieldText('lead', 'Lead', this))
  }

  title(): FieldText {
    return this.get('title')
  }

  lead(): FieldText {
    return this.get('lead')
  }
}

export class BlockGrid extends Block {
  constructor(uuid: string) {
    super(uuid, 'grid')
    this.addField(new FieldBlocks('blocks', 'Blocks', -1, ['teaser'], this))
  }

  blocks(): FieldBlocks {
    return this.get('blocks')
  }
}

export class BlockTeaser extends Block {
  constructor(uuid: string) {
    super(uuid, 'teaser')
    this.addField(new FieldText('title', 'Title', this))
    this.addField(new FieldText('url', 'Url', this))
    this.addField(new FieldText('text', 'Text', this))
  }

  title(): FieldText {
    return this.get('title')
  }

  url(): FieldText {
    return this.get('url')
  }

  text(): FieldText {
    return this.get('text')
  }
}
