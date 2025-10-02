# Banner Plugin

A Vendure plugin that adds banner management functionality with support for different banner types (startup, hero, discount) and a complete dashboard interface for managing banners.

## Features

- **Banner Entity**: Complete banner management with ID, name, type, and image asset
- **Three Banner Types**: Predefined types (startup, hero, discount)
- **Image Asset Integration**: Full integration with Vendure's asset system
- **Dashboard UI**: Complete admin interface for banner management
- **GraphQL API**: Both admin and shop API endpoints
- **CRUD Operations**: Create, read, update, and delete banners

## Installation

1. Add the plugin to your `vendure-config.ts`:

```typescript
import { BannerPlugin } from './plugins/banner'

export const config: VendureConfig = {
  // ... other config
  plugins: [
    // ... other plugins
    BannerPlugin.init({
      enabled: true,
    }),
  ],
}
```

## Banner Types

The plugin supports three predefined banner types:

- **STARTUP**: For startup/landing page banners
- **HERO**: For hero section banners
- **DISCOUNT**: For discount/promotional banners

## API

### Admin API

#### Queries

```graphql
# Get all banners with pagination and filtering
query GetBanners($options: BannerListOptions) {
  banners(options: $options) {
    items {
      id
      name
      type
      imageAsset {
        id
        name
        source
        preview
      }
      createdAt
      updatedAt
    }
    totalItems
  }
}

# Get a specific banner
query GetBanner($id: ID!) {
  banner(id: $id) {
    id
    name
    type
    imageAsset {
      id
      name
      source
      preview
    }
    createdAt
    updatedAt
  }
}

# Get banners by type
query GetBannersByType($type: BannerType!) {
  bannersByType(type: $type) {
    id
    name
    type
    imageAsset {
      id
      name
      source
      preview
    }
  }
}
```

#### Mutations

```graphql
# Create a new banner
mutation CreateBanner($input: CreateBannerInput!) {
  createBanner(input: $input) {
    id
    name
    type
    imageAsset {
      id
      name
      source
      preview
    }
  }
}

# Update an existing banner
mutation UpdateBanner($input: UpdateBannerInput!) {
  updateBanner(input: $input) {
    id
    name
    type
    imageAsset {
      id
      name
      source
      preview
    }
  }
}

# Delete a banner
mutation DeleteBanner($id: ID!) {
  deleteBanner(id: $id)
}
```

### Shop API

The shop API provides read-only access to banners for public consumption:

```graphql
# Get all banners (public)
query GetBanners {
  banners {
    id
    name
    type
    imageAsset {
      id
      name
      source
      preview
    }
  }
}

# Get banners by type (public)
query GetBannersByType($type: BannerType!) {
  bannersByType(type: $type) {
    id
    name
    type
    imageAsset {
      id
      name
      source
      preview
    }
  }
}
```

## Dashboard

The plugin includes a complete dashboard interface accessible at `/banners` in the admin panel:

### Features

- **Banner List**: View all banners with image previews, names, types, and creation dates
- **Create Banner**: Modal form to create new banners with name, type, and image selection
- **Edit Banner**: Detailed page to edit existing banners
- **Delete Banner**: Confirmation dialog to delete banners
- **Type Filtering**: Visual badges to distinguish banner types
- **Asset Integration**: Full integration with Vendure's asset picker

### Navigation

- **Banners List**: `/banners` - Main banner management page
- **Banner Detail**: `/banners/:id` - Individual banner editing page

## Database Schema

The plugin creates a `Banner` entity with the following structure:

```sql
CREATE TABLE banner (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('startup', 'hero', 'discount')),
  imageAssetId INTEGER NOT NULL REFERENCES asset(id),
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW()
);
```

## Configuration Options

### PluginInitOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Whether the banner plugin is enabled |

## Usage Examples

### Creating a Banner

```typescript
const banner = await adminClient.mutate(CREATE_BANNER, {
  input: {
    name: 'Summer Sale Banner',
    type: 'DISCOUNT',
    imageAssetId: '1',
  },
})
```

### Fetching Banners by Type

```typescript
const heroBanners = await shopClient.query(GET_BANNERS_BY_TYPE, {
  type: 'HERO',
})
```

### Using in Frontend

```typescript
// Fetch all hero banners for display
const { data } = useQuery(GET_BANNERS_BY_TYPE, {
  variables: { type: 'HERO' },
})

return (
  <div>
    {data?.bannersByType.map(banner => (
      <img 
        key={banner.id}
        src={banner.imageAsset.preview} 
        alt={banner.name}
      />
    ))}
  </div>
)
```

## Permissions

The plugin uses the following Vendure permissions:

- **Admin API**: `ReadCatalog`, `CreateCatalog`, `UpdateCatalog`, `DeleteCatalog`
- **Shop API**: `Public` (read-only access)

## Compatibility

- **Vendure Version**: ^3.0.0
- **Node.js**: >= 16.0.0
- **TypeScript**: >= 4.5.0

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## License

This plugin is part of the Cake Store project and follows the same licensing terms.
