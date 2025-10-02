import { PluginCommonModule, Type, VendurePlugin } from "@vendure/core"
import { PluginInitOptions } from "./types"

@VendurePlugin({
	imports: [PluginCommonModule],
	configuration: (config) => config,
	compatibility: "^3.0.0",
	dashboard: "./dashboard/index.tsx",
})
export class OrderExportPlugin {
	static options: PluginInitOptions

	static init(options: PluginInitOptions): Type<OrderExportPlugin> {
		this.options = options
		return OrderExportPlugin
	}
}