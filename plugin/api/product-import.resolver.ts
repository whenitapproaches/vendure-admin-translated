import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';

import { ProductImportService } from '../service/product-import.service.js';

@Resolver()
export class ProductImportResolver {
    constructor(private service: ProductImportService) {}

    @Mutation()
    @Allow(Permission.CreateProduct, Permission.CreateCatalog)
    async importProductsFromCsv(
        @Ctx() ctx: RequestContext,
        @Args('file') file: any,
        @Args('encoding') encoding?: string,
        @Args('dryRun') dryRun?: boolean,
    ) {
        return this.service.handleUpload(ctx, file, { encoding, dryRun });
    }

    @Mutation()
    @Allow(Permission.CreateProduct, Permission.CreateCatalog)
    async importProductsFromShopee(
        @Ctx() ctx: RequestContext,
        @Args('curl') curl: string,
        @Args('dryRun') dryRun?: boolean,
    ) {
        return this.service.importFromShopeeCurl(ctx, curl, { dryRun });
    }
}
