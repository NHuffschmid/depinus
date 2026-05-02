import React from 'react';
import { render } from '@testing-library/react';
import { CookiesProvider } from 'react-cookie';
import WaitingIndicator from '../../components/WaitingIndicator';

const renderWithCookies = (ui: React.ReactElement) =>
    render(<CookiesProvider>{ui}</CookiesProvider>);

describe('WaitingIndicator', () => {
    it('renders without crashing', () => {
        expect(() => renderWithCookies(<WaitingIndicator />)).not.toThrow();
    });

    it('accepts width and height props without crashing', () => {
        expect(() =>
            renderWithCookies(<WaitingIndicator width="100px" height="50px" />)
        ).not.toThrow();
    });
});
