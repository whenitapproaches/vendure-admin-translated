import { Injectable, Inject } from '@nestjs/common'
import { RequestContext, ProductService, ProductVariantService, TaxCategoryService, ID, TransactionalConnection, LanguageCode, Product, ProductVariant, AssetService } from '@vendure/core'
import type { ReadStream } from 'fs'
import { Readable } from 'node:stream'
import { parse } from 'csv-parse'
import type { ImportProductsResult, ImportProductsResultItem, ProductImportPluginOptions } from '../types'
import { PRODUCT_IMPORT_PLUGIN_OPTIONS } from '../constants'

type UploadFile = Promise<{ filename: string; mimetype: string; encoding: string; createReadStream: () => ReadStream }>

interface HandleUploadOptions { encoding?: string; dryRun?: boolean }

@Injectable()
export class ProductImportService {
  constructor(
    @Inject(PRODUCT_IMPORT_PLUGIN_OPTIONS) private options: ProductImportPluginOptions,
    private productService: ProductService,
    private productVariantService: ProductVariantService,
    private taxCategoryService: TaxCategoryService,
    private connection: TransactionalConnection,
    private assetService: AssetService,
  ) {}

  async handleUpload(ctx: RequestContext, file: any, opts: HandleUploadOptions): Promise<ImportProductsResult> {
    const upload: UploadFile = typeof file?.then === 'function' ? file : Promise.resolve(file)
    const { createReadStream, filename } = await upload
    const stream = createReadStream()

    const records: any[] = await this.parseCsv(stream, opts.encoding)
    let rowNum = 0
    const items: ImportProductsResultItem[] = []
    let created = 0, updated = 0, skipped = 0, failed = 0

    const defaultLang = this.options.defaultLanguage ?? LanguageCode.en
    const dryRun = opts.dryRun ?? this.options.dryRunByDefault ?? false

    for (const rec of records) {
      rowNum++
      const itemBase: Partial<ImportProductsResultItem> = {
        row: rowNum,
        sku: (rec.sku ?? rec.SKU ?? rec.Sku)?.toString().trim(),
        productName: (rec.name ?? rec.productName ?? rec['product name'])?.toString().trim(),
        productSlug: (rec.slug ?? rec['product slug'])?.toString().trim(),
      }

      try {
        const sku = itemBase.sku
        const name = itemBase.productName
        if (!sku || !name) {
          skipped++
          items.push({ ...itemBase, status: 'skipped', message: 'Missing required fields: sku and name' } as ImportProductsResultItem)
          continue
        }

        const priceInputRaw = rec.price ?? rec['price (cent)'] ?? rec.Price
        let price: number | undefined
        if (priceInputRaw != null && priceInputRaw !== '') {
          const p = Number(String(priceInputRaw).replace(/[,\s]/g, ''))
          if (!Number.isFinite(p)) throw new Error(`Invalid price: ${priceInputRaw}`)
          price = Math.round(p)
        }

        // Tax category by name or id
        let taxCategoryId: ID | undefined
        const taxName = (rec.taxCategory ?? rec.taxCategoryName ?? rec['tax name'])?.toString().trim()
        const taxId = (rec.taxCategoryId ?? rec['tax id'])?.toString().trim()
        if (taxId) {
          taxCategoryId = taxId as unknown as ID
        } else {
          const nameOrDefault = taxName || this.options.defaultTaxCategoryName
          if (nameOrDefault) {
            const tc = await this.taxCategoryService.findAll(ctx)
            const match = tc.items.find((t: any) => t.name === nameOrDefault)
            if (!match) throw new Error(`Tax category not found: ${nameOrDefault}`)
            taxCategoryId = match.id
          }
        }

        if (dryRun) {
          created++
          items.push({ ...itemBase, status: 'created', message: 'Dry run', productId: undefined, variantId: undefined } as ImportProductsResultItem)
          continue
        }

        // Find or create product by slug or name
        let productId: ID
        const slug = itemBase.productSlug || this.slugify(name!)
        const existing = await this.connection.getRepository(ctx, Product)
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.translations', 'translation')
          .where('translation.slug = :slug', { slug })
          .getOne()
        if (existing) {
          productId = existing.id
        } else {
          const createdProduct = await this.productService.create(ctx, {
            enabled: true,
            translations: [{ languageCode: defaultLang, name: name!, slug }],
          })
          productId = createdProduct.id
        }

        // Skip if a variant with this SKU already exists
        const existingVariant = await this.connection.getRepository(ctx, ProductVariant).findOne({ where: { sku: sku! } })
        if (existingVariant) {
          skipped++
          items.push({ ...itemBase, status: 'skipped', message: `Variant with SKU ${sku} already exists`, productId: existingVariant.productId?.toString?.() } as ImportProductsResultItem)
          continue
        }

        // Create variant
        const variant = await this.productVariantService.create(ctx, [
          {
            productId,
            enabled: true,
            sku: sku!,
            taxCategoryId,
            price,
            translations: [{ languageCode: defaultLang, name: name! }],
          },
        ])
        const createdVariant = variant[0]

        // Handle product assets from URLs (pipe-separated list in `assets` column)
        const assetsCol: string | undefined = rec.assets || rec.Assets || rec['productAssets'] || rec['product assets']
        if (!dryRun && assetsCol) {
          const urls = String(assetsCol)
            .split('|')
            .map((u: string) => u.trim())
            .filter(Boolean)
          if (urls.length > 0) {
            const createdAssetIds: ID[] = []
            for (const url of urls) {
              try {
                const { stream, fileName } = await this.fetchUrlAsReadable(url)
                const createRes = await this.assetService.createFromFileStream(stream as any, fileName, ctx)
                const maybeId = (createRes as any)?.id
                if (maybeId) {
                  createdAssetIds.push(maybeId as ID)
                } else {
                  const msg = (createRes as any)?.message || 'Unknown asset creation error'
                  throw new Error(msg)
                }
              } catch (e) {
                // record asset fetch error but continue
                items.push({ ...itemBase, status: 'failed', message: `Asset import failed for ${url}: ${e instanceof Error ? e.message : String(e)}` } as ImportProductsResultItem)
              }
            }

            if (createdAssetIds.length > 0) {
              // Merge with existing product assets if any
              const productEntity = await this.productService.findOne(ctx, productId)
              const existingAssets = productEntity ? await this.assetService.getEntityAssets(ctx, productEntity) : []
              const existingIds: ID[] = (existingAssets || []).map(a => a.id)
              const mergedIds: ID[] = [...existingIds, ...createdAssetIds]
              await this.productService.update(ctx, {
                id: productId,
                assetIds: mergedIds,
                featuredAssetId: mergedIds[0],
              })
            }
          }
        }

        // Handle variant-level assets from URLs in `variantAssets` column
        const variantAssetsCol: string | undefined = rec.variantAssets || rec['variant assets']
        if (!dryRun && variantAssetsCol) {
          const urls = String(variantAssetsCol)
            .split('|')
            .map((u: string) => u.trim())
            .filter(Boolean)
          if (urls.length > 0) {
            const createdVariantAssetIds: ID[] = []
            for (const url of urls) {
              try {
                const { stream, fileName } = await this.fetchUrlAsReadable(url)
                const createRes = await this.assetService.createFromFileStream(stream as any, fileName, ctx)
                const maybeId = (createRes as any)?.id
                if (maybeId) {
                  createdVariantAssetIds.push(maybeId as ID)
                } else {
                  const msg = (createRes as any)?.message || 'Unknown asset creation error'
                  throw new Error(msg)
                }
              } catch (e) {
                items.push({ ...itemBase, status: 'failed', message: `Variant asset import failed for ${url}: ${e instanceof Error ? e.message : String(e)}` } as ImportProductsResultItem)
              }
            }

            if (createdVariantAssetIds.length > 0) {
              await this.productVariantService.update(ctx, [{
                id: createdVariant.id,
                assetIds: createdVariantAssetIds,
                featuredAssetId: createdVariantAssetIds[0],
              }])
            }
          }
        }

        created++
        items.push({ ...itemBase, status: 'created', productId: productId.toString(), variantId: createdVariant.id.toString() } as ImportProductsResultItem)
      } catch (e: any) {
        failed++
        items.push({ ...itemBase, status: 'failed', message: e?.message ?? String(e) } as ImportProductsResultItem)
      }
    }

    return {
      items,
      summary: { total: records.length, created, updated, skipped, failed },
    }
  }

