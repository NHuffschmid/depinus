import React from 'react';
import { render, act } from '@testing-library/react';
import { vi } from 'vitest';
import SettingsSlider from '../../components/SettingsSlider';

vi.mock('../../custom-hooks/useDepinusWebsocket', () => ({
    default: vi.fn().mockReturnValue({
        sendSettingsCommand: vi.fn(),
    }),
}));

import useDepinusWebSocket from '../../custom-hooks/useDepinusWebsocket';

describe('SettingsSlider', () => {
    const defaultProps = {
        title: 'Volume',
        min: 0,
        max: 100,
        defaultValue: 50,
        websocketCommand: 'volume',
    };

    it('renders the title', () => {
        const { getByText } = render(<SettingsSlider {...defaultProps} />);
        expect(getByText('Volume:')).toBeInTheDocument();
    });

    it('renders optional left and right descriptions', () => {
        const { getByText } = render(
            <SettingsSlider
                {...defaultProps}
                descriptionLeft={<span>Min</span>}
                descriptionRight={<span>Max</span>}
            />
        );
        expect(getByText('Min')).toBeInTheDocument();
        expect(getByText('Max')).toBeInTheDocument();
    });

    it('updates slider value from incoming WebSocket settings message', () => {
        const mockUseDepinusWebSocket = vi.mocked(useDepinusWebSocket);
        let capturedOnInfoMessage: ((msg: any) => void) | undefined;

        mockUseDepinusWebSocket.mockImplementation((opts: any) => {
            capturedOnInfoMessage = opts.onInfoMessage;
            return { sendSettingsCommand: vi.fn() };
        });

        const { getByRole } = render(<SettingsSlider {...defaultProps} />);

        act(() => {
            capturedOnInfoMessage?.({ infoType: 'settings', volume: 75 });
        });

        const slider = getByRole('slider');
        expect(slider).toHaveAttribute('aria-valuenow', '75');
    });
});
