import { Button } from "@/vdb/components/ui/button.js"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/vdb/components/ui/card.js"
import { Input } from "@/vdb/components/ui/input.js"
import { Textarea } from "@/vdb/components/ui/textarea.js"
import { Label } from "@/vdb/components/ui/label.js"
import { Badge } from "@/vdb/components/ui/badge.js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/vdb/components/ui/select.js"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { graphql } from "@/vdb/graphql/graphql.js"
import { graphqlUpload } from "@/vdb/graphql/upload.js"
import { Trans } from "@/vdb/lib/trans.js"
import { useTranslation } from "@/vdb/lib/custom-trans.js"
import { api } from "@/vdb/graphql/api.js"

export const Route = createFileRoute("/_authenticated/_import/import")({
  loader: () => ({ breadcrumb: () => <Trans>Import</Trans> }),
  component: ImportPage,
})

const importMutation = graphql(`
  mutation ImportProductsFromCsv(
    $file: Upload!
    $encoding: String
    $dryRun: Boolean
  ) {
    importProductsFromCsv(file: $file, encoding: $encoding, dryRun: $dryRun) {
      summary {
        total
        created
        updated
        skipped
        failed
      }
      items {
        row
        sku
        productName
        productSlug
        status
        message
        productId
        variantId
        listPrice
        availableStock
        description
        assets
        variantAssets
        collectionSlugs
      }
    }
  }
`)

const importShopeeMutation = graphql(`
  mutation ImportProductsFromShopee($curl: String!, $dryRun: Boolean) {
    importProductsFromShopee(curl: $curl, dryRun: $dryRun) {
      summary {
        total
        created
        updated
        skipped
        failed
      }
      items {
        row
        sku
        productName
        productSlug
        status
        message
        productId
        variantId
        listPrice
        availableStock
        description
        assets
        variantAssets
        collectionSlugs
      }
    }
  }
`)

export default function ImportPage() {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [encoding, setEncoding] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<any | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shopeeCurl, setShopeeCurl] = useState("")
  const [activeTab, setActiveTab] = useState<"csv" | "shopee">("csv")

  async function runImport(dryRun: boolean) {
    setIsSubmitting(true)
    try {
      if (activeTab === "csv") {
        if (!file) return
        const data = await graphqlUpload<{ importProductsFromCsv: any }>({
          query: importMutation,
          variables: { file: null, encoding, dryRun },
          fileMap: { "variables.file": file },
        })
        setResult(data.importProductsFromCsv)
      } else {
        const mutate = api.mutate(importShopeeMutation)
        const data = await mutate({ curl: shopeeCurl, dryRun })
        setResult((data as any).importProductsFromShopee)
      }
    } catch (e: any) {
      alert(e.message || String(e))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("Nhập sản phẩm")}</CardTitle>
            <div className="flex gap-2 text-sm">
              <Button
                variant={activeTab === "csv" ? "default" : "secondary"}
                onClick={() => setActiveTab("csv")}
              >
                CSV
              </Button>
              <Button
                variant={activeTab === "shopee" ? "default" : "secondary"}
                onClick={() => setActiveTab("shopee")}
              >
                Shopee cURL
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeTab === "csv" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="csvfile">{t("Tệp CSV")}</Label>
                <Input
                  id="csvfile"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label htmlFor="encoding">{t("Bảng mã")}</Label>
                <Select onValueChange={(v) => setEncoding(v)}>
                  <SelectTrigger id="encoding">
                    <SelectValue placeholder={t("Tự động")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utf-8">UTF-8</SelectItem>
                    <SelectItem value="utf-16le">UTF-16 LE</SelectItem>
                    <SelectItem value="latin1">Latin-1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="curl">{t("Dán cURL Shopee")}</Label>
              <Textarea
                id="curl"
                value={shopeeCurl}
                onChange={(e) => setShopeeCurl(e.target.value)}
                placeholder="curl 'https://shopee.api/...' -H 'Authorization: Bearer ...' ..."
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              disabled={
                (activeTab === "csv" ? !file : !shopeeCurl) || isSubmitting
              }
              onClick={() => runImport(true)}
            >
              <Trans>Duyệt thử</Trans>
            </Button>
            <Button
              variant="secondary"
              disabled={
                (activeTab === "csv" ? !file : !shopeeCurl) ||
                isSubmitting ||
                !result
              }
              onClick={() => runImport(false)}
            >
              <Trans>Nhập</Trans>
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Xem trước")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 text-sm">
              {t("Tổng")}: {result.summary.total} · {t("Tạo mới")}:{" "}
              {result.summary.created} · {t("Cập nhật")}:{" "}
              {result.summary.updated} · {t("Bỏ qua")}:{" "}
              {result.summary.skipped} · {t("Lỗi")}: {result.summary.failed}
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">Dòng</th>
                    <th className="p-2">Mã SKU</th>
                    <th className="p-2">Tên</th>
                    <th className="p-2">Slug</th>
                    <th className="p-2">Giá niêm yết</th>
                    <th className="p-2">Tồn kho</th>
                    <th className="p-2">Ảnh</th>
                    <th className="p-2">Ảnh biến thể</th>
                    <th className="p-2">Bộ sưu tập</th>
                    <th className="p-2">Trạng thái</th>
                    <th className="p-2">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((it: any) => (
                    <tr key={it.row} className="border-b">
                      <td className="p-2">{it.row}</td>
                      <td className="p-2">{it.sku}</td>
                      <td className="p-2">{it.productName}</td>
                      <td className="p-2">{it.productSlug}</td>
                      <td className="p-2">{it.listPrice ?? ""}</td>
                      <td className="p-2">{it.availableStock ?? ""}</td>
                      <td
                        className="p-2 max-w-[18rem] truncate"
                        title={(it.assets || [])?.join(", ")}
                      >
                        <div>
                          {(it.assets || []).map((url: string, idx: number) => (
                            <img key={idx} src={url} className="w-24 h-auto inline-block mr-1" />
                          ))}
                        </div>
                      </td>
                      <td
                        className="p-2 max-w-[18rem] truncate"
                        title={(it.variantAssets || [])?.join(", ")}
                      >
                        {(it.variantAssets || [])?.slice(0, 2).join(", ")}
                        {(it.variantAssets || []).length > 2 ? "…" : ""}
                      </td>
                      <td className="p-2">
                        {(it.collectionSlugs || [])?.join(", ")}
                      </td>
                      <td className="p-2">
                        {(() => {
                          const s = String(it.status || '').toLowerCase()
                          const variants: Record<string, "success" | "destructive" | "outline" | "default" | "secondary"> = {
                            created: "success",
                            updated: "default",
                            skipped: "outline",
                            failed: "destructive",
                          }
                          const labels: Record<string, string> = {
                            created: "Tạo mới",
                            updated: "Cập nhật",
                            skipped: "Bỏ qua",
                            failed: "Lỗi",
                          }
                          const variant = variants[s] ?? "secondary"
                          const label = labels[s] ?? it.status
                          return <Badge variant={variant}>{label}</Badge>
                        })()}
                      </td>
                      <td className="p-2">{it.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
