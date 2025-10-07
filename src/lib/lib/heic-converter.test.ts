import { isHeicFile, processFilesWithHeicConversion } from '../heic-converter.js';

describe('HEIC Converter', () => {
    describe('isHeicFile', () => {
        it('should detect HEIC files by MIME type', () => {
            const heicFile = new File([''], 'test.heic', { type: 'image/heic' });
            const heifFile = new File([''], 'test.heif', { type: 'image/heif' });
            const jpegFile = new File([''], 'test.jpg', { type: 'image/jpeg' });

            expect(isHeicFile(heicFile)).toBe(true);
            expect(isHeicFile(heifFile)).toBe(true);
            expect(isHeicFile(jpegFile)).toBe(false);
        });

        it('should detect HEIC files by extension when MIME type is missing', () => {
            const heicFile = new File([''], 'test.HEIC', { type: 'application/octet-stream' });
            const heifFile = new File([''], 'test.heif', { type: '' });
            const jpegFile = new File([''], 'test.jpg', { type: '' });

            expect(isHeicFile(heicFile)).toBe(true);
            expect(isHeicFile(heifFile)).toBe(true);
            expect(isHeicFile(jpegFile)).toBe(false);
        });
    });

    describe('processFilesWithHeicConversion', () => {
        it('should pass through non-HEIC files unchanged', async () => {
            const jpegFile = new File(['jpeg data'], 'test.jpg', { type: 'image/jpeg' });
            const pngFile = new File(['png data'], 'test.png', { type: 'image/png' });
            const files = [jpegFile, pngFile];

            const result = await processFilesWithHeicConversion(files);

            expect(result.processedFiles).toHaveLength(2);
            expect(result.processedFiles[0]).toBe(jpegFile);
            expect(result.processedFiles[1]).toBe(pngFile);
            expect(result.conversions).toHaveLength(0);
            expect(result.errors).toHaveLength(0);
        });

        // Note: Testing actual HEIC conversion would require real HEIC files and a browser environment
        // These tests would be better suited for integration/e2e testing
    });
});