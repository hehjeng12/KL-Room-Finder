import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the C# API runs on :5080; `npm run build` writes straight into its wwwroot
// so the API serves the finished site in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:5080' },
  },
  build: {
    outDir: '../server/RoomRental.Api/wwwroot',
    emptyOutDir: true,
  },
});
