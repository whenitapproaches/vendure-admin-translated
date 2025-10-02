import * as React from 'react';
import { DashboardRouteDefinition } from '@/vdb/framework/extension-api/types/navigation.js';
import { Trans } from '@/vdb/lib/trans.js';
import { AnalyticsPage } from '../screens/AnalyticsPage.js';

export const routes: DashboardRouteDefinition[] = [
	{
		navMenuItem: {
			sectionId: 'sales',
			id: 'analytics',
			url: '/analytics',
			title: 'Phân tích',
			order: 99,
		},
		path: '/analytics',
		loader: () => ({ breadcrumb: () => <Trans>Phân tích</Trans> }),
		component: (route) => <AnalyticsPage route={route} />,
	},
];


