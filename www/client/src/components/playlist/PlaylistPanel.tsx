
import React from 'react';
import { useTranslation } from "react-i18next";
import { usePlaylistContext } from './PlaylistContext';

const PlaylistPanel: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, setPlaylists, selected, setSelected } = usePlaylistContext();

    const handleAdd = () => {
        const newName = `New Playlist ${playlists.length + 1}`;
        setPlaylists([...playlists, newName]);
        setSelected(newName);
    };

    const handleDelete = () => {
        if (playlists.length > 0) {
            const idx = playlists.indexOf(selected);
            const newPlaylists = playlists.filter(pl => pl !== selected);
            setPlaylists(newPlaylists);
            if (newPlaylists.length > 0) {
                setSelected(newPlaylists[Math.max(0, idx - (idx === newPlaylists.length ? 1 : 0))]);
            } else {
                setSelected('');
            }
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
            <div>
                <select
                    id="playlist-combobox"
                    style={{ fontSize: '1.2rem' }}
                    value={selected}
                    onChange={e => setSelected(e.target.value)}
                >
                    {playlists.map((pl, idx) => (
                        <option key={idx} value={pl}>{pl}</option>
                    ))}
                </select>
            </div>
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
