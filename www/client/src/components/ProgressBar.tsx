import React, { useState, useRef } from 'react';
import WaitingIndicator from './WaitingIndicator';
import useDepinusWebSocket, { DepinusInfoMessage } from '../custom-hooks/useDepinusWebsocket';
import ReactSlider from 'react-slider';
import { formattedPlaytime } from '../utils';

const ProgressBar: React.FC = () => {
    const [playTime, setPlayTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [tempo, setTempo] = useState(1.0);
    const [isWaiting, setIsWaiting] = useState(false);
    const tickInterval = useRef<NodeJS.Timeout | null>(null);

    // Wall-clock anchors: instead of counting +1 per tick we compute real elapsed time.
    // This ensures the progress bar is correct even after the GUI thread was paused.
    const playTimeAtStart = useRef<number>(0);
    const startTimestamp = useRef<number>(0);
    const tempoRef = useRef<number>(1.0);

    const tick = () => {
        const elapsed = (Date.now() - startTimestamp.current) / 1000;
        setPlayTime(playTimeAtStart.current + elapsed * tempoRef.current);
    }

    // Anchors the wall-clock reference to a given play-time position.
    const resetAnchor = (fromPlayTime: number) => {
        playTimeAtStart.current = fromPlayTime;
        startTimestamp.current = Date.now();
    }

    // Returns the play time computed from anchors (safe to call inside callbacks).
    const computePlayTime = (): number => {
        const elapsed = (Date.now() - startTimestamp.current) / 1000;
        return playTimeAtStart.current + elapsed * tempoRef.current;
    }

    const webSocket = useDepinusWebSocket({
        name: 'ProgressBar',
        onInfoMessage: (message: DepinusInfoMessage) => {
            //console.log('ProgressBar received Info message: ' + JSON.stringify(message));
            if (message.infoType === 'playState') {
                if (message.composition) {
                    setTotalTime(message.composition.duration);
                    const pt: number = message.composition.playTime;
                    setPlayTime(pt);
                    resetAnchor(pt);  // authoritative server position → re-anchor
                }
                if (message.isPauseable !== undefined) {
                    if (tickInterval.current) {
                        //console.log('Clear interval with ID ' + tickInterval.current);
                        clearInterval(tickInterval.current);
                        tickInterval.current = null;
                    }
                    if (message.isPauseable) {
                        // startTimestamp is reset so elapsed time counts from now
                        resetAnchor(playTimeAtStart.current);
                        tickInterval.current = setInterval(tick, 1000 / tempoRef.current);
                    }
                }
                if (message.isWaiting !== undefined) {
                    setIsWaiting(message.isWaiting);
                }
            } else if (message.infoType === 'settings') {
                if (message.tempo !== undefined) {
                    const newTempo: number = message.tempo;
                    tempoRef.current = newTempo;
                    setTempo(newTempo);
                    if (tickInterval.current) {
                        const currentPt = computePlayTime();
                        clearInterval(tickInterval.current);
                        resetAnchor(currentPt);
                        tickInterval.current = setInterval(tick, 1000 / newTempo);
                    }
                }
            }
        }
    });

    const sliderChanged = (value: number) => {
        setPlayTime(value);
        resetAnchor(value);
        if (tickInterval.current) {
            clearInterval(tickInterval.current);
            tickInterval.current = null;
        }
    }

    const afterSliderChanged = (value: number) => {
        //console.log('ProgressBar changed: ' + value);
        webSocket.sendGotoPlayTimeCommand(value);
    }

    return (
        <React.Fragment>
            <div style={{
                margin: '0rem 0.3rem',
                display: 'grid',
                gridTemplateRows: 'auto auto',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center'
            }}>
                <div style={{ gridColumn: '1 / 4' }}>
                    <ReactSlider
                        min={0}
                        max={totalTime}
                        className="progressSlider"
                        thumbClassName="progressSlider-thumb"
                        trackClassName="progressSlider-track"
                        defaultValue={0}
                        value={playTime}
                        onChange={sliderChanged}
                        onAfterChange={afterSliderChanged}
                    />
                </div>
                <div>{formattedPlaytime(playTime)}</div>
                <div style={{ display: 'block' }}>
                    <div style={{ display: 'inline-block' }}>
                        {isWaiting ? <WaitingIndicator width='4rem' height='2rem' /> : null}
                    </div>
                </div>
                <div>{formattedPlaytime(totalTime)}</div>
            </div>
        </React.Fragment>
    );
}

export default ProgressBar;
