export class Plugin {
  pluginType: string
  configuration: Record<string, any>

  constructor(pluginType: string) {
    this.pluginType = pluginType
    this.configuration = {}
  }
}