  private parseCsv(stream: ReadStream, encoding?: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = []
      const parser = parse({ columns: true, skip_empty_lines: true })
      stream
        .pipe(parser)
        .on('data', rec => records.push(rec))
        .on('end', () => resolve(records))
        .on('error', err => reject(err))
    })
  }

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '')
  }

  private async fetchUrlAsReadable(url: string): Promise<{ stream: Readable; fileName: string }> {
    const res = await fetch(url)
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status} fetching ${url}`)
    }
    let nodeStream: any
    // Node >=18 returns a web ReadableStream
    const body: any = res.body as any
    if (typeof (Readable as any).fromWeb === 'function' && typeof body?.getReader === 'function') {
      nodeStream = (Readable as any).fromWeb(body)
    } else if (typeof (body as any).pipe === 'function') {
      nodeStream = body
    } else {
      const buf = Buffer.from(await res.arrayBuffer())
      nodeStream = Readable.from(buf)
    }
    const fileName = this.deriveFileNameFromUrl(url)
    return { stream: nodeStream as Readable, fileName }
  }

  private deriveFileNameFromUrl(url: string): string {
    try {
      const u = new URL(url)
      const base = u.pathname.split('/').filter(Boolean).pop() || 'image'
      return base
    } catch {
      return 'image'
    }
  }
}
