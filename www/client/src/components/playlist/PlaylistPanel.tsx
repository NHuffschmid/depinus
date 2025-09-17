
import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { usePlaylistContext, Playlist } from './PlaylistContext';
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
        if (playlists.length > 0 && selected !== null) {
            fetch(backendUrl + '/playlist/' + selected, {
                method: 'DELETE'
            })
                .then(response => {
                    if (response.status === 204) {
                        const idx = playlists.findIndex(pl => pl.id === selected);
                        const newPlaylists = playlists.filter(pl => pl.id !== selected);
                        setPlaylists(newPlaylists);
                        if (newPlaylists.length > 0) {
                            setSelected(newPlaylists[Math.max(0, idx - (idx === newPlaylists.length ? 1 : 0))].id);
                        } else {
                            setSelected(null);
                        }
                    } else {
                        response.json().then(data => {
                            setErrorMessage(data.message);
                        });
                    }
                })
                .catch(error => {
                    setErrorMessage(error.toString());
                });
        }
    };

    const createPlaylist = (name: string) => {
        return new Promise<void>((resolve, reject) => {
            if (playlists.some(pl => pl.name === name)) {
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
                        response.json().then((data: { id: number, name: string }) => {
                            setPlaylists([...playlists, { id: data.id, name: data.name }]);
                            setSelected(data.id);
                            resolve();
                        });
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
                    value={selected ?? ''}
                    onChange={e => setSelected(Number(e.target.value))}
                >
                    {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
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
