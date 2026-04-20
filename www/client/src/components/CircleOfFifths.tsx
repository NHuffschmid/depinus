import React from 'react';
import { useTranslation } from 'react-i18next';
import { skrjabinColors } from './react-piano-keyboard/src/Keyboard';

export interface CircleOfFifthsProps {
    /** Selected major key indices (0 = C, clockwise). Display-only – no click interaction. */
    selectedMajorKeys?: number[];
    /** Selected minor key indices (0 = am, clockwise). Display-only – no click interaction. */
    selectedMinorKeys?: number[];
}

// ── Circle of Fifths pitch data ──────────────────────────────────────────────
// Index 0 = C (12 o'clock), each step +30° clockwise (circle of fifths order).

const MAJOR_KEYS: Record<string, string[]> = {
    de: ['C', 'G', 'D', 'A', 'E', 'H', 'Fis', 'Cis', 'Gis', 'Dis', 'Ais', 'F'],
    en: ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F'],
    fr: ['do', 'sol', 'ré', 'la', 'mi', 'si', 'fa#', 'do#', 'sol#', 'ré#', 'la#', 'fa'],
    it: ['do', 'sol', 're', 'la', 'mi', 'si', 'fa#', 'do#', 'sol#', 're#', 'la#', 'fa'],
    es: ['do', 'sol', 're', 'la', 'mi', 'si', 'fa#', 'do#', 'sol#', 're#', 'la#', 'fa'],
    pt: ['dó', 'sol', 'ré', 'lá', 'mi', 'si', 'fá#', 'dó#', 'sol#', 'ré#', 'lá#', 'fá'],
};

const MINOR_KEYS: Record<string, string[]> = {
    de: ['a', 'e', 'h', 'fis', 'cis', 'gis', 'dis', 'ais', 'f', 'c', 'g', 'd'],
    en: ['a', 'e', 'b', 'f#', 'c#', 'g#', 'd#', 'a#', 'f', 'c', 'g', 'd'],
    fr: ['la', 'mi', 'si', 'fa#', 'do#', 'sol#', 'ré#', 'la#', 'fa', 'do', 'sol', 'ré'],
    it: ['la', 'mi', 'si', 'fa#', 'do#', 'sol#', 're#', 'la#', 'fa', 'do', 'sol', 're'],
    es: ['la', 'mi', 'si', 'fa#', 'do#', 'sol#', 're#', 'la#', 'fa', 'do', 'sol', 're'],
    pt: ['lá', 'mi', 'si', 'fá#', 'dó#', 'sol#', 'ré#', 'lá#', 'fá', 'dó', 'sol', 'ré'],
};

// Accidentals for each index (sharps: ♯, flats: ♭, empty for C).
const ACCIDENTALS = ['', '1♯', '2♯', '3♯', '4♯', '5♯', '6♯', '7♯', '4♭', '3♭', '2♭', '1♭'];

const SUPPORTED_LANGS = ['de', 'en', 'fr', 'it', 'es', 'pt'];

// ── SVG geometry constants ───────────────────────────────────────────────────

const CX = 200;
const CY = 200;

const R_MAJOR_OUTER = 192;
const R_MAJOR_INNER = 138;
const R_MINOR_OUTER = 135;
const R_MINOR_INNER = 91;
const R_ACC_OUTER = 88;
const R_ACC_INNER = 58;
const R_CENTER = 55;

/** Each segment spans 28° (leaving a 2° visual gap between neighbours). */
const SEGMENT_SPAN_DEG = 28;

// ── Helpers ──────────────────────────────────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Maps a Circle-of-Fifths index (0=C, 1=G, 2=D, …) to a chromatic index (0=C, 1=C#, …).
 * Required because skrjabinColors is indexed chromatically.
 */
const FIFTHS_TO_CHROMATIC = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

/** Returns the Skrjabin colour for a circle-of-fifths segment index. */
const skrjabinFill = (index: number) => skrjabinColors[FIFTHS_TO_CHROMATIC[index]] ?? '#888888';

/** Darkened (50% brightness) version of the Skrjabin colour for the minor/accidentals ring. */
function skrjabinFillDim(index: number): string {
    const hex = skrjabinFill(index).replace('#', '');
    const r = Math.round(parseInt(hex.slice(0, 2), 16) * 0.45);
    const g = Math.round(parseInt(hex.slice(2, 4), 16) * 0.45);
    const b = Math.round(parseInt(hex.slice(4, 6), 16) * 0.45);
    return `rgb(${r},${g},${b})`;
}
function arcPath(rInner: number, rOuter: number, centerDeg: number): string {
    const half = SEGMENT_SPAN_DEG / 2;
    const a1 = toRad(centerDeg - half);
    const a2 = toRad(centerDeg + half);
    const xi1 = CX + rInner * Math.cos(a1), yi1 = CY + rInner * Math.sin(a1);
    const xi2 = CX + rInner * Math.cos(a2), yi2 = CY + rInner * Math.sin(a2);
    const xo1 = CX + rOuter * Math.cos(a1), yo1 = CY + rOuter * Math.sin(a1);
    const xo2 = CX + rOuter * Math.cos(a2), yo2 = CY + rOuter * Math.sin(a2);
    return `M ${xi1} ${yi1} A ${rInner} ${rInner} 0 0 1 ${xi2} ${yi2} ` +
           `L ${xo2} ${yo2} A ${rOuter} ${rOuter} 0 0 0 ${xo1} ${yo1} Z`;
}

