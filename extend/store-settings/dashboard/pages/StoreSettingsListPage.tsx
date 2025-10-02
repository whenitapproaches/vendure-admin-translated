import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/vdb/graphql/api.js"
import { ADMIN_SECRET, STOREFRONT_URL } from "@/vdb/env.js"
import { Button } from "@/vdb/components/ui/button.js"
import { PermissionGuard } from "@/vdb/components/shared/permission-guard.js"
import { Trans } from "@/vdb/lib/trans.js"
import { graphql } from "@/vdb/graphql/graphql.js"
import { PlusIcon, RefreshCwIcon } from "lucide-react"
// Using anchor to avoid route typing in extension context
import { toast } from "sonner"

const getAllStoreSettingsQuery = graphql(`
  query GetAllStoreSettings($options: StoreSettingsListOptions) {
    allStoreSettings(options: $options) {
      items {
        id
        key
        value
        createdAt
        updatedAt
      }
      totalItems
    }
  }
`)

export function StoreSettingsListPage({ route }) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState("")
  const [sortDesc, setSortDesc] = useState(true)
  const [isInvalidatingCache, setIsInvalidatingCache] = useState(false)

  const variables = useMemo(() => {
    return {
      options: {
        skip: pageIndex * pageSize,
        take: pageSize,
        sort: { createdAt: sortDesc ? "DESC" : "ASC" },
        filter: search ? { key: { contains: search } } : undefined,
      },
    } as const
  }, [pageIndex, pageSize, search, sortDesc])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["store-settings", variables],
    queryFn: () => api.query(getAllStoreSettingsQuery, variables),
    staleTime: 10000,
  })

  const items = (data as any)?.allStoreSettings?.items ?? []
  const totalItems = (data as any)?.allStoreSettings?.totalItems ?? 0
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  const handleInvalidateCache = async () => {
    setIsInvalidatingCache(true)
    try {
      // Get the admin secret from Vite env, otherwise use a fallback
      const adminSecret = ADMIN_SECRET ?? 'your_admin_secret_here'
      const storeFrontUrl = STOREFRONT_URL ?? 'your_storefront_url_here'

      // Get the base domain from current location
      const currentHost = window.location.hostname
      const baseDomain = currentHost.replace(/^admin\./, '') // Remove 'admin.' prefix if present
      const protocol = window.location.protocol
      const baseUrl = `${protocol}//${baseDomain}`

      // Call the cache invalidation endpoint
      const response = await fetch(`${storeFrontUrl}/api/admin/invalidate-cache?secret=${adminSecret}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminSecret}`,
        }
      })

      if (response.ok) {
        toast.success('Cache invalidated successfully!')
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to invalidate cache: ${response.status} ${errorText}`)
      }
    } catch (error) {
      console.error('Cache invalidation error:', error)
      toast.error('Failed to invalidate cache', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    } finally {
      setIsInvalidatingCache(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className="text-xl font-semibold">
          <Trans>Cấu hình cửa hàng</Trans>
        </h1>
        <div className="flex items-center gap-2">
          <PermissionGuard requires={["UpdateSettings"]}>
            <Button
              variant="outline"
              onClick={handleInvalidateCache}
              disabled={isInvalidatingCache}
            >
              <RefreshCwIcon className={`mr-2 h-4 w-4 ${isInvalidatingCache ? 'animate-spin' : ''}`} />
              <Trans>Xóa cache</Trans>
            </Button>
          </PermissionGuard>
          <PermissionGuard requires={["CreateCatalog"]}>
            <Button asChild>
              <a href="/store-settings/new">
                <PlusIcon className="mr-2 h-4 w-4" />
                <Trans>Thêm cấu hình</Trans>
              </a>
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => {
            setPageIndex(0)
            setSearch(e.target.value)
          }}
          placeholder="Tìm theo khóa"
          className="border rounded px-2 py-1 w-64"
        />
        <Button variant="secondary" onClick={() => refetch()}>
          <Trans>Làm mới</Trans>
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm">
            <Trans>Số dòng mỗi trang</Trans>
          </label>
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
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Value</th>
              <th
                className="px-3 py-2 cursor-pointer select-none"
                onClick={() => setSortDesc((s) => !s)}
              >
                <div className="flex items-center gap-1">
                  <span>Created</span>
                  <span>{sortDesc ? "▼" : "▲"}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-3 py-4" colSpan={4}>
                  <Trans>Đang tải…</Trans>
                </td>
              </tr>
            ) : isError ? (
              <tr>
                <td className="px-3 py-4 text-red-600" colSpan={4}>
                  <Trans>Tải dữ liệu thất bại</Trans>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-4" colSpan={4}>
                  <Trans>Không có kết quả</Trans>
                </td>
              </tr>
            ) : (
              items.map((it: any) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{it.id}</td>
                  <td className="px-3 py-2">
                    <a
                      href={`/store-settings/${String(it.id)}`}
                      className="text-blue-600 hover:underline"
                    >
                      {it.key}
                    </a>
                  </td>
                  <td className="px-3 py-2">{it.value}</td>
                  <td className="px-3 py-2">
                    {new Date(it.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm">
          <Trans>
            Showing {items.length ? pageIndex * pageSize + 1 : 0}-
            {pageIndex * pageSize + items.length} of {totalItems}
          </Trans>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
          >
            <Trans>Trước</Trans>
          </Button>
          <span className="text-sm">
            {pageIndex + 1} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={pageIndex + 1 >= totalPages}
            onClick={() => setPageIndex((i) => Math.min(totalPages - 1, i + 1))}
          >
            <Trans>Tiếp</Trans>
          </Button>
        </div>
      </div>
    </div>
  )
}
