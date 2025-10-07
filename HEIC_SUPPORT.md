# HEIC File Support

This implementation adds automatic HEIC (High Efficiency Image Container) file conversion support to the Vendure Dashboard asset upload system.

## Features

- **Automatic Detection**: Automatically detects HEIC/HEIF files by MIME type and file extension
- **Seamless Conversion**: Converts HEIC files to PNG format before upload
- **User Feedback**: Shows loading indicators and toast notifications during conversion
- **Error Handling**: Gracefully handles conversion failures with user-friendly error messages
- **Drag & Drop Support**: Works with both drag & drop and file picker uploads

## How It Works

1. When files are uploaded (via drag & drop or file picker):
   - The system checks if any files are HEIC format
   - HEIC files are automatically converted to PNG format
   - Non-HEIC files are uploaded directly without conversion

2. During conversion:
   - A loading overlay appears with "Converting HEIC files..." message
   - Toast notifications inform users of successful conversions
   - Error notifications are shown if conversion fails

3. After conversion:
   - Converted files have `.png` extension
   - Original HEIC filename is preserved (e.g., `photo.heic` becomes `photo.png`)
   - Files are uploaded to the asset library as normal

## Technical Implementation

### Files Modified

- `src/lib/lib/heic-converter.ts` - Core conversion utilities
- `src/lib/lib/heic2any.d.ts` - Type definitions for heic2any library
- `src/lib/components/shared/asset/asset-gallery.tsx` - Updated upload logic
- `package.json` - Added heic2any dependency

### Key Functions

- `isHeicFile(file: File)` - Detects HEIC files
- `convertHeicFile(file: File, options?)` - Converts a single HEIC file
- `processFilesWithHeicConversion(files: File[])` - Processes file arrays with conversion

### Configuration Options

The conversion can be configured with these options:

```typescript
{
    format: 'image/png' | 'image/jpeg',  // Output format (default: 'image/png')
    quality: number,                      // JPEG quality 0-1 (default: 0.9)
    convertAll: boolean                   // Convert all or just HEIC (default: false)
}
```

## Browser Compatibility

- Works in modern browsers that support the File API
- Requires JavaScript to be enabled
- HEIC conversion happens client-side using the heic2any library

## Error Handling

- Conversion errors are logged to console and shown to user via toast
- Failed conversions don't prevent other files from uploading
- Original HEIC files are not uploaded if conversion fails (for safety)

## Performance Considerations

- HEIC conversion happens in-browser and may take a few seconds for large files
- Multiple HEIC files are processed sequentially to avoid memory issues
- Loading indicators keep users informed during longer conversions

## Future Enhancements

Potential improvements that could be added:

1. **Batch Conversion**: Process multiple HEIC files in parallel
2. **Progress Indicators**: Show conversion progress for large files
3. **Format Selection**: Allow users to choose PNG vs JPEG output
4. **Quality Settings**: User-configurable quality settings for JPEG output
5. **Server-side Conversion**: Optional server-side conversion for better performance