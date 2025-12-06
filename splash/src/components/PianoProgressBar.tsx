import React from 'react';

interface PianoProgressBarProps {
  value: number;        // Current progress (0-100)
  max?: number;         // Maximum value (default: 100)
  color?: string;       // Color for pressed keys (default: '#4CAF50')
  showPercentage?: boolean; // Show percentage overlay (default: false)
  style?: React.CSSProperties; // Inline styles
}

const PianoProgressBar: React.FC<PianoProgressBarProps> = ({
  value,
  max = 100,
  color = '#4CAF50',
  showPercentage = false,
  style
}) => {
  // Calculate clamped percentage (0-100)
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  // Simple piano keys representation - 24 keys (2 octaves)
  const keys = [
    { note: 'C', type: 'white' },
    { note: 'C#', type: 'black' },
    { note: 'D', type: 'white' },
    { note: 'D#', type: 'black' },
    { note: 'E', type: 'white' },
    { note: 'F', type: 'white' },
    { note: 'F#', type: 'black' },
    { note: 'G', type: 'white' },
    { note: 'G#', type: 'black' },
    { note: 'A', type: 'white' },
    { note: 'A#', type: 'black' },
    { note: 'B', type: 'white' },
    // Second octave
    { note: 'C2', type: 'white' },
    { note: 'C#2', type: 'black' },
    { note: 'D2', type: 'white' },
    { note: 'D#2', type: 'black' },
    { note: 'E2', type: 'white' },
    { note: 'F2', type: 'white' },
    { note: 'F#2', type: 'black' },
    { note: 'G2', type: 'white' },
    { note: 'G#2', type: 'black' },
    { note: 'A2', type: 'white' },
    { note: 'A#2', type: 'black' },
    { note: 'B2', type: 'white' },
  ];

  const keysToActivate = Math.round((percentage / 100) * keys.length);

  return (
    <div className="piano-progress-container" style={style}>
      <div className="piano-keyboard">
        {keys.map((key, index) => (
          <div
            key={`${key.note}-${index}`}
            className={`piano-key ${key.type} ${index < keysToActivate ? 'active' : ''}`}
            style={index < keysToActivate ? { backgroundColor: color } : {}}
          />
        ))}
      </div>
      
      {showPercentage && (
        <div className="percentage-overlay">
          {Math.round(percentage)}%
        </div>
      )}
    </div>
  );
};

export default PianoProgressBar;