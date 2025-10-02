import { defineConfig } from '@lingui/cli';

export default defineConfig({
    sourceLocale: 'vi',
    locales: ['de', 'en', 'vi'],
    catalogs: [
        {
            path: '<rootDir>/src/i18n/locales/{locale}',
            include: ['<rootDir>'],
        },
    ],
});
