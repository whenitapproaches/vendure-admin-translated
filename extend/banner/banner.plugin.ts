import { VendurePlugin, PluginCommonModule, Type } from "@vendure/core"
import { PluginInitOptions } from "./types"

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    return config
  },
  dashboard: "./dashboard/index.tsx",
  compatibility: "^3.0.0",
})
export class BannerPlugin {
  static options: PluginInitOptions

  /**
   * Initialize the plugin with the given options
   */
  static init(options: PluginInitOptions = {}): Type<BannerPlugin> {
    this.options = {
      enabled: true,
      ...options,
    }
    return BannerPlugin
  }
}
