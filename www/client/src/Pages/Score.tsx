import React from 'react';
import ScoreView from "../components/ScoreView";

const Score: React.FC = () => {

    return (
        <div style={{ 
            background: 'transparent', 
            flex: '1 1 auto', 
            position: 'relative',
            padding: '20px',
            overflow: 'auto'
        }}>
            <ScoreView />
        </div>
    );
}

export default Score;
