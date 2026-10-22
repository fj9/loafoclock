import { readFileSync } from 'node:fs';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(version) }, // shown on the About page
    // Relative base keeps the build working at any GitHub Pages repo path.
    base: './',
    plugins: [
        preact(),
        VitePWA({
            registerType: 'prompt', // the app asks the user to reload when a new version is cached
            workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] }, // include the bundled heading font
            includeAssets: ['favicon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
            manifest: {
                name: "Loaf O'Clock",
                short_name: "Loaf O'Clock",
                description: 'A free sourdough planner that shows how feed, temperature and the fridge move your bake, so you can fit it around your day.',
                theme_color: '#9A4A22',
                background_color: '#FBF5EA',
                display: 'standalone',
                start_url: '.',
                icons: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            }
        })
    ],
    test: {
        include: ['src/**/*.test.{ts,tsx}'],
        environment: 'node', // component tests opt in with `// @vitest-environment jsdom`
        testTimeout: 30_000 // the planner searches take about 2 seconds alone, and longer on a busy machine
    }
});
