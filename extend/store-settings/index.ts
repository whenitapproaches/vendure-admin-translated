import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { storeSettingsAdminApiExtensions } from './api/api-extensions.js';

@VendurePlugin({
    imports: [PluginCommonModule],
    // Point to the dashboard extension entry relative to this file
    dashboard: './dashboard/index.tsx',
    adminApiExtensions: {
        schema: storeSettingsAdminApiExtensions,
    },
})
export class StoreSettingsPlugin {}



