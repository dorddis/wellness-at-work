import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@lumina/ui/globals.css';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  // Note: StrictMode removed because it causes double-execution of effects,
  // which breaks async operations like PowerShell detection and camera acquisition
  root.render(<App />);
}
