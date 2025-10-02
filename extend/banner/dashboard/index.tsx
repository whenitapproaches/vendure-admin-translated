import * as React from 'react'
import { DashboardRouteDefinition } from '@/vdb/framework/extension-api/types/navigation.js'
import { defineDashboardExtension } from '@/vdb/framework/extension-api/define-dashboard-extension.js'
import { BannerListPage } from "./pages/BannerListPage"
import { BannerDetailPage, getBannerDocument } from "./pages/BannerDetailPage"
import { BannerCreatePage } from "./pages/BannerCreatePage"
import { detailPageRouteLoader, Trans } from '@/vdb/index'

export const bannerRoutes: DashboardRouteDefinition[] = [
  {
    navMenuItem: {
      sectionId: "marketing",
      id: "banners",
      url: "/banners",
      title: "Biểu ngữ",
      order: 1,
    },
    path: "/banners",
    component: () => <BannerListPage />,
  },
  {
    path: "/banners/new",
    loader: (e) => {
      return {
        breadcrumb: [
          { path: '/banners', label: 'Biểu ngữ' },
          <Trans>Thêm biểu ngữ</Trans>,
        ]
      }
    },
    component: (route) => <BannerCreatePage route={route} />,
  },
  {
    path: "/banners/$id",
    loader: detailPageRouteLoader({
      queryDocument: getBannerDocument,
      breadcrumb(isNew, entity) {
        return [
          { path: '/banners', label: 'Biểu ngữ' },
          isNew ? <Trans>Thêm biểu ngữ</Trans> : entity?.name,
        ];
      },
    }),
    component: (route) => <BannerDetailPage route={route} />,
  },
]

export default defineDashboardExtension({
  routes: bannerRoutes,
  pageBlocks: [],
  actionBarItems: [],
  alerts: [],
  widgets: [],
  customFormComponents: {},
  dataTables: [],
  detailForms: [],
  login: {},
})
