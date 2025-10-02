import { defineDashboardExtension } from '@/vdb/framework/extension-api/define-dashboard-extension.js';
import { storeSettingsRoutes } from './routes';

export default defineDashboardExtension({
    routes: storeSettingsRoutes,
    pageBlocks: [],
    actionBarItems: [],
    alerts: [],
    widgets: [],
    customFormComponents: {},
    dataTables: [],
    detailForms: [],
    login: {},
});
