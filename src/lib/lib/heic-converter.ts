import heic2any from 'heic2any';

/**
 * Configuration options for HEIC conversion
 */
export interface HeicConversionOptions {
    /**
     * Output format for converted images
     * @default 'image/png'
     */
    format?: 'image/png' | 'image/jpeg';
    /**
     * Quality for JPEG output (0-1)
     * @default 0.9
     */
    quality?: number;
    /**
     * Whether to convert all images in the array or just HEIC files
     * @default false (only convert HEIC files)
     */
    convertAll?: boolean;
}

/**
 * Checks if a file is a HEIC/HEIF image
 */
export function isHeicFile(file: File): boolean {
    const heicMimeTypes = ['image/heic', 'image/heif'];
    const heicExtensions = ['.heic', '.heif'];
    
    // Check MIME type first
    if (heicMimeTypes.includes(file.type.toLowerCase())) {
        return true;
    }
    
    // Check file extension as fallback (some browsers don't set MIME type correctly)
    const fileName = file.name.toLowerCase();
    return heicExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * Converts a HEIC file to PNG or JPEG
 */
export async function convertHeicFile(
    file: File,
    options: HeicConversionOptions = {}
): Promise<File> {
    const {
        format = 'image/png',
        quality = 0.9,
    } = options;

    try {
        // Convert the HEIC file
        const convertedBlob = await heic2any({
            blob: file,
            toType: format,
            quality: format === 'image/jpeg' ? quality : undefined,
        });

        // heic2any can return a Blob or Blob[], we need to handle both cases
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        
        // Create a new File from the converted blob
        const extension = format === 'image/jpeg' ? '.jpg' : '.png';
        const originalName = file.name.replace(/\.(heic|heif)$/i, '');
        const newFileName = `${originalName}${extension}`;
        
        return new File([blob], newFileName, {
            type: format,
            lastModified: file.lastModified,
        });
    } catch (error) {
        console.error('Failed to convert HEIC file:', error);
        throw new Error(`Failed to convert HEIC file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Processes an array of files, converting any HEIC files to the specified format
 */
export async function processFilesWithHeicConversion(
    files: File[],
    options: HeicConversionOptions = {}
): Promise<{ 
    processedFiles: File[];
    conversions: Array<{ original: string; converted: string }>;
    errors: Array<{ file: string; error: string }>;
}> {
    const processedFiles: File[] = [];
    const conversions: Array<{ original: string; converted: string }> = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
        try {
            if (isHeicFile(file)) {
                console.log(`Converting HEIC file: ${file.name}`);
                const convertedFile = await convertHeicFile(file, options);
                processedFiles.push(convertedFile);
                conversions.push({
                    original: file.name,
                    converted: convertedFile.name
                });
            } else {
                // Keep non-HEIC files as-is
                processedFiles.push(file);
            }
        } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            errors.push({
                file: file.name,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            
            // If conversion fails, we can optionally still include the original file
            // or skip it entirely. For now, let's skip failed conversions.
        }
    }

    return {
        processedFiles,
        conversions,
        errors
    };
}

/**
 * Creates a user-friendly message about HEIC conversions
 */
export function createConversionMessage(
    conversions: Array<{ original: string; converted: string }>,
    errors: Array<{ file: string; error: string }>
): string {
    const messages: string[] = [];
    
    if (conversions.length > 0) {
        if (conversions.length === 1) {
            messages.push(`Converted ${conversions[0].original} to ${conversions[0].converted}`);
        } else {
            messages.push(`Converted ${conversions.length} HEIC files to ${conversions[0].converted.endsWith('.png') ? 'PNG' : 'JPEG'} format`);
        }
    }
    
    if (errors.length > 0) {
        if (errors.length === 1) {
            messages.push(`Failed to convert ${errors[0].file}: ${errors[0].error}`);
        } else {
            messages.push(`Failed to convert ${errors.length} files`);
        }
    }
    
    return messages.join('. ');
}