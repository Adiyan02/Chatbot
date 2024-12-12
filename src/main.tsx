import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App 
      companys={[
        { name: 'Strassenflitzer GmbH', id: '66ed4b6d5e6e41e43a61ca3f' }, 
        { name: 'AHA-Drive GmbH', id: '66d1a42f741e5c3e9aba591c' }
      ]}
      user={{ name: 'Alaaddin Sagun', lang: 'de', id: '1'}}
      position="bottom-right"
      isDriver={false}
      allowFileUpload={false}
      allowCamera={false}
    />
  </StrictMode>
);
