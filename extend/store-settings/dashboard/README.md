# Store Settings Dashboard Extension

This dashboard extension provides a user-friendly interface for managing store settings in the Vendure admin dashboard.

## Features

- **List View**: Display all store settings in a data table with sorting and filtering
- **Create Settings**: Add new store settings through a modal form
- **Edit Settings**: Update existing settings with inline editing
- **Delete Settings**: Remove settings with confirmation
- **Detail View**: View individual setting details with metadata
- **Form Validation**: Client-side validation for key and value fields
- **Real-time Updates**: Automatic refresh after CRUD operations

## Navigation

The extension adds a new navigation section called "Store Settings" with:
- **Settings**: Main list page for managing all settings

## Pages

### Store Settings List Page (`/extensions/store-settings`)

- **Data Table**: Shows all settings with columns for key, value, created date, updated date, and actions
- **Add Button**: Opens a modal dialog to create new settings
- **Edit Actions**: Inline edit buttons for each setting
- **Delete Actions**: Delete buttons with confirmation
- **Responsive Design**: Works on desktop and mobile devices

### Store Settings Detail Page (`/extensions/store-settings/:id`)

- **Setting Details**: Shows the key and value of the selected setting
- **Metadata**: Displays creation date, last updated date, and ID
- **Edit Form**: Inline editing capability
- **Back Navigation**: Return to the list view

## Form Components

### StoreSettingsForm

A reusable form component that handles both creation and editing:

- **Key Field**: Text input with validation (letters, numbers, underscores, hyphens only)
- **Value Field**: Textarea for multi-line values
- **Validation**: Required fields and pattern matching
- **Loading States**: Shows loading indicators during operations
- **Error Handling**: Displays error messages for failed operations

## API Integration

The dashboard uses the following GraphQL operations:

- `getAllStoreSettings` - Fetch all settings for the list view
- `getStoreSettings` - Fetch specific settings by keys
- `createStoreSettings` - Create new settings
- `updateStoreSettings` - Update existing settings
- `deleteStoreSettings` - Delete settings

## Styling

The extension uses the Vendure dashboard's design system:
- **Shadcn Components**: Consistent UI components
- **Tailwind CSS**: Utility-first styling
- **Lucide Icons**: Modern icon set
- **Responsive Design**: Mobile-friendly layout

## Error Handling

- **Toast Notifications**: Success and error messages
- **Form Validation**: Client-side validation with helpful error messages
- **Loading States**: Visual feedback during operations
- **Confirmation Dialogs**: Safe deletion with confirmation

## Usage

1. Navigate to the "Store Settings" section in the admin dashboard
2. Use the "Add Setting" button to create new settings
3. Click the edit button to modify existing settings
4. Use the delete button to remove settings (with confirmation)
5. Click on a setting row to view detailed information

## Development

The extension follows the [Vendure dashboard extension guidelines](https://docs.vendure.io/guides/extending-the-dashboard/extending-overview/) and uses:

- **React**: Modern React with hooks
- **TanStack Query**: Data fetching and caching
- **React Hook Form**: Form handling and validation
- **TypeScript**: Type safety throughout
