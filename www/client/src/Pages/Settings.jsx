import React from 'react';
import LanguageSelector from "../components/LanguageSelector";
import ColorSelector from "../components/ColorSelector";
import DynamicsController from "../components/DynamicsController";
import TempoController from "../components/TempoController";
import TranspositionController from "../components/TranspositionController";

const Settings = () => {

    return (
        <div>
            <LanguageSelector />
            <ColorSelector />
            <DynamicsController />
            <TempoController />
            <TranspositionController />
        </div>
    )
}

export default Settings
