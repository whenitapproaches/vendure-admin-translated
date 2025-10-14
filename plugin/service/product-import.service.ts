import { Injectable } from '@nestjs/common';
import {
    ID,
    LanguageCode,
    Product,
    ProductService,
    ProductVariant,
    ProductVariantService,
    RequestContext,
    TaxCategoryService,
    TransactionalConnection,
    AssetService,
    Collection,
    CollectionService,
} from '@vendure/core';
import type { ReadStream } from 'fs';
import { parse } from 'csv-parse';
import { Readable } from 'node:stream';

export type ImportProductsResultItem = {
    row: number;
    sku?: string | null;
    productName?: string | null;
    productSlug?: string | null;
    status: 'created' | 'updated' | 'skipped' | 'failed';
    message?: string | null;
    productId?: string | null;
    variantId?: string | null;
    listPrice?: number | null;
    availableStock?: number | null;
    description?: string | null;
    assets?: string[] | null;
    variantAssets?: string[] | null;
    collectionSlugs?: string[] | null;
};

export type ImportProductsSummary = {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
};

export type ImportProductsResult = {
    items: ImportProductsResultItem[];
    summary: ImportProductsSummary;
};

@Injectable()
export class ProductImportService {
    constructor(
        private productService: ProductService,
        private productVariantService: ProductVariantService,
        private taxCategoryService: TaxCategoryService,
        private connection: TransactionalConnection,
        private assetService: AssetService,
        private collectionService: CollectionService,
    ) {}

