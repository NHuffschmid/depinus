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

// Skrjabin's synesthetic color scale
// (Values taken from wikipedia image)
export const skrjabinColors: string[] = [
  '#ff0000', // C
  '#ce9aff', // C#
  '#ffff00', // D
  '#656599', // D#
  '#e3fbff', // E
  '#ac1c02', // F
  '#00ccff', // F#
  '#ff6501', // G
  '#ff00ff', // G#
  '#33cc33', // A
  '#8c8a8c', // A#
  '#0000fe'  // B/H
];

export const getSkrjabinColor = (note: number): string => {
  const noteInOctave = note % 12;
  return skrjabinColors[noteInOctave] || '#888888';
};

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


    const blackKeyOffsets: Record<number, number> = {
      1: -0.15,
      3: 0.10,
      6: -0.15,
      8: 0.0,
      10: 0.10
    };

    // Helper to determine pressedColor for a note
    const getPressedColor = (note: number) => {
      if (typeof pressedColor === 'string' && pressedColor.toLowerCase() === 'skrjabin') {
        return getSkrjabinColor(note);
      } else {
        return pressedColor;
      }
    };

    const whiteKeys = whiteNotes.map((note, idx) => {
      const nextNote = note + 1;
      const noteInOctave = nextNote % 12;
      let blackKey = null;
      if ([1, 3, 6, 8, 10].includes(noteInOctave) && blackNotes.includes(nextNote)) {
        const offset = blackKeyOffsets[noteInOctave] ?? 0;
        blackKey = (
          <Key
            key={nextNote}
            note={nextNote}
            isPressed={pressed[nextNote]}
            setPressed={(state: boolean) => {
              setKeyPressed(nextNote, state);
              if (state && onKeyDown) onKeyDown(nextNote);
              if (!state && onKeyUp) onKeyUp(nextNote);
            }}
            style={{
              position: 'absolute',
              left: keyWidth * (1 + offset - 0.3),
              width: keyWidth * 0.6,
              height: widgetHeight * 0.65,
              zIndex: 2
            }}
            pressedColor={getPressedColor(nextNote)}
          />
        );
      }
      return (
        <div
          key={note}
          style={{
            position: 'relative',
            display: 'inline-block',
            width: keyWidth,
            height: widgetHeight,
            verticalAlign: 'top'
          }}
        >
          <Key
            note={note}
            isPressed={pressed[note]}
            setPressed={(state: boolean) => {
              setKeyPressed(note, state);
              if (state && onKeyDown) onKeyDown(note);
              if (!state && onKeyUp) onKeyUp(note);
            }}
            style={{ width: '100%', height: '100%' }}
            pressedColor={getPressedColor(note)}
          />
          {blackKey}
        </div>
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
            display: 'inline-block',
            width: '100%',
            height: '100%',
            position: 'relative',
            zIndex: 1
          }}
        >
          {whiteKeys}
        </div>
      </div>
    );
  }
);

export default Keyboard;
