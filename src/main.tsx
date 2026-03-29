import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import logger, { setLogLevel } from './utils/logger';

// Set the log level (you can adjust this based on your environment)
setLogLevel('INFO');

logger.info('Application initialization started');

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

logger.info('Application rendered');
logger.info('Application initialization completed');