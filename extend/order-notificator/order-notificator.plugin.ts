import { PluginCommonModule, Type, VendurePlugin } from "@vendure/core"
import { PluginInitOptions } from "./types"

@VendurePlugin({
  imports: [PluginCommonModule],
  configuration: (config) => {
    return config
  },
  dashboard: "./dashboard/index.tsx",
  compatibility: "^3.0.0",
})
export class OrderNotificatorPlugin {
  static options: PluginInitOptions

  static init(options: PluginInitOptions): Type<OrderNotificatorPlugin> {
    this.options = options
    return OrderNotificatorPlugin
  }
}
