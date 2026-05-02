import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSetCookie = vi.fn();

vi.mock('react-i18next', () => ({
    useTranslation: vi.fn(() => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    })),
}));

vi.mock('react-cookie', () => ({
    useCookies: vi.fn(),
}));

import { useCookies } from 'react-cookie';
import KeyLabelToggle from '../../components/KeyLabelToggle';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KeyLabelToggle', () => {
    beforeEach(() => {
        mockSetCookie.mockClear();
    });

    it('renders the label', () => {
        vi.mocked(useCookies).mockReturnValue([{ keyLabels: 'false', color: '#DC143C' }, mockSetCookie, vi.fn()] as any);

        const { getByText } = render(<KeyLabelToggle />);
        expect(getByText('Key labels:')).toBeInTheDocument();
    });

    it('renders the switch', () => {
        vi.mocked(useCookies).mockReturnValue([{ keyLabels: 'false', color: '#DC143C' }, mockSetCookie, vi.fn()] as any);

        const { getByRole } = render(<KeyLabelToggle />);
        expect(getByRole('switch')).toBeInTheDocument();
    });

    it('sets keyLabels cookie to "true" when toggled on', () => {
        vi.mocked(useCookies).mockReturnValue([{ keyLabels: 'false', color: '#DC143C' }, mockSetCookie, vi.fn()] as any);

        const { getByRole } = render(<KeyLabelToggle />);
        fireEvent.click(getByRole('switch'));

        expect(mockSetCookie).toHaveBeenCalledWith('keyLabels', 'true', { path: '/' });
    });

    it('sets keyLabels cookie to "false" when toggled off', () => {
        vi.mocked(useCookies).mockReturnValue([{ keyLabels: 'true', color: '#DC143C' }, mockSetCookie, vi.fn()] as any);

        const { getByRole } = render(<KeyLabelToggle />);
        fireEvent.click(getByRole('switch'));

        expect(mockSetCookie).toHaveBeenCalledWith('keyLabels', 'false', { path: '/' });
    });
});
