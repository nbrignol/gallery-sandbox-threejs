import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // Deux pages : la galerie et les cartes
    rollupOptions: {
      input: { main: 'index.html', cartes: 'cartes.html' },
    },
  },
});
