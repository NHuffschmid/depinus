import React, { useState } from 'react';
import Switch from 'react-switch';
import { useTranslation } from 'react-i18next';
import { useCookies } from 'react-cookie';

const KeyLabelToggle: React.FC = () => {
    const { t } = useTranslation();
    const [cookies, setCookie] = useCookies(['keyLabels']);
    const [enabled, setEnabled] = useState<boolean>(cookies.keyLabels === 'true');

    const handleChange = (checked: boolean) => {
        setEnabled(checked);
        setCookie('keyLabels', String(checked), { path: '/' });
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Switch
                checked={enabled}
                onChange={handleChange}
                onColor="#4a90d9"
                offColor="#888"
                checkedIcon={false}
                uncheckedIcon={false}
                height={22}
                width={44}
                id="key-labels-toggle"
            />
            <label htmlFor="key-labels-toggle" style={{ cursor: 'pointer' }}>
                {t('Key labels')}
            </label>
        </div>
    );
};

export default KeyLabelToggle;
