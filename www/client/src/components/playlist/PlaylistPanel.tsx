import React from 'react';
import { useTranslation } from "react-i18next";
import PlaylistSelector from './PlaylistSelector';
import { usePlaylistContext } from './PlaylistContext';

const PlaylistPanel: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, setPlaylists } = usePlaylistContext();

    const handleAdd = () => {
        setPlaylists([...playlists, 'New Playlist']);
    };

    const handleDelete = () => {
        if (playlists.length > 0) {
            setPlaylists(playlists.slice(0, -1));
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
            <PlaylistSelector playlists={playlists} />
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
