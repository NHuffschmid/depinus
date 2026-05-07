import React from 'react';
import { useTranslation } from "react-i18next";
import { useCookies } from 'react-cookie';

export type CircleOfFifthsMode = 'never' | 'idle' | 'always';

const CircleOfFifthsSelector: React.FC = () => {
	const { t } = useTranslation();
	const [cookies, setCookie] = useCookies(['circleOfFifths']);

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setCookie('circleOfFifths', e.target.value as CircleOfFifthsMode, { path: '/', maxAge: 31536000 });
	};

	return (
		<div>
			{t('Circle of fifths')}:&nbsp;
			<select
				value={(cookies.circleOfFifths as CircleOfFifthsMode) || 'idle'}
				onChange={handleChange}
			>
				<option value="never">{t('Circle of fifths-never')}</option>
				<option value="idle">{t('Circle of fifths-idle')}</option>
				<option value="always">{t('Circle of fifths-always')}</option>
			</select>
		</div>
	);
}

export default CircleOfFifthsSelector;
