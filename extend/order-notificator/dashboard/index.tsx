import { defineDashboardExtension } from '@/vdb/framework/extension-api/define-dashboard-extension.js';
import { notificationTemplatesRoute } from './routes';

export default defineDashboardExtension({
  routes: [notificationTemplatesRoute],
  pageBlocks: [],
  actionBarItems: [],
  alerts: [],
  widgets: [],
  customFormComponents: {},
  dataTables: [],
  detailForms: [],
  login: {},
});
