import { graphql } from '@/vdb/graphql/graphql.js';

// For gql.tada to include in types if needed
export const importProductsFromCsvDocument = graphql(`
    mutation ImportProductsFromCsv($file: Upload!, $encoding: String, $dryRun: Boolean) {
        importProductsFromCsv(file: $file, encoding: $encoding, dryRun: $dryRun) {
            summary { total created updated skipped failed }
            items { row sku productName productSlug status message productId variantId }
        }
    }
`);
