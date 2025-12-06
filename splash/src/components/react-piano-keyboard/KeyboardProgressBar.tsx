import React, { useMemo } from 'react';
import Keyboard, { KeyboardRef } from './Keyboard';

interface KeyboardProgressBarProps {
  value: number;        // Current progress (0-100)
  max?: number;         // Maximum value (default: 100)
  from?: number;        // Start note (default: 36)
  to?: number;          // End note (default: 96)
  color?: string;       // Color for pressed keys (default: '#4CAF50')
  showPercentage?: boolean; // Show percentage overlay (default: false)
  style?: React.CSSProperties; // Inline styles
}

const KeyboardProgressBar: React.FC<KeyboardProgressBarProps> = ({
  value,
  max = 100,
  from = 36,
  to = 96,
  color = '#4CAF50',
  showPercentage = false,
  style
}) => {
  // Calculate clamped percentage (0-100)
  const percentage = useMemo(() => {
    return Math.max(0, Math.min(100, (value / max) * 100));
  }, [value, max]);

  // Calculate which keys should be displayed as pressed
  const pressedNotes = useMemo(() => {
    const notes: Set<number> = new Set();
    
    // Collect ALL keys in range (white and black)
    const allNotes: number[] = [];
    
    for (let note = from; note <= to; note++) {
      allNotes.push(note);
    }
    
    // Determine number of keys to activate
    const totalKeys = allNotes.length;
    const keysToActivate = Math.round((percentage / 100) * totalKeys);
    
    // Activate the first N keys (chromatically)
    for (let i = 0; i < keysToActivate && i < allNotes.length; i++) {
      notes.add(allNotes[i]);
    }
    
    return notes;
  }, [percentage, from, to]);

  // Ref to Keyboard component for programmatic control of key states
  const keyboardRef = React.useRef<KeyboardRef>(null);
  
  React.useEffect(() => {
    if (keyboardRef.current) {
      // First reset all keys
      keyboardRef.current.reset();
      
      // Then press the corresponding keys
      pressedNotes.forEach(note => {
        keyboardRef.current?.setKeyPressed(note, 127); // Max velocity
      });
    }
  }, [pressedNotes]);

  return (
    <div 
      style={{
        ...style,
        position: 'relative',
        pointerEvents: 'none'  // Disable all mouse interactions
      }}
    >
      <Keyboard
        ref={keyboardRef}
        from={from}
        to={to}
        pressedColor={color}
        onKeyDown={undefined}
        onKeyUp={undefined}
      />
      
      {/* Conditional: Progress-Text Overlay */}
      {showPercentage && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

export default KeyboardProgressBar;