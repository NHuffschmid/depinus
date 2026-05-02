import React from 'react';
import { render } from '@testing-library/react';
import Dialog from '../../components/Dialog';

describe('Dialog', () => {
    it('renders header, content and buttons when open', () => {
        const { getByText } = render(
            <Dialog
                open={true}
                header={<span>My Header</span>}
                content={<span>My Content</span>}
                buttons={<button>OK</button>}
            />
        );
        expect(getByText('My Header')).toBeInTheDocument();
        expect(getByText('My Content')).toBeInTheDocument();
        expect(getByText('OK')).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
        const { queryByText } = render(
            <Dialog
                open={false}
                content={<span>Hidden Content</span>}
            />
        );
        expect(queryByText('Hidden Content')).not.toBeInTheDocument();
    });

    it('renders without any optional props', () => {
        expect(() => render(<Dialog open={true} />)).not.toThrow();
    });
});
