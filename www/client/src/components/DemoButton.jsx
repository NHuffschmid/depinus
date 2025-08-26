import React from 'react';
import NavButton from './NavButton';
import { backendUrl } from '../config';

const DemoButton = (props) => {

  return (
    <NavButton {...props} action={() => {
      const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compositionId: 0 })
      };
      fetch(backendUrl + '/play', requestOptions);
    }}>
      {props.children}
    </NavButton>
  );
}

export default DemoButton;
