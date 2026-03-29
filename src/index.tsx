import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from 'react-query';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import logger from './utils/logger';

const queryClient = new QueryClient();

const renderApp = () => {
  logger.info('Rendering app...');
  const startTime = performance.now();

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  const endTime = performance.now();
  logger.info(`App render time: ${endTime - startTime}ms`);
};

renderApp();

// Log when the app is fully loaded
window.addEventListener('load', () => {
  logger.info('App fully loaded');
});