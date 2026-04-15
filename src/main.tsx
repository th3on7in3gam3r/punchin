import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA Service Worker registration
// const updateServiceWorker = registerSW({
//   onNeedRefresh() {
//     if (confirm('New version available. Update now?')) {
//       updateServiceWorker?.();
//     }
//   },
//   onOfflineReady() {
//     console.log('PWA: App is ready to work offline.');
//   },
// });
