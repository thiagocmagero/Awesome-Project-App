import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { shellCss } from './shell/shellCss';

import './styles/globals.css';
import './styles/sort-header.css';
// i18next setup (side-effect: regista LocalStorageBackend, LanguageDetector,
// initReactI18next e carrega namespaces). Tem que correr antes de qualquer
// componente que use `useTranslation()`.
import './i18n';

function injectComponentCss() {
  if (document.getElementById('awp-shell-css')) return;
  const styleEl = document.createElement('style');
  styleEl.id = 'awp-shell-css';
  styleEl.textContent = shellCss;
  document.head.appendChild(styleEl);
}
injectComponentCss();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
