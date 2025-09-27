
import React, { useState } from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import RepeatIcon from '@mui/icons-material/Repeat';
import RepeatOneIcon from '@mui/icons-material/RepeatOne';
import PlaylistDialog from './PlaylistDialog';
import { MessageDialog, ConfirmationDialog } from '../MessageBox';
import { backendUrl } from '../../config';
import { useTranslation } from "react-i18next";
import { usePlaylistContext } from './PlaylistContext';
import { useCookies } from 'react-cookie';

const PlaylistPanel: React.FC = () => {
    const { t } = useTranslation();
    const { playlists, setPlaylists, selectedPlaylist, setSelectedPlaylist, shuffle, setShuffle, repeat, setRepeat, playingCompositionId } = usePlaylistContext();
    const [cookies] = useCookies(['color']);
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
        setPlaylistName(selectedPlaylist ? playlists.find(pl => pl.id === selectedPlaylist.id)?.name : undefined);
        setPlaylistDialogOpen(true);
    };

    const showDeleteConfirmationDialog = () => {
        setConfirmationMessage(t('Delete playlist permanently?')?.toString() ?? '');
    };

    const deleteConfirmed = (result: boolean) => {
        setConfirmationMessage(undefined);
        if (result == true && selectedPlaylist) {
            fetch(backendUrl + '/playlist/' + selectedPlaylist.id, {
                method: 'DELETE'
            })
                .then(response => {
                    if (response.status === 204) {
                        const idx = playlists.findIndex(pl => pl.id === selectedPlaylist.id);
                        const newPlaylists = playlists.filter(pl => pl.id !== selectedPlaylist.id);
                        setPlaylists(newPlaylists);
                        if (newPlaylists.length > 0) {
                            setSelectedPlaylist(newPlaylists[Math.max(0, idx - (idx === newPlaylists.length ? 1 : 0))]);
                        } else {
                            setSelectedPlaylist(null);
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
                            setSelectedPlaylist(data);
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
            if (!selectedPlaylist) {
                reject(new Error(t('No playlist selected') || 'No playlist selected'));
                return;
            }
            fetch(backendUrl + '/playlist/' + selectedPlaylist.id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name })
            })
                .then(response => {
                    if (response.status === 200) {
                        response.json().then((data: { id: number, name: string }) => {
                            setPlaylists(playlists.map(pl => pl.id === selectedPlaylist.id ? { ...pl, name: data.name } : pl));
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
            padding: '0.2rem',
            justifyContent: 'space-between'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <select
                    id="playlist-combobox"
                    style={{
                        fontSize: '1.2rem',
                        minWidth: '12rem',
                        color: playingCompositionId ? '#fff' : undefined,
                        backgroundColor: playingCompositionId ? cookies.color : undefined
                    }}
                    value={selectedPlaylist ? selectedPlaylist.id : ''}
                    onChange={e => setSelectedPlaylist(playlists.find(pl => pl.id === Number(e.target.value)) ?? null)}
                    disabled={playingCompositionId !== null}
                >
                    {playlists.map((pl) => (
                        <option key={pl.id} value={pl.id}>{pl.name}</option>
                    ))}
                </select>
                {playlists.length > 0 && selectedPlaylist && (
                    <button
                        style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem 0.5rem' }}
                        onClick={handleRename}
                        title={t('Rename playlist') ?? ''}
                        disabled={playingCompositionId !== null}
                    >
                        <EditIcon fontSize="small" />
                    </button>
                )}
                <button
                    title={t('Create new playlist') ?? ''}
                    onClick={handleAdd}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem 0.5rem' }}
                    disabled={playingCompositionId !== null}
                >
                    <AddIcon fontSize="small" />
                </button>
                {playlists.length > 0 && selectedPlaylist && (
                    <button
                        onClick={showDeleteConfirmationDialog}
                        title={t('Delete playlist') ?? ''}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.2rem 0.5rem' }}
                        disabled={playingCompositionId !== null}
                    >
                        <DeleteIcon fontSize="small" />
                    </button>
                )}
            </div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginLeft: 'auto'
            }}>
                <button
                    title={t('Shuffle')?.toString() ?? ''}
                    onClick={() => setShuffle(!shuffle)}
                    style={{
                        background: shuffle ? cookies.color : '#e0e0e0',
                        border: 'none',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: shuffle ? '#fff' : undefined
                    }}
                >
                    <ShuffleIcon style={{ color: shuffle ? '#fff' : undefined }} />
                </button>
                <button
                    title={t('Repeat') ?? ''}
                    onClick={() => setRepeat(repeat === 'off' ? 'playlist' : repeat === 'playlist' ? 'composition' : 'off')}
                    style={{
                        background: repeat !== 'off' ? cookies.color : '#e0e0e0',
                        border: 'none',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: repeat !== 'off' ? '#fff' : undefined
                    }}
                >
                    {repeat === 'composition'
                        ? <RepeatOneIcon style={{ color: '#fff' }} />
                        : <RepeatIcon style={{ color: repeat !== 'off' ? '#fff' : undefined }} />}
                </button>
            </div>
            <ConfirmationDialog
                open={confirmationMessage !== undefined}
                setMessage={setConfirmationMessage}
                header={selectedPlaylist?.name}
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
