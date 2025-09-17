
import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { usePlaylistContext } from './PlaylistContext';
import CreatePlaylistDialog from './CreatePlaylistDialog';
import { MessageDialog } from '../MessageBox';
import { backendUrl } from '../../config';

const PlaylistPanel: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, setPlaylists, selected, setSelected } = usePlaylistContext();
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createDialogHeader, setCreateDialogHeader] = useState<string | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const handleAdd = () => {
        setCreateDialogHeader(t('Create new playlist') ?? undefined);
        setCreateDialogOpen(true);
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

    const createPlaylist = (name: string) => {
        return new Promise<void>((resolve, reject) => {
            if (playlists.includes(name)) {
                reject(new Error(t('Playlist already exists') || 'Playlist already exists'));
                return;
            }
            fetch(backendUrl + '/playlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name })
            })
                .then(response => {
                    if (response.status === 200) {
                        setPlaylists([...playlists, name]);
                        setSelected(name);
                        resolve();
                    } else {
                        response.json().then(data => {
                            reject(new Error(data.message));
                        });
                    }
                })
                .catch(error => {
                    reject(error);
                });
        });
    };

    const createDialogFinished = (error?: any) => {
        setCreateDialogOpen(false);
        if (error) {
            setErrorMessage(error.toString());
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
            <CreatePlaylistDialog
                open={createDialogOpen}
                header={createDialogHeader}
                createPlaylist={createPlaylist}
                finished={createDialogFinished}
            />
            <MessageDialog
                open={errorMessage !== undefined}
                setMessage={setErrorMessage}
                header={t('UploadFailed')}
                message={errorMessage}
            />
        </div>
    );
};

export default PlaylistPanel;
