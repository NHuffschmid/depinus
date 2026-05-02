import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import useDepinusWebSocket, { DepinusInfoMessage } from '../custom-hooks/useDepinusWebsocket';

const MidiOutPortSelector: React.FC = () => {
	const { t } = useTranslation();
	const [availableMidiOutPorts, setAvailableMidiOutPorts] = useState<string[]>([]);
	const [selectedPort, setSelectedPort] = useState<string>('');

	const webSocket = useDepinusWebSocket({
		name: 'MidiOutPortSelector',
		onInfoMessage: (message: DepinusInfoMessage) => {
			if (message.infoType === 'midiPorts') {
				setAvailableMidiOutPorts(message.availableMidiOutPorts);
				if (message.selectedMidiOutPort !== null) {
					setSelectedPort(message.selectedMidiOutPort);
				}
			}
		}
	});

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedPort(e.target.value);
		webSocket.sendSettingsCommand('selectedMidiOutPort', e.target.value);
	};

	return (
		<div>
			{t('MIDI Out')}:&nbsp;
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
