import React from 'react';
import LanguageSelector from "../components/LanguageSelector";
import ColorSelector from "../components/ColorSelector";
import MidiOutPortSelector from "../components/MidiOutPortSelector";
import MidiInPortSelector from '../components/MidiInPortSelector';
import DynamicsController from "../components/DynamicsController";
import TempoController from "../components/TempoController";
import TranspositionController from "../components/TranspositionController";
import KeyLabelToggle from "../components/KeyLabelToggle";

const Settings: React.FC = () => {
	return (
		<div style={{
			display: 'flex',
			flexDirection: 'column',
			gap: '1rem'
		}}>
			<ColorSelector />
			<KeyLabelToggle />
			<LanguageSelector />
			<MidiOutPortSelector />
			<MidiInPortSelector />
			<DynamicsController />
			<TempoController />
			<TranspositionController />
		</div>
	);
}

export default Settings;
