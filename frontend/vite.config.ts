import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'goober': path.resolve(__dirname, './src/vendor/goober.mjs'),
      'react-hot-toast': path.resolve(__dirname, './src/vendor/react-hot-toast.mjs'),
      'awesome-kanban': path.resolve(__dirname, './src/features/awesome-kanban'),
    },
  },
  server: {
    host: true, // permitir acesso via IP da LAN (ex: 192.168.x.x)
    proxy: {
      '/api': {
        // Backend container name on the Docker network
        target: 'http://awesome-project-app-backend:3000',
        changeOrigin: true,
        // Defensivo: se o backend enviar Domain no Set-Cookie, removê-lo para que
        // o cookie seja host-only no browser (importante para acesso via IP da LAN).
        cookieDomainRewrite: '',
      },
    },
  },
});
