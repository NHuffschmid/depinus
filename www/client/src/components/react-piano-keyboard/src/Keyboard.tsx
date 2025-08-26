import React, { useState, useImperativeHandle, forwardRef, useRef, useEffect } from 'react';
import './Keyboard.css';
import Key from './Key';

export interface KeyboardRef {
  setKeyPressed: (note: number, velocity: number) => void;
  reset: () => void;
}

interface KeyboardProps {
  from?: number;
  to?: number;
  pressedColor?: string;
  onKeyDown?: (note: number) => void;
  onKeyUp?: (note: number) => void;
}

const Keyboard = forwardRef<KeyboardRef, KeyboardProps>(
  ({ from = 36, to = 96, pressedColor = '#888', onKeyDown, onKeyUp }, ref) => {
    if (from < 12 || to > 120 || to <= from) {
      throw new Error(
        `Invalid Keyboard range: 'from' must be >= 12, 'to' must be <= 120, and 'to' must be greater than 'from'. Received from=${from}, to=${to}`
      );
    }

    const [pressed, setPressed] = useState<Record<number, boolean>>(() => {
      const obj: Record<number, boolean> = {};
      for (let note = from; note <= to; note++) {
        obj[note] = false;
      }
      return obj;
    });

    const setKeyPressed = (note: number, state: boolean) => {
      setPressed(prev => ({ ...prev, [note]: state }));
    };

    useImperativeHandle(ref, () => ({
      setKeyPressed: (note: number, velocity: number) => {
        setKeyPressed(note, velocity > 0);
      },
      reset: () => {
        setPressed(() => {
          const obj: Record<number, boolean> = {};
          for (let note = from; note <= to; note++) {
            obj[note] = false;
          }
          return obj;
        });
      }
    }));

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);

    useEffect(() => {
      function updateWidth() {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.offsetWidth);
        }
      }
      updateWidth();
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const widgetWidth = containerWidth || 800;
    const isWhiteKey = (note: number) =>
      [0, 2, 4, 5, 7, 9, 11].includes(note % 12);

    const whiteNotes: number[] = [];
    const blackNotes: number[] = [];

    for (let note = from; note <= to; note++) {
      if (isWhiteKey(note)) {
        whiteNotes.push(note);
      } else {
        blackNotes.push(note);
      }
    }

    const whiteKeyCount = whiteNotes.length;
    const keyWidth = widgetWidth / whiteKeyCount;
    const widgetHeight = keyWidth * 6.5;

    const whiteKeys = whiteNotes.map(note => (
      <Key
        key={note}
        note={note}
        isPressed={pressed[note]}
        setPressed={(state: boolean) => {
          setKeyPressed(note, state);
          if (state && onKeyDown) onKeyDown(note);
          if (!state && onKeyUp) onKeyUp(note);
        }}
        style={{ width: keyWidth, height: widgetHeight }}
        pressedColor={pressedColor}
      />
    ));

    const blackKeyOffsets: Record<number, number> = {
      1: -0.15,
      3: 0.10,
      6: -0.15,
      8: 0.0,
      10: 0.10
    };

    const blackKeys = blackNotes.map(note => {
      let leftWhiteIdx = -1;
      for (let i = 0; i < whiteNotes.length; i++) {
        if (whiteNotes[i] < note) leftWhiteIdx = i;
        if (whiteNotes[i] > note) break;
      }
      const rightWhiteIdx = leftWhiteIdx + 1;
      if (leftWhiteIdx === -1 || rightWhiteIdx >= whiteNotes.length) return null;

      const noteInOctave = note % 12;
      const offset = blackKeyOffsets[noteInOctave] ?? 0;
      let left = (leftWhiteIdx + 1) * keyWidth - keyWidth * 0.25;
      left += keyWidth * offset;

      return (
        <Key
          key={note}
          note={note}
          isPressed={pressed[note]}
          setPressed={(state: boolean) => {
            setKeyPressed(note, state);
            if (state && onKeyDown) onKeyDown(note);
            if (!state && onKeyUp) onKeyUp(note);
          }}
          style={{
            width: keyWidth * 0.6,
            left: left,
            height: widgetHeight * 0.65
          }}
          pressedColor={pressedColor}
        />
      );
    });

    return (
      <div
        ref={containerRef}
        className="keyboard-widget"
        style={{
          position: 'relative',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          width: '100%',
          height: widgetHeight
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 1
          }}
        >
          {whiteKeys}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '65%',
            width: '100%',
            zIndex: 2
          }}
        >
          {blackKeys}
        </div>
      </div>
    );
  }
);

export default Keyboard;
