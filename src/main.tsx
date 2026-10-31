import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// O app não usa mais service worker (PWA removido): limpa restos de versões antigas neste aparelho.
try {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
  }
} catch {}

createRoot(document.getElementById('root')!).render(<App />);
