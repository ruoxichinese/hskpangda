import { cleanReloadParam, reloadOnce } from './lib/staleReload';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// file của bản cũ không còn sau khi cập nhật → tải lại trang một lần
window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault(); });
cleanReloadParam();
