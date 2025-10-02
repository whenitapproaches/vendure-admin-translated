import path from 'path';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vitest/config';
import { vendureDashboardPlugin } from './vite/vite-plugin-vendure-dashboard.js';

/**
 * This config is used for running tests
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        exclude: ['./plugin/**/*', '**/node_modules/**/*'],
    },
    plugins: [
        vendureDashboardPlugin({
            vendureConfigPath: pathToFileURL('./sample-vendure-config.ts'),
            api: { host: 'http://localhost:3000', port: 'auto' },
            gqlOutputPath: path.resolve(__dirname, './src/lib/graphql/'),
            tempCompilationDir: path.resolve(__dirname, './.temp'),
        }) as any,
    ],
});
