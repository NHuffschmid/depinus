import React from 'react';
import { useTranslation } from "react-i18next";

const LanguageSelector: React.FC = () => {
	const { i18n } = useTranslation();
	const { t } = useTranslation();

	return (
		<div>
			{t('Language')}:&nbsp;
			<select
				value={i18n.language}
				onChange={(e) =>
					i18n.changeLanguage(e.target.value)
				}
			>
				<option value="en">English</option>
				<option value="de">Deutsch</option>
				<option value="fr">Français</option>
				<option value="es">Español</option>
				<option value="it">Italiano</option>
			</select>
		</div>
	);
}

export default LanguageSelector;
