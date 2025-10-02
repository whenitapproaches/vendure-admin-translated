import gql from 'graphql-tag';

export const storeSettingsAdminApiExtensions = gql`
    type StoreSettings {
        id: ID!
        key: String!
        value: String!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    input CreateStoreSettingsInput {
        key: String!
        value: String!
    }

    input UpdateStoreSettingsInput {
        id: ID!
        key: String
        value: String
    }

    input StoreSettingsListOptions {
        skip: Int
        take: Int
        sort: StoreSettingsSortParameter
        filter: StoreSettingsFilterParameter
    }

    input StoreSettingsSortParameter {
        id: SortOrder
        key: SortOrder
        value: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
    }

    input StoreSettingsFilterParameter {
        key: StringOperators
    }

    type StoreSettingsList {
        items: [StoreSettings!]!
        totalItems: Int!
    }

    extend type Query {
        storeSetting(id: ID!): StoreSettings!
        storeSettings(keys: [String!]!): [StoreSettings!]!
        allStoreSettings(options: StoreSettingsListOptions): StoreSettingsList!
    }

    extend type Mutation {
        createStoreSettings(input: CreateStoreSettingsInput!): StoreSettings!
        updateStoreSettings(input: UpdateStoreSettingsInput!): StoreSettings!
        deleteStoreSettings(id: ID!): Boolean!
    }
`;


