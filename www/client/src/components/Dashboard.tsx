import React, { useState } from 'react';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { useCookies } from 'react-cookie';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { usePlaylistContext } from './playlist/PlaylistContext';

interface DashboardProps { }

const Dashboard: React.FC<DashboardProps> = () => {
    const [cookies] = useCookies(['color']);
    const [isStoppable, setIsStoppable] = useState(false);
    const [composer, setComposer] = useState('');
    const [composition, setComposition] = useState('');
    const [isPlayable, setIsPlayable] = useState(false);
    const [isPauseable, setIsPauseable] = useState(false);
    const { forwardable, backwardable, stopPlaylist, previousTrack, nextTrack } = usePlaylistContext();

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
        stopPlaylist();
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
        <div
            className='dashboard'
            style={{ '--media-active-color': cookies.color } as React.CSSProperties}
        >
            <button
                className="mediaButton"
                disabled={!backwardable}
                onClick={previousTrack}
            >
                <SkipPreviousIcon fontSize="inherit" />
            </button>
            <button
                className="mediaButton"
                disabled={!isStoppable}
                onClick={handleStop}
            >
                <StopIcon fontSize="inherit" />
            </button>
            <div>
                <h1>&#8203;{composer}</h1>
                <h2>&#8203;{composition}</h2>
            </div>
            <button
                className="mediaButton"
                disabled={!isPlayable && !isPauseable}
                onClick={handlePlayPause}
            >
                {isPauseable ? <PauseIcon fontSize="inherit" /> : <PlayArrowIcon fontSize="inherit" />}
            </button>
            <button
                className="mediaButton"
                disabled={!forwardable}
                onClick={nextTrack}
            >
                <SkipNextIcon fontSize="inherit" />
            </button>
        </div>
    )
}

export default Dashboard;
