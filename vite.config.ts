import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    root: 'web',
    plugins: [react()],
    // The station server serves the built files from its own origin.
    base: './',
    build: { outDir: 'dist', emptyOutDir: true },
    // `pnpm dev:web` gives hot reload against a running `pnpm dev` server.
    server: {
        proxy: {
            '/ws': { target: 'ws://127.0.0.1:8666', ws: true },
            '/manifest.json': 'http://127.0.0.1:8666',
        },
    },
});