/** Centre angle (degrees) for segment i: C at 12 o'clock (−90°), clockwise. */
const segAngle = (i: number) => -90 + i * 30;

// ── Opacity constants (adjust to taste) ─────────────────────────────────────
/** Overall opacity when nothing is selected (watermark look). */
const OPACITY_IDLE = 0.40;
/** Opacity of a selected segment. */
const OPACITY_SELECTED = 0.9;
/** Opacity of a non-selected segment when a selection is active. */
const OPACITY_DIMMED = 0.20;

// ── Component ────────────────────────────────────────────────────────────────

const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({
    selectedMajorKeys,
    selectedMinorKeys,
}) => {
    const { i18n } = useTranslation();
    const baseLang = i18n.language.split('-')[0];
    const lang = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

    const majorKeys = MAJOR_KEYS[lang];
    const minorKeys = MINOR_KEYS[lang];

    const selMajor = selectedMajorKeys ?? [];
    const selMinor = selectedMinorKeys ?? [];
    const hasSelection = selMajor.length > 0 || selMinor.length > 0;

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 1,
        }}>
            <svg
                viewBox="0 0 400 400"
                style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    opacity: hasSelection ? 1 : OPACITY_IDLE,
                }}
            >
                {Array.from({ length: 12 }, (_, i) => {
                    const angle = segAngle(i);
                    const rad   = toRad(angle);
                    const majSel = selMajor.includes(i);
                    const minSel = selMinor.includes(i);

                    // When a selection exists, dim non-selected segments strongly.
                    const majOpacity = hasSelection ? (majSel ? OPACITY_SELECTED : OPACITY_DIMMED) : 1;
                    const minOpacity = hasSelection ? (minSel ? OPACITY_SELECTED : OPACITY_DIMMED) : 1;
                    // Accidentals ring: major and relative minor share the same key signature.
                    const accOpacity = hasSelection ? ((majSel || minSel) ? OPACITY_SELECTED : OPACITY_DIMMED) : 1;

                    const majMidR = (R_MAJOR_INNER + R_MAJOR_OUTER) / 2;
                    const minMidR = (R_MINOR_INNER + R_MINOR_OUTER) / 2;
                    const accMidR = (R_ACC_INNER + R_ACC_OUTER) / 2;
                    const tx = (r: number) => CX + r * Math.cos(rad);
                    const ty = (r: number) => CY + r * Math.sin(rad);

                    return (
                        <g key={i}>
                            {/* ── Major key segment ── */}
                            <path
                                d={arcPath(R_MAJOR_INNER, R_MAJOR_OUTER, angle)}
                                fill={skrjabinFill(i)}
                                stroke={majSel ? 'white' : '#111'}
                                strokeWidth={majSel ? 2.5 : 0.8}
                                opacity={majOpacity}
                            />
                            {/* ── Minor key segment ── */}
                            <path
                                d={arcPath(R_MINOR_INNER, R_MINOR_OUTER, angle)}
                                fill={skrjabinFillDim(i)}
                                stroke={minSel ? 'white' : '#111'}
                                strokeWidth={minSel ? 2.5 : 0.8}
                                opacity={minOpacity}
                            />
                            {/* ── Accidentals segment ── */}
                            {ACCIDENTALS[i] && (
                                <path
                                    d={arcPath(R_ACC_INNER, R_ACC_OUTER, angle)}
                                    fill={skrjabinFillDim(i)}
                                    stroke="#111"
                                    strokeWidth={0.8}
                                    opacity={accOpacity}
                                />
                            )}
                            {/* ── Major key label ── */}
                            <text
                                x={tx(majMidR)} y={ty(majMidR)}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={majSel ? 30 : 26}
                                fontWeight={majSel ? 'bold' : 'normal'}
                                fill={majSel ? '#fff' : '#eee'}
                                opacity={majOpacity}
                                style={{ userSelect: 'none' }}
                            >
                                {majorKeys[i]}
                            </text>
                            {/* ── Minor key label ── */}
                            <text
                                x={tx(minMidR)} y={ty(minMidR)}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={minSel ? 24 : 20}
                                fontWeight={minSel ? 'bold' : 'normal'}
                                fill={minSel ? '#fff' : '#ccc'}
                                opacity={minOpacity}
                                style={{ userSelect: 'none' }}
                            >
                                {minorKeys[i]}
                            </text>
                            {/* ── Accidentals label ── */}
                            {ACCIDENTALS[i] && (
                                <text
                                    x={tx(accMidR)} y={ty(accMidR)}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={18}
                                    fill="#bbb"
                                    opacity={accOpacity}
                                    style={{ userSelect: 'none' }}
                                >
                                    {ACCIDENTALS[i]}
                                </text>
                            )}
                        </g>
                    );
                })}

            </svg>
        </div>
    );
};

export default CircleOfFifths;
