import React, { useEffect, useState } from 'react';
import { usePlaylistContext } from './PlaylistContext';
import { backendUrl } from '../../config';

const PlaylistContent: React.FC = () => {
    const { playlists, selected } = usePlaylistContext();
    const selectedPlaylist = playlists.find(pl => pl.id === selected);
    const [compositionCount, setCompositionCount] = useState<number | null>(null);

    useEffect(() => {
        if (selectedPlaylist) {
            fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`)
                .then(res => res.ok ? res.json() : Promise.reject(res))
                .then((compositions: any[]) => setCompositionCount(compositions.length))
                .catch(() => setCompositionCount(null));
        } else {
            setCompositionCount(null);
        }
    }, [selectedPlaylist]);

    return (
        <div style={{ marginTop: '1rem' }}>
            {selectedPlaylist ? (
                <>
                    <h2>{selectedPlaylist.name}</h2>
                    <div>
                        {compositionCount !== null
                            ? `${compositionCount} Track${compositionCount === 1 ? '' : 's'}`
                            : 'Loading...'}
                    </div>
                </>
            ) : (
                <span>No playlist selected</span>
            )}
        </div>
    );
};

export default PlaylistContent;
