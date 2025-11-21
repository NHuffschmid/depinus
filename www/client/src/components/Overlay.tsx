import React, { useState } from 'react';
import useDepinusWebSocket from '../custom-hooks/useDepinusWebsocket';
import { backendUrl } from '../config';

const Overlay: React.FC = () => {
    const [composerImageUrl, setComposerImageUrl] = useState<string>('');
    const [isPauseable, setIsPauseable] = useState<boolean>(false);

    useDepinusWebSocket({
        name: 'Overlay',
        onInfoMessage: (message: any) => {
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
                position: 'fixed',
                left: 0,
                top: 0,
                width: '100vw',
                height: '100vh',
                backgroundPosition: 'center',
                backgroundSize: 'auto 100%',
                backgroundRepeat: 'no-repeat',
                zIndex: 0,
                opacity: 0.2,
                pointerEvents: 'none',
                backgroundImage: isPauseable ? `url('${composerImageUrl}')` : undefined
            }}
        />
    )
}

export default Overlay;
