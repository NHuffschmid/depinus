import React from 'react';
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CirclePicker } from 'react-color';
import { useCookies } from 'react-cookie';

const ColorSelector = () => {

    const { t } = useTranslation();

    const [cookies, setCookie] = useCookies(['color']);
    const [pickerIsVisible, setPickerIsVisible] = useState(false);
    //const [blockPickerColor, setBlockPickerColor] = useState(cookies.color ? cookies.color : '#DC143C');
    const [blockPickerColor, setBlockPickerColor] = useState(cookies.color);

    const selectColor = (color) => {
        //console.log('Selected color: ' + color.hex);
        setCookie('color', color.hex, { path: '/' });
        setBlockPickerColor(color.hex);
        setPickerIsVisible(false);
    }

    return (
        <div style={{ margin: '1rem' }}>
            <button
                style={{
                    color: 'white',
                    backgroundColor: blockPickerColor
                }}
                onClick={() => { setPickerIsVisible(!pickerIsVisible) }}
            >
                {t('Color') + '...'}
            </button>
            {pickerIsVisible
                ?
                <CirclePicker
                    /* TODO: How to center this? */
                    color={blockPickerColor}
                    onChange={(color) => {
                        selectColor(color);
                    }}
                />
                : null}
        </div>
    );
}

export default ColorSelector;
