import React, { useState } from 'react';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
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
    const [isRecordable, setIsRecordable] = useState(true);
    const [recordingInProgress, setRecordingInProgress] = useState(false);
    const [blink, setBlink] = useState(false);
    const { forwardable, backwardable, previousTrack, nextTrack } = usePlaylistContext();

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
            if ('isRecordable' in message) {
                setIsRecordable(message['isRecordable']);
                // When recording becomes possible again, stop the blinking animation
                if (message['isRecordable']) {
                    setRecordingInProgress(false);
                }
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

    const handleRecord = () => {
        if (!recordingInProgress) {
            setRecordingInProgress(true);
            webSocket.sendRecordCommand();
        } else {
            setRecordingInProgress(false);
            webSocket.sendStopCommand();
        }
    }

    React.useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (recordingInProgress) {
            interval = setInterval(() => setBlink(b => !b), 500);
        } else {
            setBlink(false);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [recordingInProgress]);

    return (
        <div
            className='dashboard'
            style={{ '--media-active-color': cookies.color } as React.CSSProperties}
        >
            <button
                className="mediaButton"
                style={{ display: backwardable ? "inline-block" : "none" }}
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
            <button
                className="mediaButton"
                disabled={!isRecordable}
                style={{
                    color: recordingInProgress
                        ? (blink ? cookies.color : '#fff')
                        : (isRecordable ? cookies.color : '#808080'),
                    transition: 'color 0.2s'
                }}
                onClick={handleRecord}
            >
                <FiberManualRecordIcon fontSize="inherit" />
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
                style={{ display: forwardable ? "inline-block" : "none" }}
                onClick={nextTrack}
            >
                <SkipNextIcon fontSize="inherit" />
            </button>
        </div>
    )
}

export default Dashboard;
