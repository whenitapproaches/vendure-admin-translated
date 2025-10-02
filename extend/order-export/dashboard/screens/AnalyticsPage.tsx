import * as React from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/vdb/graphql/api.js';
import { Button } from '@/vdb/components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/vdb/components/ui/card.js';
import { Trans } from '@/vdb/lib/trans.js';
import { graphql } from '@/vdb/graphql/graphql.js';

const orderListDocument = graphql(`
  query GetOrdersForExport($options: OrderListOptions) {
    orders(options: $options) {
      items {
        id
        code
        state
        orderPlacedAt
        total
        currencyCode
        customer { firstName lastName emailAddress id }
        shippingAddress { fullName city country postalCode }
        billingAddress { fullName city country postalCode }
      }
      totalItems
    }
  }
`)

function toCsvRow(values: (string | number | null | undefined)[]) {
  return values
    .map((v) => {
      const str = v == null ? "" : String(v)
      if (/[",\n]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    })
    .join(",")
}

function downloadCsv(filename: string, rows: string[]) {
  const content = rows.join("\n")
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function AnalyticsPage({ route }: { route: any }) {
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"))
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [pageSize, setPageSize] = useState(250)

  const options = useMemo(() => {
    let filter: any = {}
    if (from && to) {
      filter.orderPlacedAt = { between: { start: new Date(from).toISOString(), end: new Date(to).toISOString() } }
    } else if (month && year) {
      const m = parseInt(month, 10) - 1
      const y = parseInt(year, 10)
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0))
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59))
      filter.orderPlacedAt = { between: { start: start.toISOString(), end: end.toISOString() } }
    }
    return { filter, sort: { orderPlacedAt: "ASC" as const }, take: pageSize, skip: 0 }
  }, [from, to, month, year, pageSize])

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["orders-export", options],
    queryFn: () => api.query(orderListDocument, { options }),
    enabled: false,
  })

  async function exportAll() {
    const rows: string[] = []
    rows.push(
      toCsvRow([
        "ID đơn hàng",
        "Mã",
        "Trạng thái",
        "Ngày đặt",
        "Tổng tiền",
        "Tiền tệ",
        "Tên khách hàng",
        "Họ khách hàng",
        "Email khách hàng",
        "Gửi đến",
        "Thành phố",
        "Quốc gia",
        "Mã bưu điện",
      ])
    )

    let skip = 0
    while (true) {
      const batchOptions = { ...options, skip }
      const res = await api.query(orderListDocument, { options: batchOptions })
      const batch = res?.orders?.items ?? []
      for (const o of batch as any[]) {
        rows.push(
          toCsvRow([
            o.id,
            o.code,
            o.state,
            o.orderPlacedAt,
            o.total,
            o.currencyCode,
            o.customer?.firstName,
            o.customer?.lastName,
            o.customer?.emailAddress,
            o.shippingAddress?.fullName,
            o.shippingAddress?.city,
            o.shippingAddress?.country,
            o.shippingAddress?.postalCode,
          ])
        )
      }
      const total = res?.orders?.totalItems ?? 0
      skip += pageSize
      if (skip >= total || batch.length === 0) break
    }

    const fileLabel = from && to ? `${from}_to_${to}` : month && year ? `${year}-${month}` : `all`
    downloadCsv(`orders-${fileLabel}.csv`, rows)
  }

  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Trans>Analytics</Trans>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm mb-1"><Trans>Từ</Trans></label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-2 py-1" />
            </div>
            <div className="flex flex-col">
              <label className="text-sm mb-1"><Trans>Đến</Trans></label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-2 py-1" />
            </div>
            <span className="text-sm"><Trans>hoặc</Trans></span>
            <div className="flex flex-col">
              <label className="text-sm mb-1"><Trans>Tháng</Trans></label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-2 py-1">
                <option value="">--</option>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm mb-1"><Trans>Năm</Trans></label>
              <input type="number" min="2000" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className="border rounded px-2 py-1 w-24" />
            </div>
            <div className="flex flex-col ml-auto">
              <label className="text-sm mb-1"><Trans>Kích thước trang</Trans></label>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="border rounded px-2 py-1">
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
            <Button onClick={() => refetch()} disabled={isFetching}><Trans>Xem trước</Trans></Button>
            <Button onClick={exportAll} disabled={isFetching}><Trans>Xuất CSV</Trans></Button>
          </div>

          <div className="mt-4 text-sm">
            {data?.orders?.totalItems != null && (
              <div>
                <Trans>Tổng số đơn hàng: {data.orders.totalItems}</Trans>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