    async handleUpload(
        ctx: RequestContext,
        file: any,
        opts: { encoding?: string; dryRun?: boolean },
    ): Promise<ImportProductsResult> {
        const upload: Promise<{
            filename: string;
            mimetype: string;
            encoding: string;
            createReadStream: () => ReadStream;
        }> = typeof file?.then === 'function' ? file : Promise.resolve(file);

        const { createReadStream } = await upload;
        const stream = createReadStream();

        const records: any[] = await this.parseCsv(stream, opts.encoding);
        const items: ImportProductsResultItem[] = [];
        let created = 0,
            updated = 0,
            skipped = 0,
            failed = 0;

        const defaultLang = (ctx.languageCode as LanguageCode) || LanguageCode.en;
        const dryRun = opts.dryRun ?? true;

        let row = 0;
        for (const rec of records) {
            row++;
            const base: Partial<ImportProductsResultItem> = {
                row,
                sku: (rec.sku ?? rec.SKU ?? rec.Sku)?.toString().trim(),
                productName: (rec.name ?? rec.productName ?? rec['product name'])?.toString().trim(),
                productSlug: (rec.slug ?? rec['product slug'])?.toString().trim(),
            };

            try {
                const sku = base.sku;
                const name = base.productName;
                if (!sku || !name) {
                    skipped++;
                    items.push({ ...base, status: 'skipped', message: 'Missing required fields: sku and name' } as ImportProductsResultItem);
                    continue;
                }

                const priceInputRaw = rec.price ?? rec['price (cent)'] ?? rec.Price;
                let price: number | undefined = undefined;
                if (priceInputRaw != null && priceInputRaw !== '') {
                    const p = Number(String(priceInputRaw).replace(/[\,\s]/g, ''));
                    if (!Number.isFinite(p)) throw new Error(`Invalid price: ${priceInputRaw}`);
                    price = Math.round(p);
                }

                // Optional listPrice for compare-at pricing; stored as custom field if configured
                let listPrice: number | undefined = undefined;
                {
                    const lpRaw = rec.listPrice ?? rec.ListPrice ?? rec['list price'] ?? rec['List Price'];
                    if (lpRaw != null && lpRaw !== '') {
                        const lp = Number(String(lpRaw).replace(/[\,\s]/g, ''));
                        if (!Number.isFinite(lp)) throw new Error(`Invalid listPrice: ${lpRaw}`);
                        listPrice = Math.round(lp);
                    }
                }

                // Tax category by name or id
                let taxCategoryId: ID | undefined;
                const taxName = (rec.taxCategory ?? rec.taxCategoryName ?? rec['tax name'])?.toString().trim();
                const taxId = (rec.taxCategoryId ?? rec['tax id'])?.toString().trim();
                if (taxId) {
                    taxCategoryId = taxId as unknown as ID;
                } else if (taxName) {
                    const tc = await this.taxCategoryService.findAll(ctx);
                    const match = tc.items.find((t: any) => t.name === taxName);
                    if (!match) throw new Error(`Tax category not found: ${taxName}`);
                    taxCategoryId = match.id;
                }

                // Collect preview extras from input row (listPrice already computed)
                const availableStock = rec.availableStock != null ? Number(rec.availableStock) : undefined;
                const description = (rec.description ?? rec.Description)?.toString();
                const productAssetsCol: string | undefined =
                    rec.assets || rec.Assets || rec['productAssets'] || rec['product assets'];
                const variantAssetsCol: string | undefined = rec.variantAssets || rec['variant assets'];
                const assetsList = productAssetsCol
                    ? String(productAssetsCol)
                          .split('|')
                          .map((u: string) => u.trim())
                          .filter(Boolean)
                    : [];
                const variantAssetsList = variantAssetsCol
                    ? String(variantAssetsCol)
                          .split('|')
                          .map((u: string) => u.trim())
                          .filter(Boolean)
                    : [];
                const collectionNameCol: string | undefined =
                    rec.collectionName || rec.collections || rec['collection name'] || rec['collections'];
                const collectionNames = collectionNameCol
                    ? String(collectionNameCol)
                          .split('|')
                          .map((n: string) => n.trim())
                          .filter(Boolean)
                    : [];

                if (dryRun) {
                    created++;
                    items.push({
                        ...base,
                        status: 'created',
                        message: 'Dry run (would create new product/variant)',
                        listPrice: listPrice ?? null,
                        availableStock: Number.isFinite(availableStock as any) ? Number(availableStock) : null,
                        description: description ?? null,
                        assets: assetsList.length ? assetsList : null,
                        variantAssets: variantAssetsList.length ? variantAssetsList : null,
                        collectionSlugs: collectionNames.length ? collectionNames.map(n => this.slugify(n)) : null,
                    } as ImportProductsResultItem);
                    continue;
                }

                // Find or create product by slug or name
                const slug = base.productSlug || this.slugify(name!);
                let productId: ID;
                const existing = await this.connection
                    .getRepository(ctx, Product)
                    .createQueryBuilder('product')
                    .leftJoinAndSelect('product.translations', 'translation')
                    .where('translation.slug = :slug', { slug })
                    .getOne();
                if (existing) {
                    productId = existing.id;
                } else {
                    const createdProduct = await this.productService.create(ctx, {
                        enabled: true,
                        translations: [{ languageCode: defaultLang, name: name!, slug }],
                    });
                    productId = createdProduct.id;
                }

                // Skip if a variant with this SKU already exists
                const existingVariant = await this.connection
                    .getRepository(ctx, ProductVariant)
                    .findOne({ where: { sku: sku! } });
                if (existingVariant) {
                    skipped++;
                    items.push({
                        ...base,
                        status: 'skipped',
                        message: `Variant with SKU ${sku} already exists`,
                        productId: (existingVariant as any).productId?.toString?.(),
                    } as ImportProductsResultItem);
                    continue;
                }

                // Create variant
                const createdVariants = await this.productVariantService.create(ctx, [
                    {
                        productId,
                        enabled: true,
                        sku: sku!,
                        taxCategoryId,
                        price,
                        translations: [{ languageCode: defaultLang, name: name! }],
                        // If your server has a custom field `listPrice` configured on ProductVariant,
                        // you can store it here. If not configured, Vendure may ignore or error.
                        ...(listPrice != null ? { customFields: { listPrice } as any } : {}),
                    },
                ]);
                const createdVariant = createdVariants[0];

                // Product assets from URLs (pipe-separated list in `assets` column)
                if (!dryRun && assetsList.length) {
                    const urls = assetsList;
                    if (urls.length > 0) {
                        const createdAssetIds: ID[] = [];
                        for (const url of urls) {
                            try {
                                const { stream, fileName } = await this.fetchUrlAsReadable(url);
                                const createRes = await this.assetService.createFromFileStream(stream as any, fileName, ctx);
                                const maybeId = (createRes as any)?.id;
                                if (maybeId) {
                                    createdAssetIds.push(maybeId as ID);
                                } else {
                                    const msg = (createRes as any)?.message || 'Unknown asset creation error';
                                    throw new Error(msg);
                                }
                            } catch (e) {
                                items.push({
                                    ...base,
                                    status: 'failed',
                                    message: `Asset import failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
                                } as ImportProductsResultItem);
                            }
                        }

                        if (createdAssetIds.length > 0) {
                            const productEntity = await this.productService.findOne(ctx, productId);
                            const existingAssets = productEntity
                                ? await this.assetService.getEntityAssets(ctx, productEntity)
                                : [];
                            const existingIds: ID[] = (existingAssets || []).map(a => a.id);
                            const mergedIds: ID[] = [...existingIds, ...createdAssetIds];
                            await this.productService.update(ctx, {
                                id: productId,
                                assetIds: mergedIds,
                                featuredAssetId: mergedIds[0],
                            });
                        }
                    }
                }

                // Variant assets from URLs in `variantAssets` column
                if (!dryRun && variantAssetsList.length) {
                    const urls = variantAssetsList;
                    if (urls.length > 0) {
                        const createdVariantAssetIds: ID[] = [];
                        for (const url of urls) {
                            try {
                                const { stream, fileName } = await this.fetchUrlAsReadable(url);
                                const createRes = await this.assetService.createFromFileStream(stream as any, fileName, ctx);
                                const maybeId = (createRes as any)?.id;
                                if (maybeId) {
                                    createdVariantAssetIds.push(maybeId as ID);
                                } else {
                                    const msg = (createRes as any)?.message || 'Unknown asset creation error';
                                    throw new Error(msg);
                                }
                            } catch (e) {
                                items.push({
                                    ...base,
                                    status: 'failed',
                                    message: `Variant asset import failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
                                } as ImportProductsResultItem);
                            }
                        }

                        if (createdVariantAssetIds.length > 0) {
                            await this.productVariantService.update(ctx, [
                                {
                                    id: createdVariant.id,
                                    assetIds: createdVariantAssetIds,
                                    featuredAssetId: createdVariantAssetIds[0],
                                },
                            ]);
                        }
                    }
                }

                // Assign to collections by name (pipe-separated in `collectionName`)
                if (!dryRun && collectionNames.length) {
                    const names = collectionNames;
                    if (names.length > 0) {
                        // Load all collections and match by translated name
                        const qb = this.connection
                            .getRepository(ctx, Collection)
                            .createQueryBuilder('collection')
                            .leftJoinAndSelect('collection.translations', 'translation');
                        const allCollections = await qb.getMany();
                        const matchedIds: ID[] = [];
                        for (const name of names) {
                            const match = allCollections.find(c => c.translations?.some(t => t.name === name));
                            if (match) {
                                matchedIds.push(match.id);
                            } else {
                                items.push({
                                    ...base,
                                    status: 'failed',
                                    message: `Collection not found: ${name}`,
                                } as ImportProductsResultItem);
                            }
                        }
                        if (matchedIds.length > 0) {
                            // Attach product to each collection
                            // Using TypeORM relation helper via TransactionalConnection
                            await this.connection
                                .getRepository(ctx, Product)
                                .createQueryBuilder()
                                .relation(Product, 'collections')
                                .of(productId)
                                .add(matchedIds as any);
                        }
                    }
                }

                created++;
                items.push({
                    ...base,
                    status: 'created',
                    productId: productId.toString(),
                    variantId: createdVariant.id.toString(),
                    listPrice: listPrice ?? null,
                    availableStock: Number.isFinite(availableStock as any) ? Number(availableStock) : null,
                    description: description ?? null,
                    assets: assetsList.length ? assetsList : null,
                    variantAssets: variantAssetsList.length ? variantAssetsList : null,
                    collectionSlugs: collectionNames.length ? collectionNames.map(n => this.slugify(n)) : null,
                } as ImportProductsResultItem);
            } catch (e: any) {
                failed++;
                items.push({ ...base, status: 'failed', message: e?.message ?? String(e) } as ImportProductsResultItem);
            }
        }

        return {
            items,
            summary: { total: records.length, created, updated, skipped, failed },
        };
    }

