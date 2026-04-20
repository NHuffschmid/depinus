import React, { useRef, useState, useEffect } from "react";
import './i18n';
import { Keyboard, type KeyboardRef } from "./components/react-piano-keyboard/src";
import { computeAvgSkrjabinColor } from "./utils/skrjabin";
import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import Archive from "./Pages/Archive";
import Playlist from "./Pages/Playlist";
import Settings from "./Pages/Settings";
import About from "./Pages/About";
import Score from "./Pages/Score";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import ProgressBar from "./components/ProgressBar";
import CircleOfFifths from './components/CircleOfFifths';
import Overlay from "./components/Overlay";
import WaitingIndicator from './components/WaitingIndicator';
import { useCookies } from 'react-cookie';
import { useTranslation } from "react-i18next";
import useDepinusWebSocket from './custom-hooks/useDepinusWebsocket';
import { backendUrl } from './config';
import { PlaylistProvider } from './components/playlist/PlaylistContext';

function App(): JSX.Element {
  const [cookies, setCookie] = useCookies(['color', 'skrjabinMode']);
  if (!cookies.color) {
    setCookie('color', '#DC143C', { path: '/' });
  }

  const [isActive, setIsActive] = useState<boolean>(false);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [bgColor, setBgColor] = useState<string>("#444");
  const pressedNotesRef = React.useRef<Set<number>>(new Set());
  const { t } = useTranslation();
  const keyboardRef = useRef<KeyboardRef | null>(null);

  const checkBackendConnection = (): Promise<boolean> => {
    return new Promise((resolve) => {
      fetch(backendUrl + '/archive/composers')
        .then((response) => {
          resolve(response.status === 200);
        })
        .catch(() => {
          resolve(false);
        });
    });
  };

  const waitForBackend = (): void => {
    checkBackendConnection().then((isReachable) => {
      if (isReachable) {
        setIsActive(true);
        setIsWaiting(false);
      } else {
        setTimeout(waitForBackend, 5000);
      }
    });
  };

  const webSocket = useDepinusWebSocket({
    name: 'App',
    onOpen: (): void => {
      waitForBackend();
    },
    onKeyboardMessage: (note: number, velocity: number): void => {
      if (note > 0) {
        keyboardRef.current?.setKeyPressed(note, velocity);
        if (cookies.skrjabinMode === 'true') {
          if (velocity > 0) {
            pressedNotesRef.current.add(note);
          } else {
            pressedNotesRef.current.delete(note);
          }
          setBgColor(computeAvgSkrjabinColor(pressedNotesRef.current));
        }
      } else {
        keyboardRef.current?.reset();
        pressedNotesRef.current.clear();
        setBgColor("#444");
      }
    },
    onClose: (): void => {
      if (isActive) {
        setIsActive(false);
        setIsWaiting(true);
        setTimeout(() => {
          setIsWaiting(false);
        }, 30000);
      }
    },
    onError: (): void => {
      setIsWaiting(false);
      setIsActive(false);
    }
  });

  const handleKeyDown = (note: number): void => {
    webSocket.sendKeyboardCommand(note, true);
  };

  const handleKeyUp = (note: number): void => {
    webSocket.sendKeyboardCommand(note, false);
  };

  // Set Skrjabin background color on body for full-page coverage
  useEffect(() => {
    if (cookies.skrjabinMode === 'true' && bgColor) {
      document.body.style.background = bgColor;
      document.body.style.transition = 'background 0.3s';
    } else {
      document.body.style.background = '';
      document.body.style.transition = '';
    }
  }, [bgColor, cookies.skrjabinMode]);

  return (
    <PlaylistProvider>
      <React.Fragment>
        {isActive ? (
          <div className='App'>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <header className="App-header">
                <Keyboard
                  ref={keyboardRef}
                  from={21}
                  to={108}
                  pressedColor={cookies.skrjabinMode === 'true' ? 'Skrjabin' : cookies.color}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                />
              </header>
              <Navbar />
              <Dashboard />
              <ProgressBar />
              <div style={{ position: 'relative', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <CircleOfFifths selectedMajorKeys={[3]} />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/Archive" element={<Archive />} />
                  <Route path="/Playlist" element={<Playlist />} />
                  <Route path="/Score" element={<Score />} />
                  <Route path="/Settings" element={<Settings />} />
                  <Route path="/About" element={<About />} />
                </Routes>
              </div>
            </BrowserRouter>
            <Overlay />
            <img src='../../images/shutdown.png' alt='for cache only' height='0px' />
          </div>
        ) : (
          <div className='shutdown'>
            <img src='../../images/shutdown.png' title={t('Out of service') as string} alt={t('Out of service') as string} height='300px' />
            {isWaiting && (
              <div style={{ display: 'block' }}>
                <div style={{ display: 'inline-block' }}>
                  <WaitingIndicator width='4rem' height='2rem' />
                </div>
              </div>
            )}
          </div>
        )}
      </React.Fragment>
    </PlaylistProvider>
  );
}

export default App;
