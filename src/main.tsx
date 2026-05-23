import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import AppLogo from '@/assets/images/pixel_art_canvas_logo_1779526984383.png';

// Dynamically set the favicon
const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
link.type = 'image/png';
link.rel = 'shortcut icon';
link.href = AppLogo;
if (!document.querySelector("link[rel*='icon']")) {
  document.getElementsByTagName('head')[0].appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
