import React from 'react';
import { createRoot } from 'react-dom/client';
import SplashScreen from './SplashScreen';

// Import CSS files
import './SplashScreen.css';
import './components/PianoProgressBar.css';

// Declare global to avoid TypeScript errors
declare global {
  interface Window {
    require: any;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<SplashScreen />);
} else {
  console.error('Root element not found');
}