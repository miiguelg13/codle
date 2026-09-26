import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 3000 },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
