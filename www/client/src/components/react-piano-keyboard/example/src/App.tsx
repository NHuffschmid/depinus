import { useEffect, useRef } from 'react';
import Keyboard from '../../src/Keyboard';
import type { KeyboardRef } from '../../src/Keyboard';
import '../../src/Keyboard.css';

function App() {
  const keyboardRef = useRef<KeyboardRef | null>(null);

  const handleKeyDown = (note: number) => {
    console.log(`Key down: ${note}`);
  };

  const handleKeyUp = (note: number) => {
    console.log(`Key up: ${note}`);
  };

  useEffect(() => {
    const from = 21;
    const to = 108;
    const maxDuration = 200;
    const minDuration = 30;
    const keyCount = to - from + 1;

    const durations = Array.from({ length: keyCount }, (_, i) =>
      maxDuration - ((maxDuration - minDuration) * i) / (keyCount - 1)
    );

    let time = 0;
    for (let i = 0; i < keyCount; i++) {
      const note = from + i;
      setTimeout(() => {
        if (keyboardRef.current) {
          keyboardRef.current.setKeyPressed(note, 127);
        }
        setTimeout(() => {
          if (keyboardRef.current) {
            keyboardRef.current.setKeyPressed(note, 0);
          }
        }, durations[i]);
      }, time);
      time += durations[i];
    }
  }, []);

  return (
    <div style={{ padding: 32 }}>
      <h1>react-piano-keyboard Demo</h1>
      <Keyboard
        ref={keyboardRef}
        from={21}
        to={108}
        pressedColor="gray"
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      />
    </div>
  );
}

export default App;
