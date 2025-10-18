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
                backgroundImage: isPauseable ? `url('${composerImageUrl}')` : undefined
            }}
        />
    )
}

export default Overlay;
