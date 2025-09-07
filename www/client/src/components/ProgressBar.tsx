import React, { useState, useRef } from 'react';
import WaitingIndicator from './WaitingIndicator';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import ReactSlider from 'react-slider';
import { formattedPlaytime } from '../utils';

const ProgressBar: React.FC = () => {
    const [playTime, setPlayTime] = useState(0);
    const [totalTime, setTotalTime] = useState(0);
    const [tempo, setTempo] = useState(1.0);
    const [isWaiting, setIsWaiting] = useState(false);
    const tickInterval = useRef<NodeJS.Timeout | null>(null);

    const tick = () => {
        setPlayTime(playTime => playTime + 1);
    }

    const webSocket = useDepinusWebSocket({
        name: 'ProgressBar',
        onInfoMessage: (message: any) => {
            //console.log('ProgressBar received Info message: ' + JSON.stringify(message));
            if ('composition' in message) {
                setTotalTime(message['composition']['duration']);
                setPlayTime(message['composition']['playTime']);
            }
            if ('tempo' in message) {
                setTempo(message['tempo']);
                if (tickInterval.current) {
                    clearInterval(tickInterval.current);
                    tickInterval.current = setInterval(tick, 1000 / message['tempo']);
                }
            }
            if ('isPauseable' in message) {
                if (tickInterval.current) {
                    //console.log('Clear interval with ID ' + tickInterval.current);
                    clearInterval(tickInterval.current);
                    tickInterval.current = null;
                }
                if (message['isPauseable']) {
                    tickInterval.current = setInterval(tick, 1000 / tempo);
                }
            }

            // TODO: rework this strange waiting indication handling

            if (
                (totalTime === 0) ||
                message['selectedMidiOutPort'] ||
                message['dynamics'] ||
                message['tempo'] ||
                message['transposition'] ||
                message['isStoppable'] ||
                message['isPlayable'] ||
                message['isPauseable']) {
                setIsWaiting(false);
            }
            else {
                setIsWaiting(true);
            }
        }
    });

    const sliderChanged = (value: number) => {
        setPlayTime(value);
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
