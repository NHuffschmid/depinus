import React, { useState } from 'react';
import useDepinusWebSocket, { DepinusInfoMessage } from '../custom-hooks/useDepinusWebsocket';
import { backendUrl } from '../config';

const Overlay: React.FC = () => {
    const [composerImageUrl, setComposerImageUrl] = useState<string>('');
    const [isPauseable, setIsPauseable] = useState<boolean>(false);

    useDepinusWebSocket({
        name: 'Overlay',
        onInfoMessage: (message: DepinusInfoMessage) => {
            if (message.infoType === 'playState') {
                if (message.composition) {
                    setComposerImageUrl(backendUrl +
                        "/archive/composerImage?composerName=" + message.composition.composerName);
                }
                if (message.isPauseable !== undefined) {
                    setIsPauseable(message.isPauseable);
                }
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
