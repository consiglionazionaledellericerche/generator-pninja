import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

// Carica le variabili di ambiente dal file .env
dotenv.config();

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT || '5173'),
    proxy: {
      '/api': {
        target: `${process.env.PROTOCOL || 'http'}://${process.env.HOST || 'localhost'}:${process.env.PORT || '8000'}`,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
