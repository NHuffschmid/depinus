import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useDepinusWebSocket from '../../custom-hooks/useDepinusWebsocket';
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

type RepeatMode = 'off' | 'playlist' | 'composition';

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
    stopPlaylist: () => void;
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
    const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
    const [shuffle, setShuffle] = useState<boolean>(false);
    const [repeat, setRepeat] = useState<RepeatMode>('off');
    const [playingCompositionId, setPlayingCompositionId] = useState<number | null>(null);
    const [forwardable, setForwardable] = useState<boolean>(false);
    const [backwardable, setBackwardable] = useState<boolean>(false);

    const playTrack = (track: Track) => {
        setPlayingCompositionId(track.compositionId);
        const body: any = { compositionId: track.compositionId };
        if (selectedPlaylist) {
            body.playlistId = selectedPlaylist.id;
        }
        fetch(backendUrl + '/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })
            .catch(error => {
                console.error('Error sending play request:', error);
            });
    };

    const stopPlaylist = () => {
        setPlayingCompositionId(null);
        setForwardable(false);
        setBackwardable(false);
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
                if (data.length > 0) setSelectedPlaylist(data[0]);
            });
    }, []);

    useDepinusWebSocket({
        name: 'Playlist',
        onInfoMessage: async (message: any) => {

            if (message.composition && typeof message.composition.playlistId === 'number') {
                const found = playlists.find(p => p.id === message.composition.playlistId);
                if (found) {
                    //console.log('Setting selected playlist to', found);
                    setSelectedPlaylist(found);
                    setPlayingCompositionId(message.composition.compositionId);
                }
            }
            else {
                if (!message.isStoppable) {
                    setPlayingCompositionId(null); // not on pause/resume
                }
            }

            if (playingCompositionId) { // playlist is active
                if ('isStoppable' in message) {
                    if (!message['isStoppable'] &&
                        message['isPlayable'] &&
                        !message['wasCancelled']) {
                        // piano daemon has finished playing a composition
                        // ==> play next item in playlist
                        await nextTrack();
                    }
                    else {
                        setForwardable(await evaluateNextTrack() !== null);
                        setBackwardable(await evaluatePreviousTrack() !== null);
                    }
                }
            }
        }
    });

    return (
        <PlaylistContext.Provider value={{
            playlists, setPlaylists, selectedPlaylist, setSelectedPlaylist,
            shuffle, setShuffle, repeat, setRepeat, playingCompositionId, playTrack,
            stopPlaylist, nextTrack, previousTrack, forwardable, backwardable
        }}>
            {children}
        </PlaylistContext.Provider>
    );
};
