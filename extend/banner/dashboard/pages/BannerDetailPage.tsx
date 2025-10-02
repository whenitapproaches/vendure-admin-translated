import React, { useState } from "react"
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { Page } from '@/vdb/framework/layout-engine/page-layout.js'
import { PageActionBar, PageActionBarRight, PageBlock, PageLayout, PageTitle } from '@/vdb/framework/layout-engine/page-layout.js'
import { Button } from '@/vdb/components/ui/button.js'
import { Card } from '@/vdb/components/ui/card.js'
import { Badge } from '@/vdb/components/ui/badge.js'
import { BANNER_TYPES as BannerType } from "../../constants"
import { api } from '@/vdb/graphql/api.js'
import { graphql } from '@/vdb/graphql/graphql.js'
import { EntityAssets } from '@/vdb/components/shared/entity-assets.js'
import { TextInput } from "@/vdb/index"

// GraphQL queries
export const getBannerDocument = graphql(`
  query Banner($id: ID!) {
    banner(id: $id) {
      id
      name
      type
      url
      imageAsset { id preview }
      createdAt
      updatedAt
    }
  }
`)

const updateBannerDocument = graphql(`
  mutation UpdateBanner($input: UpdateBannerInput!) {
    updateBanner(input: $input) { id }
  }
`)

const BANNER_TYPES = [
  { value: BannerType.STARTUP, label: "Startup" },
  { value: BannerType.HERO, label: "Hero" },
  { value: BannerType.DISCOUNT, label: "Discount" },
]

export function BannerDetailPage({ route }: { route: any }) {
  const params = route.useParams()
  const id: string = params.id
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    name: "",
    type: BannerType.STARTUP as string,
    imageAssetId: "",
    url: "",
  })

  const { data, isLoading } = useQuery({
    queryKey: ['banner', id],
    queryFn: () => api.query(getBannerDocument, { id }),
  })

  React.useEffect(() => {
    if ((data as any)?.banner) {
      setForm({
        name: (data as any).banner.name,
        type: (data as any).banner.type,
        imageAssetId: (data as any).banner.imageAsset.id,
        url: (data as any).banner.url || "",
      })
    }
  }, [data])

  const updateBannerMutation = useMutation({
    mutationFn: api.mutate(updateBannerDocument),
  })

  const handleUpdateBanner = async () => {
    try {
      await updateBannerMutation.mutateAsync({
        input: {
          id,
          name: form.name,
          type: form.type as any,
          imageAssetId: form.imageAssetId,
          url: form.url || undefined,
        },
      })
      queryClient.invalidateQueries({ queryKey: ["banner", id] })
    } catch (error) {
      console.error("Failed to update banner", error)
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      [BannerType.STARTUP]: "default" as const,
      [BannerType.HERO]: "secondary" as const,
      [BannerType.DISCOUNT]: "destructive" as const,
    }
    return <Badge variant={colors[type as keyof typeof colors] || 'default'}>{type}</Badge>
  }

  if (isLoading) {
    return <div>Đang tải...</div>
  }

  if (!(data as any)?.banner) {
    return <div>Không tìm thấy biểu ngữ</div>
  }

  return (
    <Page pageId="banner-detail">
      <PageTitle>Chi tiết biểu ngữ</PageTitle>
      <PageActionBar>
        <PageActionBarRight>
          <Button onClick={() => navigate({ to: "/banners" })}>
            Quay lại danh sách
          </Button>
        </PageActionBarRight>
      </PageActionBar>

      <PageLayout>
        <PageBlock column="main">
          <Card className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Biểu ngữ hiện tại</h3>
                <div className="flex items-center gap-4">
                  <img
                    src={(data as any).banner.imageAsset.preview}
                    alt={(data as any).banner.name}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div>
                    <h4 className="font-medium">{(data as any).banner.name}</h4>
                    {getTypeBadge((data as any).banner.type)}
                    <p className="text-sm text-muted-foreground">
                      Tạo lúc: {new Date((data as any).banner.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Chỉnh sửa biểu ngữ</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name">Tên *</label>
                    <TextInput
                      id="name"
                      value={form.name}
                      onChange={(value) => setForm({ ...form, name: value })}
                      placeholder="Nhập tên biểu ngữ"
                    />
                  </div>

                  <div>
                    <label htmlFor="type">Loại *</label>
                    <select
                      id="type"
                      className="border rounded px-2 py-1 w-full"
                      value={form.type}
                      onChange={(e) =>
                        setForm({ ...form, type: (e.target as HTMLSelectElement).value })
                      }
                    >
                      {BANNER_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="url">URL</label>
                    <TextInput
                      id="url"
                      value={form.url}
                      onChange={(value) => setForm({ ...form, url: value })}
                      placeholder="Nhập URL (không bắt buộc)"
                    />
                  </div>

                  <div>
                    <label htmlFor="image">Hình ảnh *</label>
                    <div>
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

                  <div className="pt-4">
                    <Button
                      onClick={handleUpdateBanner}
                      disabled={!form.name || !form.imageAssetId || updateBannerMutation.isPending}
                    >
                      {updateBannerMutation.isPending ? "Đang cập nhật..." : "Cập nhật biểu ngữ"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </PageBlock>
      </PageLayout>
    </Page>
  )
}
