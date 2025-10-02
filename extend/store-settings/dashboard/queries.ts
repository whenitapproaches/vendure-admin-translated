import { graphql } from '@/vdb/graphql/graphql.js';

export const getStoreSettingsQuery = graphql(`
    query GetStoreSettings($id: ID!) {
        storeSetting(id: $id) {
            id
            key
            value
            createdAt
            updatedAt
        }
    }
`);

export const createStoreSettingsDocument = graphql(`
    mutation CreateStoreSettings($input: CreateStoreSettingsInput!) {
        createStoreSettings(input: $input) {
            id
        }
    }
`);

export const updateStoreSettingsDocument = graphql(`
    mutation UpdateStoreSettings($input: UpdateStoreSettingsInput!) {
        updateStoreSettings(input: $input) {
            id
        }
    }
`);


