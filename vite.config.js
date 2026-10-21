import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(version) }, // shown on the About page
    // Relative base keeps the build working at any GitHub Pages repo path.
    base: './',
    plugins: [
        VitePWA({
            registerType: 'prompt', // the app asks the user to reload when a new version is cached
            workbox: { globPatterns: ['**/*.{js,css,html,woff2}'] }, // include the bundled heading font
            includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
            manifest: {
                name: "Loaf O'Clock",
                short_name: "Loaf O'Clock",
                description: 'A free sourdough planner that tells you what to do, and when.',
                theme_color: '#9E3326',
                background_color: '#FBF5E9',
                display: 'standalone',
                start_url: '.',
                icons: [
                    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                ]
            }
        })
    ]
});
