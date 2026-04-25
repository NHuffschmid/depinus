import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DemoButton from '../../components/DemoButton';

describe('DemoButton', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('renders its children', () => {
        const { getByText } = render(<DemoButton>Demo</DemoButton>);
        expect(getByText('Demo')).toBeInTheDocument();
    });

    it('calls fetch with the play endpoint when clicked', () => {
        const { getByRole } = render(<DemoButton>Demo</DemoButton>);
        fireEvent.click(getByRole('button'));
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/play'),
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ compositionId: 0 }),
            })
        );
    });
});
