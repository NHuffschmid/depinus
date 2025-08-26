import React from 'react';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import DemoButton from "../components/DemoButton";
import ShutdownButton from "../components/ShutdownButton";
import ExportArchiveButton from "../components/archive/ExportArchiveButton";
import ImportArchiveButton from "../components/archive/ImportArchiveButton";
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';

const Home = () => {

    const [angle, setAngle] = useState(Math.random() * 2.0 * Math.PI);

    const { t } = useTranslation();

    useDepinusWebSocket({
        name: 'Home',
        onKeyboardMessage: () => {
            // with each key press/release nav buttons are rotated a bit further
            setAngle(angle + 0.001);
        }
    });
 
    return (
        <div style={{ background: 'transparent', flex: '1 1 auto', position: 'relative' }}>
            <DemoButton angle={angle} radius={0}>{t('Demo')}</DemoButton>
            <ShutdownButton angle={angle + Math.PI * 0.667} radius={1}>{t('Shutdown')}</ShutdownButton>
            <ExportArchiveButton angle={angle + Math.PI * 1.33} radius={1}>{t('ExportArchive')}</ExportArchiveButton>
            <ImportArchiveButton angle={angle + Math.PI * 2} radius={1}>{t('ImportArchive')}</ImportArchiveButton>
        </div>
    )
}

export default Home
