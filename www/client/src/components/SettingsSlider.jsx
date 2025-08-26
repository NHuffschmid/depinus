import React, { useState } from 'react';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import ReactSlider from 'react-slider';

const SettingsSlider = (props) => {

  const [sliderValue, setSliderValue] = useState(props.defaultValue);

  const webSocket = useDepinusWebSocket({
    name: 'SettingsSlider',
    onInfoMessage: (message) => {
      //console.log('Message received by SettingsSlider: ' + message[props.websocketCommand]);
      if (props.websocketCommand in message) {
        if (props.websocketToSliderConverter) {
          setSliderValue(props.websocketToSliderConverter(message[props.websocketCommand]));
        }
        else {
          setSliderValue(message[props.websocketCommand]);
        }
      }
    }
  });

  const sliderChanged = (value) => {
    //console.log('Slider changed: ' + value);
    let convertedValue = props.sliderToWebsocketConverter ? props.sliderToWebsocketConverter(value) : value
    webSocket.sendSettingsCommand(props.websocketCommand, convertedValue);
  }

  return (
    <React.Fragment>
      <div style={{
        margin: '1rem 0rem',
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
            onChange={(value) => sliderChanged(value)}
            renderThumb={(thumbProps) =>
              <div {...thumbProps}>
                {props.sliderToWebsocketConverter ? props.sliderToWebsocketConverter(sliderValue) : sliderValue}
              </div>}
          />
        </div>
        <div className='partiture'>{props.descriptionRight}</div>
      </div>
    </React.Fragment>
  );
}

export default SettingsSlider;
