import React from 'react';

interface NavButtonProps {
  action?: () => void;
  angle?: number;
  radius?: number;
  children?: React.ReactNode;
}

const NavButton: React.FC<NavButtonProps> = (props) => {
  return (
    <button
      className='navButton'
      onClick={props.action}
      style={{
        left: (Math.cos(props.angle ?? 0) * (props.radius ?? 1) * 35.0 + 35).toString() + "%",
        top: (Math.sin(props.angle ?? 0) * (props.radius ?? 1) * 40.0 + 50).toString() + "%",
      }}>
      {props.children}
    </button>
  );
}

export default NavButton;
