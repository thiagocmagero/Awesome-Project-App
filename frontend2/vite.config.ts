import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://awesome-project-app-backend:3000',
        changeOrigin: true,
        ws: true,
        cookieDomainRewrite: '',
      },
    },
  },
});
