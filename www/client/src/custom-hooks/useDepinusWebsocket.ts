import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { backendUrl } from '../config';

export interface DepinusWebsocketOptions {
	name: string;
	onOpen?: () => void;
	onClose?: () => void;
	onMessage?: (e: MessageEvent) => void;
	onError?: () => void;
	onKeyboardMessage?: (note: any, velocity: any) => void;
	onInfoMessage?: (message: any) => void;
}

export default function useDepinusWebSocket(options: DepinusWebsocketOptions) {
		const [webSocketUrl, setWebSocketUrl] = useState<string | null>(null);

	useEffect(() => {
		fetch(backendUrl + '/info')
			.then((response) => response.json())
			.then((info) => {
				setWebSocketUrl(info.webSocketUrl);
			});
	}, []);

	let webSocket: any = null;

	const sendKeyboardCommand = (note: any, pressed: any) => {
		webSocket.sendJsonMessage({ commandType: 'keyboard', note: note, pressed: pressed });
	};

	const sendStopCommand = () => {
		webSocket.sendJsonMessage({ commandType: 'control', command: 'stop' });
	};

	const sendPlayCommand = () => {
		webSocket.sendJsonMessage({ commandType: 'control', command: 'play' });
	};

	const sendPauseCommand = () => {
		webSocket.sendJsonMessage({ commandType: 'control', command: 'pause' });
	};

	const sendSettingsCommand = (command: string, value: any) => {
		webSocket.sendJsonMessage({ commandType: 'control', command: command, value: value });
	};

	const sendGotoPlayTimeCommand = (value: any) => {
		webSocket.sendJsonMessage({ commandType: 'control', command: 'gotoPlayTime', value: value });
	};

		webSocket = useWebSocket(webSocketUrl, {
		shouldReconnect: (closeEvent: CloseEvent) => true,
		reconnectInterval: 2000,
		onOpen: (openEvent: Event) => {
			if (options.onOpen) {
				options.onOpen();
			}
		},
		onClose: (closeEvent: CloseEvent) => {
			if (options.onClose) {
				options.onClose();
			}
		},
		onMessage: (e: MessageEvent) => {
			let message = JSON.parse(e.data);
			if ((message.messageType === 'keyboard') && (options.onKeyboardMessage)) {
				options.onKeyboardMessage(message.note, message.velocity);
			}
			else if ((message.messageType === 'info') && (options.onInfoMessage)) {
				options.onInfoMessage(message);
			}
		},
		onError: () => {
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
