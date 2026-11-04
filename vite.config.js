import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true, port: 5173 },
  preview: { host: true },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: { three: ['three'], gsap: ['gsap'] },
      },
    },
  },
});
