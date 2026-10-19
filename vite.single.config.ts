// Build toàn bộ site thành MỘT file HTML (dist-single/index.html) để chia sẻ/mở offline.
// npm run build:single
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

process.env.VITE_HASH_ROUTER = '1';
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  define: { 'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('1') },
  build: { outDir: 'dist-single', chunkSizeWarningLimit: 2000 },
});
