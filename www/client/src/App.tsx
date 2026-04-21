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
import { useKeyDetection } from './custom-hooks/useKeyDetection';
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
  const recentNoteEventsRef = React.useRef<Array<{ note: number; time: number }>>([]);
  const recentNotesTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentNotes, setRecentNotes] = useState<Set<number>>(new Set());
  const { t } = useTranslation();
  const keyboardRef = useRef<KeyboardRef | null>(null);
  const { selectedMajorKeys, selectedMinorKeys } = useKeyDetection(recentNotes);

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
        if (velocity > 0) {
          pressedNotesRef.current.add(note);
          // Sliding 2s window: add event, prune old entries, update state.
          const WINDOW_MS = 2000;
          const now = Date.now();
          recentNoteEventsRef.current.push({ note, time: now });
          recentNoteEventsRef.current = recentNoteEventsRef.current.filter(e => now - e.time < WINDOW_MS);
          setRecentNotes(new Set(recentNoteEventsRef.current.map(e => e.note)));
          // Cleanup timer: clear display 2 s after the last note.
          if (recentNotesTimerRef.current) clearTimeout(recentNotesTimerRef.current);
          recentNotesTimerRef.current = setTimeout(() => {
            recentNoteEventsRef.current = [];
            setRecentNotes(new Set());
          }, WINDOW_MS);
        } else {
          pressedNotesRef.current.delete(note);
        }
        if (cookies.skrjabinMode === 'true') {
          setBgColor(computeAvgSkrjabinColor(pressedNotesRef.current));
        }
      } else {
        keyboardRef.current?.reset();
        pressedNotesRef.current.clear();
        setBgColor("#444");
        if (recentNotesTimerRef.current) clearTimeout(recentNotesTimerRef.current);
        recentNoteEventsRef.current = [];
        setRecentNotes(new Set());
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
                <CircleOfFifths selectedMajorKeys={selectedMajorKeys} selectedMinorKeys={selectedMinorKeys} />
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
