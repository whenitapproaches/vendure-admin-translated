import React, { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Page } from '@/vdb/framework/layout-engine/page-layout.js'
import { PageActionBar, PageActionBarRight, PageBlock, PageLayout, PageTitle } from '@/vdb/framework/layout-engine/page-layout.js'
import { Button } from '@/vdb/components/ui/button.js'
import { Input as TextInput } from '@/vdb/components/ui/input.js'
import { BANNER_TYPES as BannerType } from "../../constants"
import { api } from '@/vdb/graphql/api.js'
import { useMutation } from "@tanstack/react-query"
import { graphql } from '@/vdb/graphql/graphql.js'
import { EntityAssets } from '@/vdb/components/shared/entity-assets.js'

const BANNER_TYPES = [
  { value: BannerType.STARTUP, label: "Startup" },
  { value: BannerType.HERO, label: "Hero" },
  { value: BannerType.DISCOUNT, label: "Discount" },
]

export function BannerCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: "",
    type: BannerType.STARTUP as string,
    imageAssetId: "",
    url: "",
  })

  const createBannerDocument = graphql(`
    mutation CreateBanner($input: CreateBannerInput!) {
      createBanner(input: $input) {
        id
      }
    }
  `)

  const { mutateAsync, isPending } = useMutation({
    mutationFn: api.mutate(createBannerDocument),
  })

  const handleCreate = async () => {
    await mutateAsync({
      input: {
        name: form.name,
        type: form.type as any,
        imageAssetId: form.imageAssetId,
        url: form.url || undefined,
      },
    })
    await navigate({ to: "/banners" })
  }

  return (
    <Page pageId="banner-create">
      <PageTitle>Thêm biểu ngữ</PageTitle>
      <PageActionBar>
        <PageActionBarRight>
          <Button
            onClick={() => navigate({ to: "/banners" })}
            variant="secondary"
          >
            Hủy
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!form.name || !form.imageAssetId || isPending}
          >
            {isPending ? "Đang tạo..." : "Tạo mới"}
          </Button>
        </PageActionBarRight>
      </PageActionBar>
      <PageLayout>
        <PageBlock column="main">
          <div className="space-y-4 p-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Tên*
              </label>
              <TextInput
                id="name"
                value={form.name}
                onChange={(value) => {
                  setForm({ ...form, name: value })
                }}
                placeholder="Nhập tên biểu ngữ"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                Loại*
              </label>
              <select
                id="type"
                className="border rounded px-2 py-1 w-full"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: (e.target as HTMLSelectElement).value })}
              >
                {BANNER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-1">
                URL
              </label>
              <TextInput
                id="url"
                value={form.url}
                onChange={(value) => setForm({ ...form, url: value })}
                placeholder="Nhập URL (không bắt buộc)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Hình ảnh*
              </label>
              <EntityAssets
                compact={true}
                value={{
                  featuredAssetId: form.imageAssetId || undefined,
                  assetIds: form.imageAssetId ? [form.imageAssetId] : [],
                }}
                onChange={(value) => {
                  setForm((f) => ({ ...f, imageAssetId: value.featuredAssetId ?? '' }))
                }}
              />
            </div>
          </div>
        </PageBlock>
      </PageLayout>
    </Page>
  )
}
