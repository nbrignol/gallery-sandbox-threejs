import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // Pages : la galerie, les cartes et les deux variantes de grille CSS
    rollupOptions: {
      input: {
        main: 'index.html',
        cartes: 'cartes.html',
        'grid-css-01': 'grid-css-01.html',
        'grid-css-02': 'grid-css-02.html',
      },
    },
  },
});
