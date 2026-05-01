import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
    useTranslation: vi.fn(() => ({
        t: (key: string) => key,
        i18n: { language: 'en' },
    })),
}));

vi.mock('../../components/archive/ExportArchiveDialog', () => ({
    default: ({ open }: { open: boolean }) =>
        open ? <div data-testid="export-dialog" /> : null,
}));

vi.mock('../../components/archive/ImportArchiveDialog', () => ({
    default: ({ open }: { open: boolean }) =>
        open ? <div data-testid="import-dialog" /> : null,
}));

vi.mock('../../components/react-piano-keyboard/src', () => ({
    IVORY_REALISTIC_CLASS: 'ivory',
    EBONY_REALISTIC_CLASS: 'ebony',
}));

import HomeNav from '../../components/HomeNav';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('HomeNav', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders a nav element with all four keys', () => {
        const { getByRole, getByText } = render(<HomeNav />);
        expect(getByRole('navigation')).toBeInTheDocument();
        expect(getByText('Demo')).toBeInTheDocument();
        expect(getByRole('button', { name: /shutdown/i })).toBeInTheDocument();
        expect(getByText('Export archive')).toBeInTheDocument();
        expect(getByText('Import archive')).toBeInTheDocument();
    });

    it('calls fetch with the play endpoint when Demo is clicked', () => {
        const { getByText } = render(<HomeNav />);
        fireEvent.click(getByText('Demo').closest('button')!);
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/play'),
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('opens the shutdown confirmation dialog when Shutdown is clicked', () => {
        const { getByRole, queryByText } = render(<HomeNav />);
        expect(queryByText('Are you sure?')).not.toBeInTheDocument();
        fireEvent.click(getByRole('button', { name: /shutdown/i }));
        expect(queryByText('Are you sure?')).toBeInTheDocument();
    });

    it('does not call fetch for shutdown when confirmation is cancelled', async () => {
        const { getByRole, getAllByText } = render(<HomeNav />);
        fireEvent.click(getByRole('button', { name: /shutdown/i }));
        // Click the cancel/no button in the confirmation dialog
        const noButtons = getAllByText('No');
        fireEvent.click(noButtons[0]);
        await waitFor(() => {
            expect(fetch).not.toHaveBeenCalled();
        });
    });

    it('calls fetch with the shutdown endpoint when confirmation is accepted', async () => {
        const { getByRole, getAllByText } = render(<HomeNav />);
        fireEvent.click(getByRole('button', { name: /shutdown/i }));
        const yesButtons = getAllByText('Yes');
        fireEvent.click(yesButtons[0]);
        await waitFor(() =>
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/shutdown'),
                expect.objectContaining({ method: 'POST' })
            )
        );
    });

    it('opens the export dialog when Export archive is clicked', () => {
        const { getByText, queryByTestId } = render(<HomeNav />);
        expect(queryByTestId('export-dialog')).not.toBeInTheDocument();
        fireEvent.click(getByText('Export archive').closest('button')!);
        expect(queryByTestId('export-dialog')).toBeInTheDocument();
    });

    it('opens the import dialog when Import archive is clicked', () => {
        const { getByText, queryByTestId } = render(<HomeNav />);
        expect(queryByTestId('import-dialog')).not.toBeInTheDocument();
        fireEvent.click(getByText('Import archive').closest('button')!);
        expect(queryByTestId('import-dialog')).toBeInTheDocument();
    });
});
