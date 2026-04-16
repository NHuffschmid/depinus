import { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';
import { backendUrl } from '../config';

export interface CompositionInfo {
	name: string;
	compositionId?: number;
	composerName: string;
	duration: number;
	playTime: number;
}

export interface PlaylistInfo {
	id?: number;
	shuffle?: boolean;
	repeatMode?: string;
	forwardable?: boolean;
	backwardable?: boolean;
	compositionId?: number;
}

export interface PlayStateMessage {
	messageType: 'info';
	infoType: 'playState';
	isStoppable?: boolean;
	isPlayable?: boolean;
	isPauseable?: boolean;
	isRecordable?: boolean;
	isRecording?: boolean;
	isWaiting?: boolean;
	wasCancelled?: boolean;
	recordingSaved?: boolean;
	composition?: CompositionInfo;
}

export interface SettingsMessage {
	messageType: 'info';
	infoType: 'settings';
	tempo?: number;
	dynamics?: number;
	transposition?: number;
}

export interface MidiPortsMessage {
	messageType: 'info';
	infoType: 'midiPorts';
	availableMidiOutPorts: string[];
	selectedMidiOutPort: string | null;
	availableMidiInPorts: string[];
	selectedMidiInPort: string | null;
	isRecordable?: boolean;
}

export interface PlaylistMessage {
	messageType: 'info';
	infoType: 'playlist';
	playlist: PlaylistInfo;
}

export interface RecordingMidiMessage {
	messageType: 'info';
	infoType: 'recordingMidi';
	midiEventBytes: string;
}

export type DepinusInfoMessage =
	| PlayStateMessage
	| SettingsMessage
	| MidiPortsMessage
	| PlaylistMessage
	| RecordingMidiMessage;

export interface DepinusWebsocketOptions {
	name: string;
	onOpen?: () => void;
	onClose?: () => void;
	onMessage?: (e: MessageEvent) => void;
	onError?: () => void;
	onKeyboardMessage?: (note: number, velocity: number, playTime?: number) => void;
	onInfoMessage?: (message: DepinusInfoMessage) => void;
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
			const message = JSON.parse(e.data);
			if (message.messageType === 'info') {
				if (message.infoType === 'keyboard' && options.onKeyboardMessage) {
					options.onKeyboardMessage(message.note, message.velocity, message.playTime);
				} else if (options.onInfoMessage) {
					options.onInfoMessage(message as DepinusInfoMessage);
				}
			} else if (message.messageType === 'rpc_response' && options.onRpcResponseMessage) {
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
