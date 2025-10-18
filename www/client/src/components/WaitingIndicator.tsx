import React from 'react';
import { useCookies } from 'react-cookie';
import { ThreeDots } from 'react-loader-spinner';

interface WaitingIndicatorProps {
    width?: string;
    height?: string;
}

const WaitingIndicator: React.FC<WaitingIndicatorProps> = (props) => {
    const [cookies] = useCookies(['color']);
    return (
        <React.Fragment>
            <ThreeDots
                width={props.width}
                height={props.height}
                color={cookies.color} />
        </React.Fragment>
    );
}

export default WaitingIndicator;
