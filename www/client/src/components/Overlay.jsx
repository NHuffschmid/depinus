import React from 'react';
import { useState } from "react";
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { backendUrl } from '../config';

export default function Overlay() {

    const [composerImageUrl, setComposerImageUrl] = useState('');
    const [isPauseable, setIsPauseable] = useState(false);

    useDepinusWebSocket({
        name: 'Overlay',
        onInfoMessage: (message) => {
            if ('composition' in message) {
                setComposerImageUrl(backendUrl +
                    "/archive/composerImage?composerName=" + message['composition']['composerName']);
            }
            if ('isPauseable' in message) {
                setIsPauseable(message['isPauseable']);
            }
        }
    });

    return (
        <div
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                backgroundPosition: 'center',
                backgroundSize: 'auto 100%',
                backgroundRepeat: 'no-repeat',
                zIndex: -1,
                opacity: 0.2,
                backgroundImage: isPauseable ? `url('${composerImageUrl}')` : null
            }}
        />
    )
}
