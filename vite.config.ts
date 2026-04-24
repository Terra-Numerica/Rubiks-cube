import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Rubiks-cube/', 
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});