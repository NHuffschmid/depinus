import React from 'react';
import { useCookies } from 'react-cookie';
import { useTranslation } from 'react-i18next';
import { CircleOfFifths as CircleOfFifthsLib } from './react-circle-of-fifths/src';

export interface CircleOfFifthsProps {
    /** Selected major key indices (0 = C, clockwise). Display-only – no click interaction. */
    selectedMajorKeys?: number[];
    /** Selected minor key indices (0 = am, clockwise). Display-only – no click interaction. */
    selectedMinorKeys?: number[];
    /** Major key indices highlighted as dominant seventh chords (shown with superscript "7"). */
    dominantSeventhMajorKeys?: number[];
}

const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({
    selectedMajorKeys,
    selectedMinorKeys,
    dominantSeventhMajorKeys,
}) => {
    const [cookies] = useCookies(['color']);
    const { i18n } = useTranslation();

    return (
        <CircleOfFifthsLib
            selectedMajorKeys={selectedMajorKeys}
            selectedMinorKeys={selectedMinorKeys}
            dominantSeventhMajorKeys={dominantSeventhMajorKeys}
            language={i18n.language}
            accentColor={cookies.color}
        />
    );
};

export default CircleOfFifths;
