import React, { useRef } from 'react';
import './Keyboard.css';

interface KeyProps {
  note: number;
  isPressed: boolean;
  setPressed: (state: boolean) => void;
  style?: React.CSSProperties;
  pressedColor?: string;
}

// Helper to determine if a key is white
function isWhiteKey(note: number): boolean {
  const n = note % 12;
  return ![1, 3, 6, 8, 10].includes(n);
}

const Key: React.FC<KeyProps> = ({
  note,
  isPressed,
  setPressed,
  style,
  pressedColor = '#888'
}) => {
  const isWhite = isWhiteKey(note);
  const mousePressed = useRef<boolean>(false);

  const bgStyle: React.CSSProperties = {
    background: isPressed ? pressedColor : isWhite ? 'white' : 'black'
  };

  const handleMouseDown = () => {
    mousePressed.current = true;
    setPressed(true);
  };

  const handleMouseUp = () => {
    if (mousePressed.current) {
      setPressed(false);
      mousePressed.current = false;
    }
  };

  const handleMouseLeave = () => {
    if (mousePressed.current) {
      setPressed(false);
      mousePressed.current = false;
    }
  };

  return (
    <div
      className={isWhite ? 'ivory' : 'ebony'}
      style={{ ...style, ...bgStyle }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default Key;
