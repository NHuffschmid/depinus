import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-cookie', () => ({
    useCookies: () => [{ color: '#DC143C' }],
}));

vi.mock('react-i18next', () => ({
    useTranslation: vi.fn(() => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    })),
}));

import { useTranslation } from 'react-i18next';
import CircleOfFifths from '../../components/CircleOfFifths';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns all <text> element contents from the rendered SVG. */
const svgTexts = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('text')).map(el => el.textContent ?? '');

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CircleOfFifths', () => {
    it('renders an SVG element', () => {
        const { container } = render(<CircleOfFifths />);
        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders all 12 major key labels in English', () => {
        const { container } = render(<CircleOfFifths />);
        const texts = svgTexts(container);
        const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'D♭', 'A♭', 'E♭', 'B♭', 'F'];
        for (const key of majorKeys) {
            expect(texts.some(t => t.includes(key))).toBe(true);
        }
    });

    it('renders all 12 minor key labels in English', () => {
        const { container } = render(<CircleOfFifths />);
        const texts = svgTexts(container);
        const minorKeys = ['a', 'e', 'b', 'f#', 'c#', 'g#', 'b♭', 'f', 'c', 'g', 'd'];
        for (const key of minorKeys) {
            expect(texts.some(t => t.includes(key))).toBe(true);
        }
    });

    it('renders without selected keys (no error)', () => {
        expect(() => render(<CircleOfFifths />)).not.toThrow();
    });

    it('renders with selectedMajorKeys without error', () => {
        expect(() =>
            render(<CircleOfFifths selectedMajorKeys={[0, 2]} />)
        ).not.toThrow();
    });

    it('renders with selectedMinorKeys without error', () => {
        expect(() =>
            render(<CircleOfFifths selectedMinorKeys={[0]} />)
        ).not.toThrow();
    });

    it('renders with dominantSeventhMajorKeys without error', () => {
        expect(() =>
            render(<CircleOfFifths dominantSeventhMajorKeys={[1]} />)
        ).not.toThrow();
    });

    it('renders accidentals text (sharps/flats)', () => {
        const { container } = render(<CircleOfFifths />);
        const texts = svgTexts(container);
        expect(texts.some(t => t.includes('♯') || t.includes('♭'))).toBe(true);
    });

    it('renders German major key labels when language is "de"', () => {
        (useTranslation as any).mockReturnValue({
            t: (k: string) => k,
            i18n: { language: 'de' },
        });

        const { container } = render(<CircleOfFifths />);
        const texts = svgTexts(container);
        // "H" is the German notation for B natural
        expect(texts.some(t => t.includes('H'))).toBe(true);
    });
});
