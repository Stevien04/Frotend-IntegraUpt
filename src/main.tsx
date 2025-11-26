// Fade-out del loader (tu antiguo index.js, pero colocado donde sí debe ir)
window.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("global-loader");
  if (!loader) return;

  setTimeout(() => {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 600);
  }, 400);
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
