import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface CircleOfFifthsProps {
    /** Externally controlled selected major key indices (0 = C, clockwise). */
    selectedMajorKeys?: number[];
    /** Externally controlled selected minor key indices (0 = Am, clockwise). */
    selectedMinorKeys?: number[];
    /** Called when a major key segment is clicked (receives index 0–11). */
    onMajorKeyClick?: (index: number) => void;
    /** Called when a minor key segment is clicked (receives index 0–11). */
    onMinorKeyClick?: (index: number) => void;
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

/** Build the SVG path for an annular segment (ring slice). */
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

/** HSL fill colour for a segment, with different treatment for selected state. */
function segmentFill(index: number, selected: boolean, dim = false): string {
    const hue = (index * 30) % 360;
    if (selected) return `hsl(${hue}, 100%, 64%)`;
    if (dim)      return `hsl(${hue}, 40%, 26%)`;
    return              `hsl(${hue}, 58%, 38%)`;
}

/** Centre angle (degrees) for segment i: C at 12 o'clock (−90°), clockwise. */
const segAngle = (i: number) => -90 + i * 30;

// ── Component ────────────────────────────────────────────────────────────────

const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({
    selectedMajorKeys: extMajor,
    selectedMinorKeys: extMinor,
    onMajorKeyClick: extMajorClick,
    onMinorKeyClick: extMinorClick,
}) => {
    const { t, i18n } = useTranslation();
    const baseLang = i18n.language.split('-')[0];
    const lang = SUPPORTED_LANGS.includes(baseLang) ? baseLang : 'en';

    const majorKeys = MAJOR_KEYS[lang];
    const minorKeys = MINOR_KEYS[lang];

    // Internal selection state (used when no external state is provided).
    const [intMajor, setIntMajor] = useState<number[]>([]);
    const [intMinor, setIntMinor] = useState<number[]>([]);

    const isControlled = extMajor !== undefined || extMinor !== undefined;
    const selMajor = isControlled ? (extMajor ?? []) : intMajor;
    const selMinor = isControlled ? (extMinor ?? []) : intMinor;

    const [hovMajor, setHovMajor] = useState<number | null>(null);
    const [hovMinor, setHovMinor] = useState<number | null>(null);

    const handleMajorClick = (i: number) => {
        if (extMajorClick) {
            extMajorClick(i);
        } else {
            setIntMajor(prev => prev.includes(i) ? prev.filter(k => k !== i) : [...prev, i]);
        }
    };

    const handleMinorClick = (i: number) => {
        if (extMinorClick) {
            extMinorClick(i);
        } else {
            setIntMinor(prev => prev.includes(i) ? prev.filter(k => k !== i) : [...prev, i]);
        }
    };

    const ariaLabel = t('Circle of fifths');

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
                aria-label={ariaLabel}
                style={{
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'auto',
                    opacity: 0.88,
                }}
            >
                {Array.from({ length: 12 }, (_, i) => {
                    const angle = segAngle(i);
                    const rad   = toRad(angle);
                    const majSel = selMajor.includes(i);
                    const minSel = selMinor.includes(i);
                    const majHov = hovMajor === i;
                    const minHov = hovMinor === i;

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
                                fill={segmentFill(i, majSel)}
                                stroke={majSel ? 'white' : '#111'}
                                strokeWidth={majSel ? 2.5 : 0.8}
                                opacity={majHov && !majSel ? 0.75 : 1}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleMajorClick(i)}
                                onMouseEnter={() => setHovMajor(i)}
                                onMouseLeave={() => setHovMajor(null)}
                            />
                            {/* ── Minor key segment ── */}
                            <path
                                d={arcPath(R_MINOR_INNER, R_MINOR_OUTER, angle)}
                                fill={segmentFill(i, minSel, true)}
                                stroke={minSel ? 'white' : '#111'}
                                strokeWidth={minSel ? 2.5 : 0.8}
                                opacity={minHov && !minSel ? 0.75 : 1}
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleMinorClick(i)}
                                onMouseEnter={() => setHovMinor(i)}
                                onMouseLeave={() => setHovMinor(null)}
                            />
                            {/* ── Accidentals segment ── */}
                            {ACCIDENTALS[i] && (
                                <path
                                    d={arcPath(R_ACC_INNER, R_ACC_OUTER, angle)}
                                    fill={segmentFill(i, false, true)}
                                    stroke="#111"
                                    strokeWidth={0.8}
                                    style={{ pointerEvents: 'none' }}
                                />
                            )}
                            {/* ── Major key label ── */}
                            <text
                                x={tx(majMidR)} y={ty(majMidR)}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={majSel ? 15 : 13}
                                fontWeight={majSel ? 'bold' : 'normal'}
                                fill={majSel ? '#fff' : '#eee'}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {majorKeys[i]}
                            </text>
                            {/* ── Minor key label ── */}
                            <text
                                x={tx(minMidR)} y={ty(minMidR)}
                                textAnchor="middle" dominantBaseline="central"
                                fontSize={minSel ? 12 : 10}
                                fontWeight={minSel ? 'bold' : 'normal'}
                                fill={minSel ? '#fff' : '#ccc'}
                                style={{ pointerEvents: 'none', userSelect: 'none' }}
                            >
                                {minorKeys[i]}
                            </text>
                            {/* ── Accidentals label ── */}
                            {ACCIDENTALS[i] && (
                                <text
                                    x={tx(accMidR)} y={ty(accMidR)}
                                    textAnchor="middle" dominantBaseline="central"
                                    fontSize={9}
                                    fill="#bbb"
                                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                                >
                                    {ACCIDENTALS[i]}
                                </text>
                            )}
                        </g>
                    );
                })}

                {/* ── Centre circle ── */}
                <circle cx={CX} cy={CY} r={R_CENTER} fill="#1e1e1e" stroke="#555" strokeWidth={1.5} />
                <text
                    x={CX} y={CY - 7}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={7.5} fill="#888"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {ariaLabel.split(' ').map((word, wi) => (
                        <tspan key={wi} x={CX} dy={wi === 0 ? 0 : 10}>{word}</tspan>
                    ))}
                </text>
            </svg>
        </div>
    );
};

export default CircleOfFifths;
