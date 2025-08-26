import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { backendUrl } from '../config';

export default function useDepinusWebsocket(options) {

  const [webSocketUrl, setWebSocketUrl] = useState();

  useEffect(() => {
    fetch(backendUrl + '/info')
      .then((response) => response.json())
      .then((info) => {
        //console.log(JSON.stringify(info));
        setWebSocketUrl(info.webSocketUrl);
      })
  }, []);

  var webSocket = null;

  const sendKeyboardCommand = (note, pressed) => {
    //console.log('Sending keyboard command; note: ' + note + '; pressed: ' + pressed)
    webSocket.sendJsonMessage({ commandType: 'keyboard', note: note, pressed: pressed });
  }

  const sendStopCommand = () => {
    //console.log('Sending stop command')
    webSocket.sendJsonMessage({ commandType: 'control', command: 'stop' });
  }

  const sendPlayCommand = () => {
    //console.log('Sending play command')
    webSocket.sendJsonMessage({ commandType: 'control', command: 'play' });
  }

  const sendPauseCommand = () => {
    //console.log('Sending pause command')
    webSocket.sendJsonMessage({ commandType: 'control', command: 'pause' });
  }

  const sendSettingsCommand = (command, value) => {
    //console.log('Sending settings command')
    webSocket.sendJsonMessage({ commandType: 'control', command: command, value: value });
  }

  const sendGotoPlayTimeCommand = (value) => {
    //console.log('Sending goToPlayTime command')
    webSocket.sendJsonMessage({ commandType: 'control', command: 'gotoPlayTime', value: value });
  }

  webSocket = useWebSocket(webSocketUrl, {
    shouldReconnect: (closeEvent) => true,
    reconnectInterval: 2000,
    onOpen: (openEvent) => {
      //console.log(options.name + ' opened a new websocket connection.');
      if (options.onOpen) {
        options.onOpen();
      }
    },
    onClose: (closeEvent) => {
      //console.log(options.name + ' closed the websocket.');
      if (options.onClose) {
        options.onClose();
      }
    },
    onMessage: (e) => {
      let message = JSON.parse(e.data);
      //console.log(message);
      if ((message.messageType === 'keyboard') && (options.onKeyboardMessage)) {
        //console.log(message);
        options.onKeyboardMessage(message.note, message.velocity);
      }
      else if ((message.messageType === 'info') && (options.onInfoMessage)) {
        //console.log(message);
        options.onInfoMessage(message);
      }
    },
    onError: () => {
      //console.log(options.name + ' received error.');
      if (options.onError) {
        options.onError();
      }
    }
  });

  return {
    sendKeyboardCommand, sendStopCommand,
    sendPlayCommand, sendPauseCommand, sendSettingsCommand,
    sendGotoPlayTimeCommand
  };
}

