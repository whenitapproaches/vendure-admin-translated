import { VendureConfig } from '@vendure/core';
import { StoreSettingsPlugin } from './extend/store-settings/index.js';
import { BannerPlugin } from './extend/banner/banner.plugin.js';
import { OrderExportPlugin } from './extend/order-export/order-export.plugin.js';
import { OrderNotificatorPlugin } from './extend/order-notificator/order-notificator.plugin.js';

export const config: VendureConfig = {
    apiOptions: {
        port: 3000,
    },
    authOptions: {
        tokenMethod: 'bearer',
    },
    dbConnectionOptions: {
        type: 'postgres',
    },
    paymentOptions: {
        paymentMethodHandlers: [],
    },
    plugins: [
        StoreSettingsPlugin, 
        BannerPlugin,
        OrderExportPlugin.init({}),
        OrderNotificatorPlugin.init({}),
    ],
};