    /**
     * Import products using a Shopee API cURL capture. This method parses the cURL, replays it using fetch,
     * and maps the response items into the same creation flow as CSV rows. The expected response shape should
     * contain a list of products/variants with name/sku/price and optional images & collections.
     */
    async importFromShopeeCurl(
        ctx: RequestContext,
        curl: string,
        opts: { dryRun?: boolean },
    ): Promise<ImportProductsResult> {
        const request = this.parseCurl(curl);
        const res = await fetch(request.url, {
            method: request.method,
            headers: request.headers,
            body: request.body,
        });
        if (!res.ok) {
            throw new Error(`Shopee request failed: HTTP ${res.status}`);
        }
        const data = await res.json();

        // Map Shopee data -> records similar to CSV rows. This is intentionally generic; adjust mapping to your exact payload shape.
        const records: any[] = this.mapShopeePayloadToRows(data);

        // Reuse CSV pipeline by synthesizing a Readable from JSON rows encoded as CSV-like objects
        // Here, we just iterate records directly, applying the same internal logic as handleUpload uses.
        const items: ImportProductsResultItem[] = [];
        let created = 0,
            updated = 0,
            skipped = 0,
            failed = 0;

        let row = 0;
        for (const rec of records) {
            row++;
            const base: Partial<ImportProductsResultItem> = {
                row,
                sku: (rec.sku ?? rec.SKU ?? rec.Sku)?.toString().trim(),
                productName: (rec.name ?? rec.productName ?? rec['product name'])?.toString().trim(),
                productSlug: (rec.slug ?? rec['product slug'])?.toString().trim(),
            };
            try {
                const fileShim: any = null;
                // Reuse the inner logic by constructing a tiny parser-free branch
                const tmpCsvLike = [rec];
                const result = await this.processRecords(ctx, tmpCsvLike, { dryRun: opts.dryRun });
                // merge result counts & items
                created += result.summary.created;
                updated += result.summary.updated;
                skipped += result.summary.skipped;
                failed += result.summary.failed;
                items.push(...result.items.map(i => ({ ...i, row })));
            } catch (e: any) {
                failed++;
                items.push({ ...base, status: 'failed', message: e?.message ?? String(e) } as ImportProductsResultItem);
            }
        }

        return { items, summary: { total: records.length, created, updated, skipped, failed } };
    }

