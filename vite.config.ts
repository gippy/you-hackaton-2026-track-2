import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
    root: 'web',
    // The JS and CSS are inlined into index.html, so behind Apify Standby (?token=, no cookie) the page itself
    // needs no extra requests. Images, sounds and the area map stay separate files that the page loads with the token.
    plugins: [react(), viteSingleFile()],
    // The station server serves the built files from its own origin.
    base: './',
    build: { outDir: 'dist', emptyOutDir: true },
    // `pnpm dev:web` gives hot reload against a running `pnpm dev` server.
    server: {
        proxy: {
            '/ws': { target: 'ws://127.0.0.1:8666', ws: true },
            '/manifest.json': 'http://127.0.0.1:8666',
            '/art': 'http://127.0.0.1:8666',
            '/data': 'http://127.0.0.1:8666',
            '/speech': 'http://127.0.0.1:8666',
        },
    },
});
