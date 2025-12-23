import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';

const MidiInPortSelector: React.FC = () => {
	const { t } = useTranslation();
	const [availableMidiInPorts, setAvailableMidiInPorts] = useState<string[]>([]);
	const [selectedPort, setSelectedPort] = useState<string>('');

	const webSocket = useDepinusWebSocket({
		name: 'MidiInPortSelector',
		onInfoMessage: (message: any) => {
			if ('availableMidiInPorts' in message) {
				setAvailableMidiInPorts(message['availableMidiInPorts']);
			}
			if ('selectedMidiInPort' in message) {
				setSelectedPort(message['selectedMidiInPort']);
			}
		}
	});

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedPort(e.target.value);
		webSocket.sendSettingsCommand('selectedMidiOutPort', e.target.value);
	};

	return (
		<div>
			{t('MIDI In')}:&nbsp;
			<select
				value={selectedPort}
				onChange={handleChange}
				style={{ minWidth: '10rem' }}
			>
				{availableMidiInPorts.map(opt => (
					<option key={opt} value={opt}>{opt}</option>
				))}
			</select>
		</div>
	);
}

export default MidiInPortSelector;
