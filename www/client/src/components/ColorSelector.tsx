import React, { useState } from 'react';
import Switch from 'react-switch';
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

	const handleSkrjabinModeChange = (checked: boolean) => {
		setSkrjabinMode(checked);
		setCookie('skrjabinMode', String(checked), { path: '/' });
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
					<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5em' }}>
						<label htmlFor="skrjabin-mode" style={{ cursor: 'pointer' }}>{t('Skrjabin mode')}:</label>
						<Switch
							checked={skrjabinMode}
							onChange={handleSkrjabinModeChange}
							onColor={blockPickerColor}
							offColor="#888"
							checkedIcon={false}
							uncheckedIcon={false}
							height={22}
							width={44}
							id="skrjabin-mode"
						/>
					</div>
				</div>
				: null}
		</div>
	);
}

export default ColorSelector;
