import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { register as registerServiceWorker } from './ServiceWorkerRegistration';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline support
registerServiceWorker();
