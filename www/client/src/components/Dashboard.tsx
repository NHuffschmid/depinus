import React, { useState } from 'react';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';

interface DashboardProps { }

const Dashboard: React.FC<DashboardProps> = () => {
    const [isBackwardable] = useState(false);
    const [isStoppable, setIsStoppable] = useState(false);
    const [composer, setComposer] = useState('');
    const [composition, setComposition] = useState('');
    const [isPlayable, setIsPlayable] = useState(false);
    const [isPauseable, setIsPauseable] = useState(false);
    const [isForwardable] = useState(false);

    const webSocket = useDepinusWebSocket({
        name: 'Dashboard',
        onInfoMessage: (message: any) => {
            if ('composition' in message) {
                setComposition(message['composition']['name']);
                setComposer(message['composition']['composerName']);
            }
            if ('isStoppable' in message) {
                setIsStoppable(message['isStoppable']);
            }
            if ('isPlayable' in message) {
                setIsPlayable(message['isPlayable']);
            }
            if ('isPauseable' in message) {
                setIsPauseable(message['isPauseable']);
            }
        }
    });

    const handleStop = () => {
        webSocket.sendStopCommand();
    }

    const handlePlayPause = () => {
        if (isPauseable) {
            webSocket.sendPauseCommand();
        }
        else {
            webSocket.sendPlayCommand();
        }
    }

    return (
        <div className='dashboard'>
            <button disabled={!isBackwardable}>|&lt;</button>
            <button disabled={!isStoppable} onClick={handleStop}>O</button>
            <div>
                <h1>&#8203;{composer}</h1>
                <h2>&#8203;{composition}</h2>
            </div>
            <button disabled={!isPlayable && !isPauseable} onClick={handlePlayPause}>{isPauseable ? "||" : ">"}</button>
            <button disabled={!isForwardable}>&gt;|</button>
        </div>
    )
}

export default Dashboard;
