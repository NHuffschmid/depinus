import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import { useCookies } from 'react-cookie';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import StopIcon from '@mui/icons-material/Stop';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { usePlaylistContext } from './playlist/PlaylistContext';

interface DashboardProps { }

const Dashboard: React.FC<DashboardProps> = () => {
    const { t } = useTranslation();
    const [cookies] = useCookies(['color']);
    const navigate = useNavigate();
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
            if ('recordingSaved' in message && message.recordingSaved) {
                // Navigate to Archive view to show the saved recording
                navigate('/Archive', { state: { selectComposer: 'Depinus' } });
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
                    backgroundColor: recordingInProgress
                        ? (blink ? cookies.color : 'transparent')
                        : 'transparent',
                    color: recordingInProgress
                        ? (blink ? '#fff' : cookies.color)
                        : (isRecordable ? cookies.color : '#808080'),
                    transition: 'background-color 0.2s, color 0.2s'
                }}
                onClick={handleRecord}
            >
                {recordingInProgress ? (
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.5px' }}>{t('Recording')}...</span>
                ) : <FiberManualRecordIcon fontSize="inherit" />}
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
