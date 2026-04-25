import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import NavButton from '../../components/NavButton';

describe('NavButton', () => {
    it('renders children', () => {
        const { getByText } = render(<NavButton>Play</NavButton>);
        expect(getByText('Play')).toBeInTheDocument();
    });

    it('applies position style based on angle and radius', () => {
        const angle = 0;
        const radius = 1;
        const { getByRole } = render(<NavButton angle={angle} radius={radius}>X</NavButton>);
        const button = getByRole('button');
        const expectedLeft = (Math.cos(angle) * radius * 35.0 + 35).toString() + '%';
        const expectedTop = (Math.sin(angle) * radius * 40.0 + 50).toString() + '%';
        expect(button).toHaveStyle({ left: expectedLeft, top: expectedTop });
    });

    it('uses default angle=0 and radius=1 when props are omitted', () => {
        const { getByRole } = render(<NavButton>X</NavButton>);
        const button = getByRole('button');
        // cos(0)*1*35+35 = 70%, sin(0)*1*40+50 = 50%
        expect(button).toHaveStyle({ left: '70%', top: '50%' });
    });

    it('calls action when clicked', () => {
        const action = vi.fn();
        const { getByRole } = render(<NavButton action={action}>Click</NavButton>);
        fireEvent.click(getByRole('button'));
        expect(action).toHaveBeenCalledOnce();
    });

    it('does not throw when no action is provided', () => {
        const { getByRole } = render(<NavButton>X</NavButton>);
        expect(() => fireEvent.click(getByRole('button'))).not.toThrow();
    });
});
