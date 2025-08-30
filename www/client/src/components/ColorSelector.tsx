import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { CirclePicker, ColorResult } from 'react-color';
import { useCookies } from 'react-cookie';

const ColorSelector: React.FC = () => {
	const { t } = useTranslation();
	const [cookies, setCookie] = useCookies(['color']);
	const [pickerIsVisible, setPickerIsVisible] = useState(false);
	const [blockPickerColor, setBlockPickerColor] = useState<string>(cookies.color);

	const selectColor = (color: ColorResult) => {
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
					color={blockPickerColor}
					onChange={(color) => {
						selectColor(color as ColorResult);
					}}
				/>
				: null}
		</div>
	);
}

export default ColorSelector;
