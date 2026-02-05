import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { backendUrl } from '../config';

type RepeatMode = 'off' | 'playlist' | 'composition';

export interface DepinusWebsocketOptions {
	name: string;
	onOpen?: () => void;
	onClose?: () => void;
	onMessage?: (e: MessageEvent) => void;
	onError?: () => void;
	onKeyboardMessage?: (note: any, velocity: any) => void;
	onInfoMessage?: (message: any) => void;
	onRpcResponseMessage?: (message: any) => void;
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

	const sendRecordCommand = () => {
		webSocket.sendJsonMessage({ commandType: 'control', command: 'record' });
	};

	const sendSettingsCommand = (command: string, value: any) => {
		webSocket.sendJsonMessage({ commandType: 'control', command: command, value: value });
	};

	const sendPlaylistCommand = (value: any) => {
		webSocket.sendJsonMessage({
			commandType: 'control',
			command: 'playlist',
			value: value
		});
	};

	const sendGotoPlayTimeCommand = (value: any) => {
		webSocket.sendJsonMessage({ commandType: 'control', command: 'gotoPlayTime', value: value });
	};

	const sendRpcCall = (method: string, params: any = {}) => {
		webSocket.sendJsonMessage({ commandType: 'rpc', method: method, params: params });
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
			else if ((message.messageType === 'rpc_response') && (options.onRpcResponseMessage)) {
				options.onRpcResponseMessage(message);
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
		sendPlayCommand, sendPauseCommand, sendRecordCommand, sendSettingsCommand, sendPlaylistCommand,
		sendGotoPlayTimeCommand, sendRpcCall
	};
}
