import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vercel forwards same-origin API requests to Railway through vercel.json.
  define: process.env.VERCEL === '1'
    ? { 'import.meta.env.VITE_API_URL': JSON.stringify('/api') }
    : undefined,
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
});
