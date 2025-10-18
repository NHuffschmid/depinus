import React from 'react';
import { useTranslation } from "react-i18next";
import SettingsSlider from "./SettingsSlider";

const DynamicsController: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsSlider
			title={t('Dynamics')}
			min={0}
			max={100}
			defaultValue={50}
			websocketCommand={'dynamics'}
			descriptionLeft={<img src='../../images/pianissimo.png' title='silent' alt='silent' height='30px' />}
			descriptionRight={<img src='../../images/fortissimo.png' title='loud' alt='loud' height='30px' />}
		/>
	);
}

export default DynamicsController;
