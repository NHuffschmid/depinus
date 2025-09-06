import React from 'react';
import { useTranslation } from "react-i18next";
import SettingsSlider from "./SettingsSlider";

const TempoController: React.FC = () => {
	const { t } = useTranslation();

	const STEPS = 10; // left and right from middle position
	const MAX_FACTOR = 5; // fast and slow

	const sliderToTempo = (value: number): number => {
		if (value < 0) {
			let tempo = value * ((1.0 - 1.0 / MAX_FACTOR) / STEPS) + 1.0;
			return (Math.round(tempo * 100.0)) / 100;
		}
		else {
			let tempo = value * (MAX_FACTOR - 1.0) / STEPS + 1.0;
			return (Math.round(tempo * 100.0)) / 100;
		}
	}

	const tempoToSlider = (value: number): number => {
		if (value < 1.0) {
			let slider = (value - 1.0) * STEPS * MAX_FACTOR / (MAX_FACTOR - 1.0);
			return slider;
		}
		else {
			let slider = (value - 1.0) * STEPS / (MAX_FACTOR - 1.0);
			return slider;
		}
	}

	return (
		<SettingsSlider
			title={t('Tempo')}
			min={-STEPS}
			max={STEPS}
			defaultValue={0}
			websocketCommand={'tempo'}
			sliderToWebsocketConverter={sliderToTempo}
			websocketToSliderConverter={tempoToSlider}
			descriptionLeft={'Adagio'}
			descriptionRight={'Allegro'}
		/>
	);
}

export default TempoController;
