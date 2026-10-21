// Build toàn bộ site thành MỘT file HTML (dist-single/index.html) để chia sẻ/mở offline.
// npm run build:single
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// bản demo không có máy chủ: mã này mở được đề thi có khoá để xem thử (chỉ có trong bản demo 1 file)
process.env.VITE_EXAM_DEMO_CODE = 'DEMO01';

process.env.VITE_HASH_ROUTER = '1';
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  resolve: { alias: [{ find: '../lib/examAudio', replacement: path.resolve(__dirname, 'src/lib/examAudio.demo.ts') }] },
  define: { 'import.meta.env.VITE_HASH_ROUTER': JSON.stringify('1') },
  build: { outDir: 'dist-single', chunkSizeWarningLimit: 2000 },
});
