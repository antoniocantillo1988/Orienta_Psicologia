import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'], // <-- Esto evita el conflicto de useState
  },
  server: {
    // En desarrollo, redirige /api al backend si lo corres aparte
    // Si usas `vercel dev`, esto no hace falta.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});