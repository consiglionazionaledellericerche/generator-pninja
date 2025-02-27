import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ReactKeycloakProvider } from '@react-keycloak/web';
import { SimpleLoader } from './components/SimpleLoader.tsx';
import keycloak from './keycloak.tsx';
import './index.css';
import App from './App.tsx';
import './i18n';

createRoot(document.getElementById('root')!).render(
  <ReactKeycloakProvider
    authClient={keycloak}
    initOptions={{
      // onLoad: 'check-sso', // 'login-required'/
      checkLoginIframe: false
    }}
  >
    <StrictMode>
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="w-[100vw] h-[100vh] flex items-center justify-center">
              <SimpleLoader loading={true} />
            </div>
          }
        >
          <App />
        </Suspense>
      </BrowserRouter>
    </StrictMode>
  </ReactKeycloakProvider>
);
