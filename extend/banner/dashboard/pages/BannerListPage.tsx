import React, { useState, useMemo } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Button } from '@/vdb/components/ui/button.js'
import { Badge } from '@/vdb/components/ui/badge.js'
import { BANNER_TYPES as BannerType } from '../../constants'
import { api } from '@/vdb/graphql/api.js'
import { graphql } from '@/vdb/graphql/graphql.js'

const bannersQuery = graphql(`
  query Banners($options: BannerListOptions) {
    banners(options: $options) {
      items {
        id
        name
        type
        imageAsset { id preview }
        createdAt
        updatedAt
      }
      totalItems
    }
  }
`)

const createBannerMutationDocument = graphql(`
  mutation CreateBanner($input: CreateBannerInput!) {
    createBanner(input: $input) {
      id
      name
      type
      imageAsset { id preview }
      createdAt
      updatedAt
    }
  }
`)

const deleteBannerMutationDocument = `
  mutation DeleteBanner($id: ID!) {
    deleteBanner(id: $id)
  }
`

const BANNER_TYPES = [
  { value: BannerType.STARTUP, label: 'Startup' },
  { value: BannerType.HERO, label: 'Hero' },
  { value: BannerType.DISCOUNT, label: 'Discount' },
]

export function BannerListPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    type: BannerType.STARTUP as string,
    imageAssetId: '',
  })
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState("")
  const [sortDesc, setSortDesc] = useState(true)
  
  const queryClient = useQueryClient()

  const variables = useMemo(() => {
    return {
      options: {
        skip: pageIndex * pageSize,
        take: pageSize,
        sort: { createdAt: sortDesc ? "DESC" : "ASC" },
        filter: search ? { name: { contains: search } } : undefined,
      },
    } as const
  }, [pageIndex, pageSize, search, sortDesc])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['banners', variables],
    queryFn: () => api.query(bannersQuery, variables),
    staleTime: 10000,
  })

  const createBannerMutation = useMutation({
    mutationFn: api.mutate(createBannerMutationDocument),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
  })
  const deleteBannerMutation = useMutation({
    mutationFn: api.mutate(deleteBannerMutationDocument),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    },
  })

  const items = (data as any)?.banners?.items ?? []
  const totalItems = (data as any)?.banners?.totalItems ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const handleCreateBanner = async () => {
    try {
      await createBannerMutation.mutateAsync({
        input: {
          name: createForm.name,
          type: createForm.type as any,
          imageAssetId: createForm.imageAssetId,
        },
      })
      setShowCreateModal(false)
      setCreateForm({ name: '', type: BannerType.STARTUP as string, imageAssetId: '' })
      queryClient.invalidateQueries({ queryKey: ['banners'] })
    } catch (error) {
      console.error('Failed to create banner', error)
    }
  }

  const handleDeleteBanner = async (id: string) => {
    if (confirm('Are you sure you want to delete this banner?')) {
      try {
        await deleteBannerMutation.mutateAsync({ id })
        queryClient.invalidateQueries({ queryKey: ['banners'] })
      } catch (error) {
        console.error('Failed to delete banner', error)
      }
    }
  }

  const getTypeBadge = (type: string) => {
    const colors = {
      [BannerType.STARTUP]: 'default' as const,
      [BannerType.HERO]: 'secondary' as const,
      [BannerType.DISCOUNT]: 'destructive' as const,
    }
    return <Badge variant={colors[type as keyof typeof colors] || 'default'}>{type}</Badge>
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-semibold">Biểu ngữ</h1>
        <div>
          <a href="/banners/new">
            <Button>
              Thêm biểu ngữ
            </Button>
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => {
            setPageIndex(0)
            setSearch(e.target.value)
          }}
          placeholder="Tìm theo tên"
          className="border rounded px-2 py-1 w-64"
        />
        <Button variant="secondary" onClick={() => refetch()}>
          Làm mới
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">Số dòng mỗi trang</label>
          <select
            className="border rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => {
              setPageIndex(0)
              setPageSize(Number(e.target.value))
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full">
          <thead>
            <tr className="text-left">
              <th className="px-3 py-2">Hình ảnh</th>
              <th className="px-3 py-2">Tên</th>
              <th className="px-3 py-2">Loại</th>
              <th
                className="px-3 py-2 cursor-pointer select-none"
                onClick={() => setSortDesc((s) => !s)}
              >
                <div className="flex items-center gap-1">
                  <span>Ngày tạo</span>
                  <span>{sortDesc ? "▼" : "▲"}</span>
                </div>
              </th>
              <th className="px-3 py-2">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-4" colSpan={5}>
                  Đang tải…
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td className="px-3 py-4 text-red-600" colSpan={5}>
                  Không tải được dữ liệu
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={5}>
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              items.map((banner: any) => (
                <tr key={banner.id} className="border-t">
                  <td className="px-3 py-2">
                    <img
                      src={banner.imageAsset?.preview}
                      alt={banner.name}
                      className="w-16 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={`/banners/${banner.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {banner.name}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    {getTypeBadge(banner.type)}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(banner.createdAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteBanner(banner.id)}
                    >
                      Xóa
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm">
          Hiển thị {items.length ? pageIndex * pageSize + 1 : 0}-
          {pageIndex * pageSize + items.length} trong tổng {totalItems}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          >
            Trước
          </Button>
          <span className="text-sm">
            {pageIndex + 1} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
          >
            Sau
          </Button>
        </div>
      </div>

      {/* create dialog removed in favor of dedicated create page */}
    </div>
  )
}
