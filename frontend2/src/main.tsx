import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { TimezoneProvider } from './contexts/TimezoneContext';
import { shellCss } from './shell/shellCss';

import './styles/globals.css';
import './styles/sort-header.css';
import './styles/task-modal.css';
// FlatPickr — date picker global. CSS importada uma vez aqui (estiliza
// `.flatpickr-calendar` em qualquer ponto da app). Locales são consumidos
// dentro do wrapper `lib/DatePicker.tsx` conforme `i18next.language`.
import 'flatpickr/dist/flatpickr.min.css';
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
            <TimezoneProvider>
              <App />
            </TimezoneProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
