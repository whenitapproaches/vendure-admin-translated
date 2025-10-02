import * as React from 'react';
import { DashboardRouteDefinition } from '@/vdb/framework/extension-api/types/navigation.js';
import { Trans } from '@/vdb/lib/trans.js';
import { NotificationTemplatesPage } from '../pages/NotificationTemplatesPage';

export const notificationTemplatesRoute: DashboardRouteDefinition = {
  path: 'settings/notification-templates',
  component: () => <NotificationTemplatesPage />,
  navMenuItem: {
    sectionId: 'settings',
    id: 'notification-templates',
    url: '/settings/notification-templates',
    title: 'Mẫu thông báo',
    order: 1,
  },
  loader: () => ({
    breadcrumb: [
      {
        path: '/settings',
        label: <Trans>Cài đặt</Trans>,
      },
      <Trans>Mẫu thông báo</Trans>,
    ],
  }),
};
