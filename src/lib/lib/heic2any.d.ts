declare module 'heic2any' {
    interface HeicConvertOptions {
        blob: Blob;
        toType: 'image/png' | 'image/jpeg';
        quality?: number;
    }

    function heic2any(options: HeicConvertOptions): Promise<Blob | Blob[]>;
    
    export default heic2any;
}