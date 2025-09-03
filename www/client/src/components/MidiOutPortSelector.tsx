import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';

const MidiOutPortSelector: React.FC = () => {
	const { t } = useTranslation();
	const [availableMidiOutPorts, setAvailableMidiOutPorts] = useState<string[]>([]);
	const [selectedPort, setSelectedPort] = useState<string>('');

	const webSocket = useDepinusWebSocket({
		name: 'MidiOutPortSelector',
		onInfoMessage: (message: any) => {
			if ('availableMidiOutPorts' in message) {
				setAvailableMidiOutPorts(message['availableMidiOutPorts']);
			}
			if ('selectedMidiOutPort' in message) {
				setSelectedPort(message['selectedMidiOutPort']);
			}
		}
	});

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedPort(e.target.value);
        webSocket.sendSettingsCommand('selectedMidiOutPort', e.target.value);
	};

	return (
		<div>
			{t('MidiOut')}:&nbsp;
			<select
				value={selectedPort}
				onChange={handleChange}
				style={{ minWidth: '10rem' }}
			>
				{availableMidiOutPorts.map(opt => (
					<option key={opt} value={opt}>{opt}</option>
				))}
			</select>
		</div>
	);
}

export default MidiOutPortSelector;
