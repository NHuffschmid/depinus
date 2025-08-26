import React from 'react';

const NavButton = (props) => {

  return (
    <button
      className='navButton'
      onClick={props.action}
      style={{
        left: (Math.cos(props.angle) * props.radius * 35.0 + 35).toString() + "%",
        top: (Math.sin(props.angle) * props.radius * 40.0 + 50).toString() + "%",
      }}>
      {props.children}
    </button>
  );
}

export default NavButton;
