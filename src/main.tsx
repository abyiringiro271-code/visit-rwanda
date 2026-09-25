import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { ThemeProvider } from './lib/theme';
import { LangProvider } from './lib/lang';
import { ConfigProvider } from './lib/config';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <ConfigProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfigProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
);