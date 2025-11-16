import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { CirclePicker, ColorResult } from 'react-color';
import { useCookies } from 'react-cookie';


const ColorSelector: React.FC = () => {
	const { t } = useTranslation();
	const [cookies, setCookie] = useCookies(['color', 'skrjabinMode']);
	const [colorSubpanelIsVisible, setColorSubpanelIsVisible] = useState(false);
	const [blockPickerColor, setBlockPickerColor] = useState<string>(cookies.color);
	const [skrjabinMode, setSkrjabinMode] = useState<boolean>(cookies.skrjabinMode === 'true');

	const selectColor = (color: ColorResult) => {
		setCookie('color', color.hex, { path: '/' });
		setBlockPickerColor(color.hex);
	}

	const handleSkrjabinModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSkrjabinMode(e.target.checked);
		setCookie('skrjabinMode', e.target.checked, { path: '/' });
	}

	return (
		<div>
			<button
				style={{
					color: 'white',
					backgroundColor: blockPickerColor
				}}
				onClick={() => { setColorSubpanelIsVisible(!colorSubpanelIsVisible) }}
			>
				{t('Color') + '...'}
			</button>
			{colorSubpanelIsVisible
				?
				<div style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					marginTop: '1rem'
				}}>
					<CirclePicker
						color={blockPickerColor}
						onChange={(color) => {
							selectColor(color as ColorResult);
						}}
					/>
					<div style={{ display: 'flex', alignItems: 'center', marginTop: '0.5em' }}>
						<input
							type="checkbox"
							id="skrjabin-mode"
							style={{ marginRight: '0.5em' }}
							checked={skrjabinMode}
							onChange={handleSkrjabinModeChange}
						/>
						<label htmlFor="skrjabin-mode">{t('Skrjabin Mode')}</label>
					</div>
				</div>
				: null}
		</div>
	);
}

export default ColorSelector;
