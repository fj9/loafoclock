import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    // Relative base keeps the build working at any GitHub Pages repo path.
    base: './',
    plugins: [
        VitePWA({
            registerType: 'prompt', // the app asks the user to reload when a new version is cached
            includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
            manifest: {
                name: 'Sourdough Companion',
                short_name: 'Sourdough',
                description: 'Step-by-step sourdough baking guide with timers, calculators and a bake log.',
                theme_color: '#667eea',
                background_color: '#667eea',
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
