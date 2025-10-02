import * as React from 'react';
import { DashboardRouteDefinition } from '@/vdb/framework/extension-api/types/navigation.js';
import { NEW_ENTITY_PATH } from '@/vdb/constants.js';
import { getDetailQueryOptions } from '@/vdb/framework/page/use-detail-page.js';
import { Trans } from '@/vdb/lib/trans.js';
import { StoreSettingsListPage } from '../pages/StoreSettingsListPage';
import { StoreSettingsDetailPage } from '../pages/StoreSettingsDetailPage';
import { getStoreSettingsQuery } from '../queries.js';
import { detailPageRouteLoader } from '@/vdb/index';

export const storeSettingsRoutes: DashboardRouteDefinition[] = [
    {
        navMenuItem: {
            sectionId: 'settings',
            id: 'store-settings-list',
            url: '/store-settings',
            title: 'Cấu hình cửa hàng',
            order: 1,
        },
        path: '/store-settings',
        component: (route) => <StoreSettingsListPage route={route} />,
    },
    {
        path: '/store-settings/$id',
        loader: detailPageRouteLoader({
            queryDocument: getStoreSettingsQuery,
            breadcrumb(isNew, entity) {
                return [
                    { path: '/store-settings', label: 'Store Settings' },
                    isNew ? <Trans>New store settings</Trans> : entity?.key,
                ];
            },
        }),
        component: (route) => <StoreSettingsDetailPage route={route} />,
    },
];
