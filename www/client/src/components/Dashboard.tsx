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
    const [isRecording, setIsRecording] = useState(false);
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
            }
            if ('isRecording' in message) {
                setIsRecording(message['isRecording']);
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

    React.useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isRecording) {
            interval = setInterval(() => setBlink(b => !b), 500);
        } else {
            setBlink(false);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isRecording]);

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
                    color: isRecordable ? cookies.color : '#808080'
                }}
                onClick={() => webSocket.sendRecordCommand()}
            >
                <FiberManualRecordIcon fontSize="inherit" />
            </button>
            <div
                style={isRecording ? {
                    backgroundColor: blink ? cookies.color : 'transparent',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 1rem',
                    transition: 'background-color 0.2s'
                } : {}}
            >
                {isRecording ? (
                    <h1
                        style={{
                            color: blink ? '#fff' : cookies.color,
                            fontSize: '1.2rem',
                            fontWeight: 500,
                            letterSpacing: '0.5px',
                            margin: 0,
                            transition: 'color 0.2s'
                        }}
                    >
                        Recording...
                    </h1>
                ) : (
                    <>
                        <h1 style={{ fontSize: '0.8rem', margin: 0 }}>&#8203;{composer}</h1>
                        <h2 style={{ fontSize: '0.6rem', margin: 0 }}>&#8203;{composition}</h2>
                    </>
                )}
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
