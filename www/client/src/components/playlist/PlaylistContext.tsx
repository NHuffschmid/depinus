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
    selectedPosition: number | null;
    setSelectedPosition: (selected: number | null) => void;
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
    const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
    const [shuffle, setShuffle] = useState<boolean>(false);
    const [repeat, setRepeat] = useState<RepeatMode>('off');
    const [playingCompositionId, setPlayingCompositionId] = useState<number | null>(null);
    const [forwardable, setForwardable] = useState<boolean>(false);
    const [backwardable, setBackwardable] = useState<boolean>(false);

    const playTrack = (track: Track) => {
        //console.log(`Playing composition with ID ${compositionId} (position: ${selectedPosition})`);
        setPlayingCompositionId(track.compositionId);
        fetch(backendUrl + '/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                compositionId: track.compositionId
            })
        })
            .catch(error => {
                console.error('Error sending play request:', error);
            });
    };

    const stopPlaylist = () => {
        setPlayingCompositionId(null);
    };

    const evaluateNextTrack = async (): Promise<Track | null> => {
        if (!selectedPlaylist || playingCompositionId == null) {
            return null;
        }
        const response = await fetch(`${backendUrl}/playlist/${selectedPlaylist.id}/compositions`, {
            headers: { 'Accept': 'application/json' }
        });
        const tracks: Track[] = await response.json();
        const idx = tracks.findIndex(t => t.compositionId === playingCompositionId);
        if (idx === -1) {
            return null;
        }
        if (idx + 1 < tracks.length) {
            return tracks[idx + 1];
        } else {
            return null;
        }
    };

    const nextTrack = async (): Promise<void> => {
        const track = await evaluateNextTrack();
        if (track) {
            console.log("Next track: " + track.compositionName);
            playTrack(track);
        } else {
            stopPlaylist();
        }
    };

    const previousTrack = async (): Promise<void> => {
        // TODO: implement previous track functionality
        await nextTrack(); // for test only
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
            console.log('Info message: ' + JSON.stringify(message));
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
                        //setBackwardable(await evaluatePreviousTrack() !== null);
                    }
                }
            }
        }
    });

    return (
        <PlaylistContext.Provider value={{
            playlists, setPlaylists, selectedPlaylist, setSelectedPlaylist,
            selectedPosition, setSelectedPosition, shuffle, setShuffle, repeat,
            setRepeat, playingCompositionId, playTrack,
            stopPlaylist, nextTrack, previousTrack, forwardable, backwardable
        }}>
            {children}
        </PlaylistContext.Provider>
    );
};
