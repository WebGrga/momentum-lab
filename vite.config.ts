import { defineConfig } from 'vite';

// base './' makes the built app load correctly from a file:// path inside Electron.
// The relative base lets the desktop build load assets from file:// URLs.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020'
  }
});
