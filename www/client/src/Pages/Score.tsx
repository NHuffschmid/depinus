import React from 'react';
import { useTranslation } from "react-i18next";
import ScoreView from "../components/score/ScoreView";

const Score: React.FC = () => {
    const { t } = useTranslation();

    return (
        <div style={{ 
            background: 'transparent', 
            flex: '1 1 auto', 
            position: 'relative',
            padding: '20px',
            overflow: 'auto'
        }}>
            <h2>{t('Score')}</h2>
            <ScoreView />
        </div>
    );
}

export default Score;
