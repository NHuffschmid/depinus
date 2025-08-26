import React from 'react';
import { useTranslation } from "react-i18next";
import SettingsSlider from "./SettingsSlider";

const TranspositionController = () => {

    const { t } = useTranslation();

    return (
        <SettingsSlider
            title={t('Transposition')}
            min={-12}
            max={12}
            defaultValue={0}
            websocketCommand={'transposition'}
            descriptionLeft={<img src='../../images/bass.png' title='lower' alt='lower' height='30px' />}
            descriptionRight={<img src='../../images/treble.png' title='higher' alt='higher' height='40px' />}
        />
    );
}

export default TranspositionController;
