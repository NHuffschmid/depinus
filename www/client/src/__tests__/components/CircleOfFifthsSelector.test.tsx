import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSetCookie = vi.fn();
const mockCookies: Record<string, string> = {};

vi.mock('react-cookie', () => ({
    useCookies: () => [mockCookies, mockSetCookie],
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    }),
}));

import CircleOfFifthsSelector from '../../components/CircleOfFifthsSelector';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CircleOfFifthsSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        delete mockCookies.circleOfFifths;
    });

    it('renders the translated label', () => {
        const { container } = render(<CircleOfFifthsSelector />);
        // The outer div's text content contains the label with its colon separator
        expect(container.querySelector('div')!.textContent).toContain('Circle of fifths:');
    });

    it('renders all three options', () => {
        const { getByRole } = render(<CircleOfFifthsSelector />);
        const select = getByRole('combobox') as HTMLSelectElement;
        const values = Array.from(select.options).map(o => o.value);
        expect(values).toEqual(['never', 'idle', 'always']);
    });

    it('defaults to "idle" when no cookie is set', () => {
        const { getByRole } = render(<CircleOfFifthsSelector />);
        const select = getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('idle');
    });

    it('reflects the current cookie value', () => {
        mockCookies.circleOfFifths = 'always';
        const { getByRole } = render(<CircleOfFifthsSelector />);
        const select = getByRole('combobox') as HTMLSelectElement;
        expect(select.value).toBe('always');
    });

    it('calls setCookie with the selected value on change', () => {
        const { getByRole } = render(<CircleOfFifthsSelector />);
        const select = getByRole('combobox');
        fireEvent.change(select, { target: { value: 'never' } });
        expect(mockSetCookie).toHaveBeenCalledWith('circleOfFifths', 'never', { path: '/', maxAge: 31536000 });
    });

    it('calls setCookie with "always" when that option is selected', () => {
        const { getByRole } = render(<CircleOfFifthsSelector />);
        const select = getByRole('combobox');
        fireEvent.change(select, { target: { value: 'always' } });
        expect(mockSetCookie).toHaveBeenCalledWith('circleOfFifths', 'always', { path: '/', maxAge: 31536000 });
    });
});
