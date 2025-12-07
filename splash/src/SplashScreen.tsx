import React, { useState, useEffect } from 'react';
import { KeyboardProgressBar } from './components/react-piano-keyboard';

interface SplashScreenProps {}

const SplashScreen: React.FC<SplashScreenProps> = () => {
  const [logoPath, setLogoPath] = useState<string>('');
  const [title, setTitle] = useState<string>('Loading...');
  const [status, setStatus] = useState<string>('Initializing...');
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // Listen for Electron IPC messages
    if (window.require) {
      const { ipcRenderer } = window.require('electron');

      ipcRenderer.on('update-logo', (event: any, imagePath: string) => {
        setLogoPath(imagePath);
      });

      ipcRenderer.on('update-title', (event: any, message: string) => {
        setTitle(message);
      });

      ipcRenderer.on('update-status', (event: any, message: string) => {
        setStatus(message);
      });

      ipcRenderer.on('update-progress', (event: any, progressValue: number) => {
        setProgress(progressValue);
      });

      // Signal to main process that the renderer is ready
      ipcRenderer.send('splash-ready');

      // Cleanup
      return () => {
        ipcRenderer.removeAllListeners('update-logo');
        ipcRenderer.removeAllListeners('update-title');
        ipcRenderer.removeAllListeners('update-status');
        ipcRenderer.removeAllListeners('update-progress');
      };
    }
  }, []);

  return (
    <div className="splash-container">
      <div className="splash-content">
        <div className="logo-section">
          {logoPath && <img src={logoPath} alt="Depinus Logo" className="logo" />}
        </div>
        
        <div className="title-section">
          <h1 className="title">{title}</h1>
        </div>
        
        <div className="progress-section">
          <div className="progress-bar-container">
            <KeyboardProgressBar
              value={progress}
              max={100}
              from={48}
              to={72}
              color="#4CAF50"
              showPercentage={true}
              style={{
                width: '400px',
                height: '60px',
              }}
            />
          </div>
          <p className="status">{status}</p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;