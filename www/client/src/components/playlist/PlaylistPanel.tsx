
import React, { useState } from 'react';
import { useTranslation } from "react-i18next";
import { usePlaylistContext, Playlist } from './PlaylistContext';
import PlaylistDialog from './PlaylistDialog';
import { MessageDialog, ConfirmationDialog } from '../MessageBox';
import { backendUrl } from '../../config';

const PlaylistPanel: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, setPlaylists, selected, setSelected } = usePlaylistContext();
    const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
    const [playlistDialogHeader, setPlaylistDialogHeader] = useState<string | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
    const [confirmationMessage, setConfirmationMessage] = useState<string | undefined>(undefined);
    const [action, setAction] = useState<((name: string) => Promise<void>) | undefined>(undefined);
    const [playlistName, setPlaylistName] = useState<string | undefined>(undefined);

    const handleAdd = () => {
        setPlaylistDialogHeader(t('Create new playlist') ?? undefined);
        setAction(() => createPlaylist);
        setPlaylistName(undefined);
        setPlaylistDialogOpen(true);
    };

    const handleRename = () => {
        setPlaylistDialogHeader(t('Rename playlist') ?? undefined);
        setAction(() => renamePlaylist);
        setPlaylistName(playlists.find(pl => pl.id === selected)?.name);
        setPlaylistDialogOpen(true);
    };

    const showDeleteConfirmationDialog = () => {
        setConfirmationMessage(t('Delete playlist permanently?')?.toString() ?? '');
    };

    const deleteConfirmed = (result: boolean) => {
        setConfirmationMessage(undefined);
        if (result == true) {
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

    const renamePlaylist = (name: string) => {
        return new Promise<void>((resolve, reject) => {
            if (playlists.some(pl => pl.name === name)) {
                reject(new Error(t('Playlist already exists') || 'Playlist already exists'));
                return;
            }
            fetch(backendUrl + '/playlist/' + selected, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name })
            })
                .then(response => {
                    if (response.status === 200) {
                        response.json().then((data: { id: number, name: string }) => {
                            setPlaylists(playlists.map(pl => pl.id === selected ? { ...pl, name: data.name } : pl));
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

    const playlistDialogFinished = (error?: any) => {
        setPlaylistDialogOpen(false);
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
                    style={{ fontSize: '1.2rem', minWidth: '12rem' }}
                    value={selected ?? ''}
                    onChange={e => setSelected(Number(e.target.value))}
                >
                    {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                    ))}
                </select>
            </div>
            {playlists.length > 0 && selected && (
                <button
                    style={{ marginLeft: '1rem' }}
                    onClick={handleRename}
                >
                    {t('Rename')}
                </button>
            )}
            <button
                title={t('Create new playlist') ?? ''}
                onClick={handleAdd}
            >
                +
            </button>
            {playlists.length > 0 && selected && (
                <button
                    onClick={showDeleteConfirmationDialog}
                >
                    {t('Delete') ?? ''}
                </button>
            )}
            <ConfirmationDialog
                open={confirmationMessage !== undefined}
                setMessage={setConfirmationMessage}
                header={(playlists.find(pl => pl.id === selected)?.name)}
                message={confirmationMessage}
                onConfirm={deleteConfirmed}
            />
            <PlaylistDialog
                open={playlistDialogOpen}
                header={playlistDialogHeader}
                name={playlistName}
                action={action ?? (async () => { })}
                finished={playlistDialogFinished}
            />
            <MessageDialog
                open={errorMessage !== undefined}
                setMessage={setErrorMessage}
                header={t('Playlist')}
                message={errorMessage}
            />
        </div>
    );
};

export default PlaylistPanel;