    private async processRecords(
        ctx: RequestContext,
        records: any[],
        opts: { dryRun?: boolean },
    ): Promise<ImportProductsResult> {
        // Factorized logic from handleUpload loop – reuse the same code path by simulating the loop
        const defaultLang = (ctx.languageCode as LanguageCode) || LanguageCode.en;
        const dryRun = opts.dryRun ?? true;
        const items: ImportProductsResultItem[] = [];
        let created = 0,
            updated = 0,
            skipped = 0,
            failed = 0;
        let row = 0;
        for (const rec of records) {
            row++;
            const base: Partial<ImportProductsResultItem> = {
                row,
                sku: (rec.sku ?? rec.SKU ?? rec.Sku)?.toString().trim(),
                productName: (rec.name ?? rec.productName ?? rec['product name'])?.toString().trim(),
                productSlug: (rec.slug ?? rec['product slug'])?.toString().trim(),
            };
            try {
                const sku = base.sku;
                const name = base.productName;
                if (!sku || !name) {
                    skipped++;
                    items.push({ ...base, status: 'skipped', message: 'Missing required fields: sku and name' } as ImportProductsResultItem);
                    continue;
                }

                const priceInputRaw = rec.price ?? rec['price (cent)'] ?? rec.Price;
                let price: number | undefined = undefined;
                if (priceInputRaw != null && priceInputRaw !== '') {
                    const p = Number(String(priceInputRaw).replace(/[\,\s]/g, ''));
                    if (!Number.isFinite(p)) throw new Error(`Invalid price: ${priceInputRaw}`);
                    price = Math.round(p);
                }

                // Optional listPrice for compare-at pricing; stored as custom field if configured
                const listPriceRaw = rec.listPrice ?? rec.ListPrice ?? rec['list price'] ?? rec['List Price'];
                let listPrice: number | undefined = undefined;
                if (listPriceRaw != null && listPriceRaw !== '') {
                    const lp = Number(String(listPriceRaw).replace(/[\,\s]/g, ''));
                    if (!Number.isFinite(lp)) throw new Error(`Invalid listPrice: ${listPriceRaw}`);
                    listPrice = Math.round(lp);
                }

                // Tax category by name or id
                let taxCategoryId: ID | undefined;
                const taxName = (rec.taxCategory ?? rec.taxCategoryName ?? rec['tax name'])?.toString().trim();
                const taxId = (rec.taxCategoryId ?? rec['tax id'])?.toString().trim();
                if (taxId) {
                    taxCategoryId = taxId as unknown as ID;
                } else if (taxName) {
                    const tc = await this.taxCategoryService.findAll(ctx);
                    const match = tc.items.find((t: any) => t.name === taxName);
                    if (!match) throw new Error(`Tax category not found: ${taxName}`);
                    taxCategoryId = match.id;
                }

                if (dryRun) {
                    created++;
                    const availableStock = rec.availableStock != null ? Number(rec.availableStock) : undefined;
                    const description = (rec.description ?? rec.Description)?.toString();
                    const productAssetsCol: string | undefined =
                        rec.assets || rec.Assets || rec['productAssets'] || rec['product assets'];
                    const variantAssetsCol: string | undefined = rec.variantAssets || rec['variant assets'];
                    const assetsList = productAssetsCol
                        ? String(productAssetsCol)
                              .split('|')
                              .map((u: string) => u.trim())
                              .filter(Boolean)
                        : [];
                    const variantAssetsList = variantAssetsCol
                        ? String(variantAssetsCol)
                              .split('|')
                              .map((u: string) => u.trim())
                              .filter(Boolean)
                        : [];
                    const collectionNameCol: string | undefined =
                        rec.collectionName || rec.collections || rec['collection name'] || rec['collections'];
                    const collectionNames = collectionNameCol
                        ? String(collectionNameCol)
                              .split('|')
                              .map((n: string) => n.trim())
                              .filter(Boolean)
                        : [];
                    items.push({
                        ...base,
                        status: 'created',
                        message: 'Dry run',
                        listPrice: listPrice ?? null,
                        availableStock: Number.isFinite(availableStock as any) ? Number(availableStock) : null,
                        description: description ?? null,
                        assets: assetsList.length ? assetsList : null,
                        variantAssets: variantAssetsList.length ? variantAssetsList : null,
                        collectionSlugs: collectionNames.length ? collectionNames.map(n => this.slugify(n)) : null,
                    } as ImportProductsResultItem);
                    continue;
                }

                const slug = base.productSlug || this.slugify(name!);
                let productId: ID;
                const existing = await this.connection
                    .getRepository(ctx, Product)
                    .createQueryBuilder('product')
                    .leftJoinAndSelect('product.translations', 'translation')
                    .where('translation.slug = :slug', { slug })
                    .getOne();
                if (existing) {
                    productId = existing.id;
                } else {
                    const createdProduct = await this.productService.create(ctx, {
                        enabled: true,
                        translations: [{ languageCode: defaultLang, name: name!, slug }],
                    });
                    productId = createdProduct.id;
                }

                const existingVariant = await this.connection
                    .getRepository(ctx, ProductVariant)
                    .findOne({ where: { sku: sku! } });
                if (existingVariant) {
                    skipped++;
                    items.push({ ...base, status: 'skipped', message: `Variant with SKU ${sku} already exists`, productId: (existingVariant as any).productId?.toString?.() } as ImportProductsResultItem);
                    continue;
                }

                const createdVariants = await this.productVariantService.create(ctx, [
                    {
                        productId,
                        enabled: true,
                        sku: sku!,
                        taxCategoryId,
                        price,
                        translations: [{ languageCode: defaultLang, name: name! }],
                        ...(listPrice != null ? { customFields: { listPrice } as any } : {}),
                    },
                ]);
                const createdVariant = createdVariants[0];

                // Product assets from URLs (pipe-separated list in `assets` column)
                const assetsCol: string | undefined =
                    rec.assets || rec.Assets || rec['productAssets'] || rec['product assets'];
                if (!dryRun && assetsCol) {
                    const urls = String(assetsCol)
                        .split('|')
                        .map((u: string) => u.trim())
                        .filter(Boolean);
                    if (urls.length > 0) {
                        const createdAssetIds: ID[] = [];
                        for (const url of urls) {
                            try {
                                const { stream, fileName } = await this.fetchUrlAsReadable(url);
                                const createRes = await this.assetService.createFromFileStream(stream as any, fileName, ctx);
                                const maybeId = (createRes as any)?.id;
                                if (maybeId) {
                                    createdAssetIds.push(maybeId as ID);
                                } else {
                                    const msg = (createRes as any)?.message || 'Unknown asset creation error';
                                    throw new Error(msg);
                                }
                            } catch (e) {
                                items.push({
                                    ...base,
                                    status: 'failed',
                                    message: `Asset import failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
                                } as ImportProductsResultItem);
                            }
                        }

                        if (createdAssetIds.length > 0) {
                            const productEntity = await this.productService.findOne(ctx, productId);
                            const existingAssets = productEntity
                                ? await this.assetService.getEntityAssets(ctx, productEntity)
                                : [];
                            const existingIds: ID[] = (existingAssets || []).map(a => a.id);
                            const mergedIds: ID[] = [...existingIds, ...createdAssetIds];
                            await this.productService.update(ctx, {
                                id: productId,
                                assetIds: mergedIds,
                                featuredAssetId: mergedIds[0],
                            });
                        }
                    }
                }

                // Variant assets from URLs in `variantAssets` column
                const variantAssetsCol: string | undefined = rec.variantAssets || rec['variant assets'];
                if (!dryRun && variantAssetsCol) {
                    const urls = String(variantAssetsCol)
                        .split('|')
                        .map((u: string) => u.trim())
                        .filter(Boolean);
                    if (urls.length > 0) {
                        const createdVariantAssetIds: ID[] = [];
                        for (const url of urls) {
                            try {
                                const { stream, fileName } = await this.fetchUrlAsReadable(url);
                                const createRes = await this.assetService.createFromFileStream(stream as any, fileName, ctx);
                                const maybeId = (createRes as any)?.id;
                                if (maybeId) {
                                    createdVariantAssetIds.push(maybeId as ID);
                                } else {
                                    const msg = (createRes as any)?.message || 'Unknown asset creation error';
                                    throw new Error(msg);
                                }
                            } catch (e) {
                                items.push({
                                    ...base,
                                    status: 'failed',
                                    message: `Variant asset import failed for ${url}: ${e instanceof Error ? e.message : String(e)}`,
                                } as ImportProductsResultItem);
                            }
                        }

                        if (createdVariantAssetIds.length > 0) {
                            await this.productVariantService.update(ctx, [
                                {
                                    id: createdVariant.id,
                                    assetIds: createdVariantAssetIds,
                                    featuredAssetId: createdVariantAssetIds[0],
                                },
                            ]);
                        }
                    }
                }

                // Assign to collections by name (pipe-separated in `collectionName`)
                const collectionNameCol: string | undefined =
                    rec.collectionName || rec.collections || rec['collection name'] || rec['collections'];
                if (!dryRun && collectionNameCol) {
                    const names = String(collectionNameCol)
                        .split('|')
                        .map((n: string) => n.trim())
                        .filter(Boolean);
                    if (names.length > 0) {
                        const qb = this.connection
                            .getRepository(ctx, Collection)
                            .createQueryBuilder('collection')
                            .leftJoinAndSelect('collection.translations', 'translation');
                        const allCollections = await qb.getMany();
                        const matchedIds: ID[] = [];
                        for (const name of names) {
                            const match = allCollections.find(c => c.translations?.some(t => t.name === name));
                            if (match) {
                                matchedIds.push(match.id);
                            } else {
                                items.push({
                                    ...base,
                                    status: 'failed',
                                    message: `Collection not found: ${name}`,
                                } as ImportProductsResultItem);
                            }
                        }
                        if (matchedIds.length > 0) {
                            await this.connection
                                .getRepository(ctx, Product)
                                .createQueryBuilder()
                                .relation(Product, 'collections')
                                .of(productId)
                                .add(matchedIds as any);
                        }
                    }
                }

                items.push({
                    ...base,
                    status: 'created',
                    productId: productId.toString(),
                    variantId: createdVariant.id.toString(),
                    listPrice: listPrice ?? null,
                } as ImportProductsResultItem);
                created++;
            } catch (e: any) {
                failed++;
                items.push({ ...base, status: 'failed', message: e?.message ?? String(e) } as ImportProductsResultItem);
            }
        }

        return { items, summary: { total: records.length, created, updated, skipped, failed } };
    }

    private parseCurl(curl: string): { url: string; method: string; headers: Record<string, string>; body?: string } {
        // Very basic cURL parser supporting: curl 'URL' -H 'Header: v' -H ... --data-raw '...'
        // For anything complex (multi-line, --compressed), we can extend.
        const urlMatch = curl.match(/curl\s+['"]([^'"]+)['"]/i);
        if (!urlMatch) throw new Error('Invalid cURL: URL not found');
        const url = urlMatch[1];
        const headers: Record<string, string> = {};
        const headerRe = /-H\s+['"]([^:'"]+):\s*([^'"]+)['"]/g;
        let hm: RegExpExecArray | null;
        while ((hm = headerRe.exec(curl)) !== null) {
            headers[hm[1]] = hm[2];
        }
        const bodyMatch = curl.match(/--data(?:-raw)?\s+['"]([\s\S]*?)['"]/);
        const method = bodyMatch ? 'POST' : (curl.includes('-X') ? (curl.match(/-X\s+(\w+)/)?.[1] ?? 'GET') : 'GET');
        const body = bodyMatch ? bodyMatch[1] : undefined;
        return { url, method, headers, body };
    }

    private mapShopeePayloadToRows(data: any): any[] {
        // This is a placeholder mapping. Adjust keys based on the actual Shopee response.
        // Expected to return array of rows with fields: name, sku, slug?, price, taxCategoryName?, assets?, variantAssets?, collectionName?
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        return items.map((it: any) => ({
            name: it.name || it.title,
            sku: it.sku || it.model_sku || it.code,
            price: it.price != null ? String(it.price) : undefined,
            slug: it.slug,
            assets: Array.isArray(it.images) ? it.images.join('|') : undefined,
            variantAssets: Array.isArray(it.variantImages) ? it.variantImages.join('|') : undefined,
            collectionName: Array.isArray(it.collections) ? it.collections.map((c: any) => c.name || c).join('|') : undefined,
            taxCategoryName: it.taxCategoryName,
            availableStock: it.availableStock ?? it.stock ?? it.available_stock ?? it.quantity,
            description: it.description ?? it.desc ?? it.details,
        }));
    }

    private parseCsv(stream: ReadStream, encoding?: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const records: any[] = [];
            const parser = parse({ columns: true, skip_empty_lines: true, encoding });
            stream
                .pipe(parser)
                .on('data', rec => records.push(rec))
                .on('end', () => resolve(records))
                .on('error', err => reject(err));
        });
    }

    private slugify(input: string): string {
        return input
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }

    private async fetchUrlAsReadable(url: string): Promise<{ stream: Readable; fileName: string }> {
        const res = await fetch(url);
        if (!res.ok || !res.body) {
            throw new Error(`HTTP ${res.status} fetching ${url}`);
        }
        let nodeStream: any;
        const body: any = res.body as any;
        if (typeof (Readable as any).fromWeb === 'function' && typeof body?.getReader === 'function') {
            nodeStream = (Readable as any).fromWeb(body);
        } else if (typeof (body as any).pipe === 'function') {
            nodeStream = body;
        } else {
            const buf = Buffer.from(await res.arrayBuffer());
            nodeStream = Readable.from(buf);
        }
        const fileName = this.deriveFileNameFromUrl(url);
        return { stream: nodeStream as Readable, fileName };
    }

    private deriveFileNameFromUrl(url: string): string {
        try {
            const u = new URL(url);
            const base = u.pathname.split('/').filter(Boolean).pop() || 'image';
            return base;
        } catch {
            return 'image';
        }
    }
}
