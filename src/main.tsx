import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';

// Aplica dark mode antes do primeiro render para evitar flash.
try {
  const raw = localStorage.getItem('shopee-gestao-store');
  if (raw) {
    const state = JSON.parse(raw);
    if (state?.state?.darkMode === true) {
      document.documentElement.classList.add('dark');
    }
  }
} catch {
  /* modo offline ou localStorage bloqueado */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
