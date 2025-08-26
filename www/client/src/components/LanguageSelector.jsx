import React from 'react';
import { useTranslation } from "react-i18next";

const LanguageSelector = () => {

    const { i18n } = useTranslation();
    const { t } = useTranslation();

    return (
        <React.Fragment>
            {t('Language')}:&nbsp;
            <select
                value={i18n.language}
                onChange={(e) =>
                    i18n.changeLanguage(e.target.value)
                }
            >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
            </select>
        </React.Fragment>
    );
}

export default LanguageSelector;
