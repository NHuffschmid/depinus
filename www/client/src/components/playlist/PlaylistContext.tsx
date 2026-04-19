import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useDepinusWebSocket, { DepinusInfoMessage, RepeatMode } from '../../custom-hooks/useDepinusWebsocket';
import { backendUrl } from '../../config';

export interface Playlist {
    id: number;
    name: string;
}

export interface Track {
    playlistId: number;
    compositionId: number;
    position: number
    compositionName: string;
    composerFirstname: string;
    composerSurname: string;
}

interface PlaylistContextType {
    playlists: Playlist[];
    setPlaylists: (playlists: Playlist[]) => void;
    selectedPlaylist: Playlist | null;
    setSelectedPlaylist: (selectedPlaylist: Playlist | null) => void;
    shuffle: boolean;
    setShuffle: (shuffle: boolean) => void;
    repeat: RepeatMode;
    setRepeat: (repeat: RepeatMode) => void;
    playingCompositionId: number | null;
    playTrack: (track: Track) => void;
    nextTrack: () => Promise<void>;
    previousTrack: () => Promise<void>;
    forwardable: boolean;
    backwardable: boolean;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylistContext = () => {
    const context = useContext(PlaylistContext);
    if (!context) {
        throw new Error('usePlaylistContext must be used within a PlaylistProvider');
    }
    return context;
};

export const PlaylistProvider = ({ children }: { children: ReactNode }) => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylist, _setSelectedPlaylist] = useState<Playlist | null>(null);
    const [shuffle, _setShuffle] = useState<boolean>(false);
    const [repeat, _setRepeat] = useState<RepeatMode>('off');
    const [playingCompositionId, setPlayingCompositionId] = useState<number | null>(null);
    const [forwardable, _setForwardable] = useState<boolean>(false);
    const [backwardable, _setBackwardable] = useState<boolean>(false);

    function setState<T>(
        setState: React.Dispatch<React.SetStateAction<T>>,
        sendCommand: (value: T) => void
    ) {
        return (value: T) => {
            setState(prev => {
                if (prev !== value) {
                    sendCommand(value);
                }
                return value;
            });
        };
    }

    const setSelectedPlaylist = setState(_setSelectedPlaylist, (value) => {
        if (value !== null) {
            webSocket.sendPlaylistCommand({ id: value.id });
        }
    });

    const setShuffle = setState(_setShuffle, (value) => {
        webSocket.sendPlaylistCommand({ shuffle: value });
    });

    const setRepeat = setState(_setRepeat, (value) => {
        webSocket.sendPlaylistCommand({ repeatMode: value });
    });

    const setForwardable = setState(_setForwardable, (value) => {
        webSocket.sendPlaylistCommand({ forwardable: value });
    });

    const setBackwardable = setState(_setBackwardable, (value) => {
        webSocket.sendPlaylistCommand({ backwardable: value });
    });

    const playTrack = (track: Track) => {
        setPlayingCompositionId(track.compositionId);
        const body: any = { compositionId: track.compositionId };
        fetch(backendUrl + '/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
            .catch(error => {
                console.error('Error sending play request:', error);
            });

        webSocket.sendPlaylistCommand({
            id: track.playlistId
        });
    };

    const stopPlaylist = () => {
        webSocket.sendStopCommand();
    };

    const fetchTracks = async (): Promise<Track[]> => {
        if (!selectedPlaylist) return [];
        const response = await fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`, {
            headers: { 'Accept': 'application/json' }
        });
        return await response.json();
    };

    const getCurrentTrackIndex = (tracks: Track[], compositionId: number | null): number => {
        return tracks.findIndex(t => t.compositionId === compositionId);
    };

    const getNextIndex = (idx: number, tracks: Track[]): number | null => {
        if (idx === -1 || tracks.length === 0) return null;
        if (idx + 1 < tracks.length) return idx + 1;
        return null;
    };

    const getPreviousIndex = (idx: number, tracks: Track[]): number | null => {
        if (idx === -1 || tracks.length === 0) return null;
        if (idx - 1 >= 0) return idx - 1;
        return null;
    };

    const evaluateNextTrack = async (): Promise<Track | null> => {
        if (!selectedPlaylist || playingCompositionId === null) {
            return null;
        }
        const tracks = await fetchTracks();
        const idx = getCurrentTrackIndex(tracks, playingCompositionId);
        if (idx === -1 || tracks.length === 0) {
            return null;
        }
        if (repeat === 'composition') {
            return tracks[idx];
        }
        if (shuffle) {
            const otherTracks = tracks.filter((_, i) => i !== idx);
            if (otherTracks.length === 0) return null;
            const randomIdx = Math.floor(Math.random() * otherTracks.length);
            return otherTracks[randomIdx];
        }
        const nextIdx = getNextIndex(idx, tracks);
        if (nextIdx !== null) {
            return tracks[nextIdx];
        } else if (repeat === 'playlist') {
            return tracks[0];
        } else {
            return null;
        }
    };

    const evaluatePreviousTrack = async (): Promise<Track | null> => {
        if (!selectedPlaylist || playingCompositionId == null) {
            return null;
        }
        const tracks = await fetchTracks();
        const idx = getCurrentTrackIndex(tracks, playingCompositionId);
        if (idx === -1 || tracks.length === 0) {
            return null;
        }
        if (repeat === 'composition') {
            return tracks[idx];
        }
        if (shuffle) {
            const otherTracks = tracks.filter((_, i) => i !== idx);
            if (otherTracks.length === 0) return null;
            const randomIdx = Math.floor(Math.random() * otherTracks.length);
            return otherTracks[randomIdx];
        }
        const prevIdx = getPreviousIndex(idx, tracks);
        if (prevIdx !== null) {
            return tracks[prevIdx];
        } else if (repeat === 'playlist') {
            return tracks[tracks.length - 1];
        } else {
            return null;
        }
    };

    const nextTrack = async (): Promise<void> => {
        const track = await evaluateNextTrack();
        if (track) {
            playTrack(track);
        } else {
            stopPlaylist();
        }
    };

    const previousTrack = async (): Promise<void> => {
        const track = await evaluatePreviousTrack();
        if (track) {
            playTrack(track);
        } else {
            stopPlaylist();
        }
    };

    useEffect(() => {
        fetch(backendUrl + '/playlist')
            .then((response) => response.json())
            .then((data) => {
                setPlaylists(data);
                if (selectedPlaylist === null) {
                    // request to get current playlist from server (if any)
                    // (in case another client has already set a playlist)
                    webSocket.sendPlaylistCommand({ id: 0 });
                }
            });
    }, []);

    const webSocket = useDepinusWebSocket({
        name: 'Playlist',
        onInfoMessage: async (message: DepinusInfoMessage) => {
            if (message.infoType === 'playlist') {
                //console.log('Playlist info message received:', message.playlist);
                if (message.playlist.id) {
                    const found = playlists.find(p => p.id === message.playlist.id);
                    if (found) {
                        setSelectedPlaylist(found);
                    }
                }
                if (typeof message.playlist.shuffle === 'boolean') {
                    setShuffle(message.playlist.shuffle);
                }
                if (typeof message.playlist.repeatMode === 'string') {
                    setRepeat(message.playlist.repeatMode);
                }
                if (typeof message.playlist.forwardable === 'boolean') {
                    setForwardable(message.playlist.forwardable);
                }
                if (typeof message.playlist.backwardable === 'boolean') {
                    setBackwardable(message.playlist.backwardable);
                }
                if (typeof message.playlist.compositionId === 'number') {
                    setPlayingCompositionId(message.playlist.compositionId);
                }
            } else if (message.infoType === 'playState') {
                if (!message.composition &&
                    !message.isStoppable &&
                    (message.isPlayable !== message.isPauseable)) {
                    setPlayingCompositionId(null); // terminate playlist on STOP (not on pause/resume)
                    setForwardable(false);
                    setBackwardable(false);
                    return;
                }

                if (message.composition?.compositionId) {
                    setPlayingCompositionId(message.composition.compositionId);
                }

                if (playingCompositionId) { // playlist is active
                    if (message.isStoppable !== undefined && !message.wasCancelled) {
                        if (!message.isStoppable && message.isPlayable) {
                            // piano daemon has finished playing a composition
                            // ==> play next item in playlist
                            await nextTrack();
                        } else {
                            setForwardable(await evaluateNextTrack() !== null);
                            setBackwardable(await evaluatePreviousTrack() !== null);
                        }
                    }
                }
            }
        }
    });

    return (
        <PlaylistContext.Provider value={{
            playlists, setPlaylists, selectedPlaylist, setSelectedPlaylist,
            shuffle, setShuffle, repeat, setRepeat, playingCompositionId, playTrack,
            nextTrack, previousTrack, forwardable, backwardable
        }}>
            {children}
        </PlaylistContext.Provider>
    );
};
