import React, { useRef } from 'react';
import { useTranslation } from "react-i18next";
import PlaylistSelector, { PlaylistSelectorRef } from './PlaylistSelector';

const initialPlaylists = [
    'Classical Favorites',
    'Jazz Essentials',
    'Rock Hits',
    'Chill Vibes'
];

const PlaylistPanel: React.FC = () => {
    const { t } = useTranslation();
    const selectorRef = useRef<PlaylistSelectorRef>(null);

    const handleAdd = () => {
        const current = selectorRef.current?.getPlaylist() || [];
        selectorRef.current?.setPlaylist([...current, 'New Playlist']);
    };

    const handleDelete = () => {
        const current = selectorRef.current?.getPlaylist() || [];
        if (current.length > 0) {
            selectorRef.current?.setPlaylist(current.slice(0, -1));
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.3rem',
            backgroundColor: 'gray',
            padding: '0.2rem'
        }}>
            <PlaylistSelector ref={selectorRef} playlists={initialPlaylists} />
            <button
                title={t('Create new playlist') ?? ''}
                onClick={handleAdd} style={{ marginLeft: '1rem' }}>
                +
            </button>
            <button
                onClick={handleDelete}>
                {t('Delete') ?? ''}
            </button>
        </div>
    );
};

export default PlaylistPanel;
