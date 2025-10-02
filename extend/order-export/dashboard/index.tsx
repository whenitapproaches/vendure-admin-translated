import { defineDashboardExtension } from '@/vdb/framework/extension-api/define-dashboard-extension.js';
import { routes } from './routes/index.js';

export default defineDashboardExtension({
	routes,
	pageBlocks: [],
	actionBarItems: [],
	alerts: [],
	widgets: [],
	customFormComponents: {},
	dataTables: [],
	detailForms: [],
	login: {},
});


