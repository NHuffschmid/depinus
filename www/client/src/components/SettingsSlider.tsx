import React, { useState } from 'react';
import useDepinusWebSocket, { DepinusInfoMessage } from '../custom-hooks/useDepinusWebsocket';
import ReactSlider from 'react-slider';

export interface SettingsSliderProps {
    title: string;
    min: number;
    max: number;
    defaultValue: number;
    websocketCommand: string;
    descriptionLeft?: React.ReactNode;
    descriptionRight?: React.ReactNode;
    sliderToWebsocketConverter?: (value: number) => number;
    websocketToSliderConverter?: (value: number) => number;
}

const SettingsSlider: React.FC<SettingsSliderProps> = (props) => {
    const [sliderValue, setSliderValue] = useState<number>(props.defaultValue);

    const webSocket = useDepinusWebSocket({
        name: 'SettingsSlider',
        onInfoMessage: (message: DepinusInfoMessage) => {
            if (message.infoType === 'settings') {
                const value = (message as any)[props.websocketCommand];
                if (value !== undefined) {
                    if (props.websocketToSliderConverter) {
                        setSliderValue(props.websocketToSliderConverter(value));
                    } else {
                        setSliderValue(value);
                    }
                }
            }
        }
    });

    const sliderChanged = (value: number) => {
        let convertedValue = props.sliderToWebsocketConverter ? props.sliderToWebsocketConverter(value) : value;
        webSocket.sendSettingsCommand(props.websocketCommand, convertedValue);
    };

    return (
        <React.Fragment>
            <div style={{
                display: 'grid',
                gridTemplateRows: 'auto 3rem',
                gridTemplateColumns: '4rem 1fr 4rem',
                alignItems: 'center'
            }}>
                <div />
                <div>{props.title}:</div>
                <div />
                <div className='partiture'>{props.descriptionLeft}</div>
                <div>
                    <ReactSlider
                        min={props.min}
                        max={props.max}
                        className="settingsSlider"
                        thumbClassName="settingsSlider-thumb"
                        trackClassName="settingsSlider-track"
                        defaultValue={sliderValue}
                        value={sliderValue}
                        onChange={sliderChanged}
                        renderThumb={(thumbProps: any) => {
                            const { key, ...rest } = thumbProps;
                            return (
                                <div key={key} {...rest}>
                                    {props.sliderToWebsocketConverter ? props.sliderToWebsocketConverter(sliderValue) : sliderValue}
                                </div>
                            );
                        }}
                    />
                </div>
                <div className='partiture'>{props.descriptionRight}</div>
            </div>
        </React.Fragment>
    );
};

export default SettingsSlider;
